import { create } from "zustand";
import type {
  AtomMessageData,
  KnowledgeSession,
  NavigationStackItem,
  ViewMode,
} from "@/types";

interface RecentSession {
  id: string;
  rootTopic: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount?: number;
}

interface SessionState {
  // 状态
  session: KnowledgeSession | null;
  viewMode: ViewMode;
  isLoading: boolean;
  error: string | null;
  recentSessions: RecentSession[];
  navigationStack: NavigationStackItem[];
  currentTopicId: string | null; // 当前活跃话题
  currentGalaxyId: string | null; // 当前所在星系（3D视图）
  galaxyHistory: string[];

  // Actions
  setSession: (session: KnowledgeSession) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearSession: () => void;

  // 会话管理
  loadRecentSessions: () => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;

  // 消息管理
  addMessage: (message: AtomMessageData) => void;
  updateMessage: (id: string, updates: Partial<AtomMessageData>) => void;

  // 话题管理
  createTopic: (title: string, parentId?: string) => Promise<void>;
  moveMessageToTopic: (messageId: string, topicId: string) => Promise<void>;

  // 导航
  enterChat: (topicId: string, title: string) => void;
  enterSubChat: (topicId: string, title: string) => void;
  goBack: () => void;
  returnToTree: () => void;

  // 3D视图导航
  enterGalaxy: (galaxyId: string) => void;
  exitGalaxy: () => void;

  // 视图切换
  setViewMode: (mode: ViewMode) => void;
}

// 辅助函数：构建消息树
function buildMessageTree(messages: AtomMessageData[]): AtomMessageData[] {
  const rootMessages = messages.filter((m) => m.parentId === null);
  return rootMessages.map((root) => buildNestedMessage(root, messages));
}

function buildNestedMessage(
  message: AtomMessageData,
  allMessages: AtomMessageData[]
): AtomMessageData {
  const children = allMessages.filter((m) => m.parentId === message.id);
  if (children.length === 0) {
    return message;
  }
  return {
    ...message,
    children: children
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      .map((child) => buildNestedMessage(child, allMessages)),
  } as AtomMessageData & { children: AtomMessageData[] };
}

export const useSessionStore = create<SessionState>((set, get) => ({
  // 初始状态
  session: null,
  viewMode: "chat",
  isLoading: false,
  error: null,
  recentSessions: [],
  navigationStack: [],
  currentTopicId: null,
  currentGalaxyId: null,
  galaxyHistory: [],

  // Actions
  setSession: (session) =>
    set({
      session,
      viewMode: "chat",
      navigationStack: [],
      currentTopicId: null,
      error: null,
    }),

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  clearSession: () =>
    set({
      session: null,
      viewMode: "chat",
      navigationStack: [],
      currentTopicId: null,
      currentGalaxyId: null,
      galaxyHistory: [],
      error: null,
    }),

  // 会话管理
  loadRecentSessions: async () => {
    try {
      const res = await fetch("/api/sessions");
      if (!res.ok) return;
      const data = await res.json();
      set({ recentSessions: data.sessions || [] });
    } catch {
      // 静默失败
    }
  },

  loadSession: async (sessionId: string) => {
    try {
      set({ isLoading: true });
      const res = await fetch(`/api/session?id=${sessionId}`);
      if (!res.ok) throw new Error("Failed to load session");

      const data = await res.json();
      const messages: AtomMessageData[] = (data.messages || []).map((m: any) => ({
        ...m,
        timestamp: new Date(m.timestamp),
        embedding: m.embedding ? JSON.parse(m.embedding) : null,
      }));

      const session: KnowledgeSession = {
        id: data.session.id,
        rootTopic: data.session.rootTopic,
        userId: data.session.userId,
        status: data.session.status,
        createdAt: new Date(data.session.createdAt),
        updatedAt: new Date(data.session.updatedAt),
        messages,
      };

      set({
        session,
        viewMode: "chat",
        navigationStack: [],
        currentTopicId: null,
        error: null,
        isLoading: false,
      });
    } catch (err) {
      console.error("Failed to load session:", err);
      set({ error: "加载会话失败", isLoading: false });
    }
  },

  // 消息管理
  addMessage: (message) =>
    set((state) => {
      if (!state.session) return state;
      return {
        session: {
          ...state.session,
          messages: [...state.session.messages, message],
          updatedAt: new Date(),
        },
      };
    }),

  updateMessage: (id, updates) =>
    set((state) => {
      if (!state.session) return state;
      const messages = state.session.messages.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      );
      return {
        session: {
          ...state.session,
          messages,
          updatedAt: new Date(),
        },
      };
    }),

  // 话题管理
  createTopic: async (title: string, parentId?: string) => {
    const state = get();
    if (!state.session) return;

    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: state.session.id,
          content: "",
          role: "topic",
          title,
          parentId: parentId || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const topic: AtomMessageData = {
          ...data.message,
          timestamp: new Date(data.message.timestamp),
        };
        set((state) => {
          if (!state.session) return state;
          return {
            session: {
              ...state.session,
              messages: [...state.session.messages, topic],
              updatedAt: new Date(),
            },
          };
        });
      }
    } catch (err) {
      console.error("Failed to create topic:", err);
    }
  },

  moveMessageToTopic: async (messageId: string, topicId: string) => {
    try {
      const res = await fetch(`/api/messages?id=${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId: topicId }),
      });

      if (res.ok) {
        set((state) => {
          if (!state.session) return state;
          const messages = state.session.messages.map((m) =>
            m.id === messageId ? { ...m, parentId: topicId } : m
          );
          return {
            session: {
              ...state.session,
              messages,
              updatedAt: new Date(),
            },
          };
        });
      }
    } catch (err) {
      console.error("Failed to move message:", err);
    }
  },

  // 导航
  enterChat: (topicId: string, title: string) =>
    set({
      viewMode: "chat",
      currentTopicId: topicId,
      navigationStack: [{ nodeId: topicId, title }],
    }),

  enterSubChat: (topicId: string, title: string) =>
    set((state) => ({
      currentTopicId: topicId,
      navigationStack: [...state.navigationStack, { nodeId: topicId, title }],
    })),

  goBack: () =>
    set((state) => {
      if (state.navigationStack.length <= 1) {
        return {
          viewMode: "tree",
          currentTopicId: null,
          navigationStack: [],
        };
      }
      const newStack = state.navigationStack.slice(0, -1);
      return {
        navigationStack: newStack,
        currentTopicId: newStack.at(-1)?.nodeId,
      };
    }),

  returnToTree: () =>
    set({
      viewMode: "tree",
      currentTopicId: null,
      navigationStack: [],
    }),

  // 3D视图导航
  enterGalaxy: (galaxyId: string) =>
    set((state) => ({
      galaxyHistory: [...state.galaxyHistory, state.currentGalaxyId || ""],
      currentGalaxyId: galaxyId,
    })),

  exitGalaxy: () =>
    set((state) => {
      const newHistory = [...state.galaxyHistory];
      const prevGalaxy = newHistory.pop() || null;
      return {
        galaxyHistory: newHistory,
        currentGalaxyId: prevGalaxy,
      };
    }),

  // 视图切换
  setViewMode: (mode) => set({ viewMode: mode }),
}));

// 导出辅助函数供外部使用
export { buildMessageTree };