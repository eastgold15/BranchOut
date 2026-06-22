import { create } from "zustand";
import type {
  AtomMessageData,
  KnowledgeSession,
  NavigationStackItem,
  TopicType,
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
  session: KnowledgeSession | null;
  viewMode: ViewMode;
  isLoading: boolean;
  error: string | null;
  recentSessions: RecentSession[];
  navigationStack: NavigationStackItem[];
  currentTopicId: string | null;
  currentGalaxyId: string | null;
  galaxyHistory: string[];

  setSession: (session: KnowledgeSession) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearSession: () => void;

  loadRecentSessions: () => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;

  addMessage: (message: AtomMessageData) => void;
  updateMessage: (id: string, updates: Partial<AtomMessageData>) => void;

  createTopic: (title: string, parentId?: string) => Promise<void>;
  moveMessageToTopic: (messageId: string, topicId: string) => Promise<void>;

  enterChat: (topicId: string, title: string) => void;
  enterSubChat: (topicId: string, title: string) => void;
  goBack: () => void;
  returnToTree: () => void;

  enterGalaxy: (galaxyId: string) => void;
  exitGalaxy: () => void;

  setViewMode: (mode: ViewMode) => void;

  // 新功能：拖拽排序
  reorderMessages: (parentId: string | null, messageIds: string[]) => Promise<void>;
  
  // 新功能：话题组合（3D视图中Ctrl+拖拽合并）
  mergeTopics: (sourceTopicId: string, targetTopicId: string) => Promise<void>;
  
  // 新功能：更新话题类型
  updateTopicType: (topicId: string, type: TopicType) => Promise<void>;
}

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
      .sort((a, b) => a.order - b.order)
      .map((child) => buildNestedMessage(child, allMessages)),
  } as AtomMessageData & { children: AtomMessageData[] };
}

export const useSessionStore = create<SessionState>((set, get) => ({
  session: null,
  viewMode: "chat",
  isLoading: false,
  error: null,
  recentSessions: [],
  navigationStack: [],
  currentTopicId: null,
  currentGalaxyId: null,
  galaxyHistory: [],

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
        order: m.order ?? 0,
        topicType: m.topicType ?? "normal",
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
          order: 0,
          topicType: "normal",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const topic: AtomMessageData = {
          ...data.message,
          timestamp: new Date(data.message.timestamp),
          order: data.message.order ?? 0,
          topicType: data.message.topicType ?? "normal",
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

  setViewMode: (mode) => set({ viewMode: mode }),

  // 拖拽排序：重新排序同一父节点下的消息
  reorderMessages: async (parentId: string | null, messageIds: string[]) => {
    try {
      const res = await fetch("/api/messages/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId, messageIds }),
      });

      if (res.ok) {
        set((state) => {
          if (!state.session) return state;
          const orderMap = new Map<string, number>();
          messageIds.forEach((id, index) => orderMap.set(id, index));

          const messages = state.session.messages.map((m) => {
            if (m.parentId === parentId && orderMap.has(m.id)) {
              return { ...m, order: orderMap.get(m.id)! };
            }
            return m;
          });

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
      console.error("Failed to reorder messages:", err);
    }
  },

  // 话题组合：将源话题合并到目标话题
  mergeTopics: async (sourceTopicId: string, targetTopicId: string) => {
    if (sourceTopicId === targetTopicId) return;

    try {
      const res = await fetch(`/api/messages/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceTopicId, targetTopicId }),
      });

      if (res.ok) {
        set((state) => {
          if (!state.session) return state;

          const sourceTopic = state.session.messages.find((m) => m.id === sourceTopicId);
          const targetTopic = state.session.messages.find((m) => m.id === targetTopicId);

          if (!sourceTopic || !targetTopic) return state;

          // 将源话题的所有子消息移动到目标话题
          const messages = state.session.messages.map((m) => {
            if (m.parentId === sourceTopicId) {
              return { ...m, parentId: targetTopicId };
            }
            return m;
          });

          // 将源话题本身也移动到目标话题下作为子话题
          const updatedMessages = messages.map((m) => {
            if (m.id === sourceTopicId) {
              return { ...m, parentId: targetTopicId };
            }
            return m;
          });

          // 将目标话题标记为星系
          const finalMessages = updatedMessages.map((m) => {
            if (m.id === targetTopicId && m.role === "topic") {
              return { ...m, topicType: "galaxy" as TopicType };
            }
            return m;
          });

          return {
            session: {
              ...state.session,
              messages: finalMessages,
              updatedAt: new Date(),
            },
          };
        });
      }
    } catch (err) {
      console.error("Failed to merge topics:", err);
    }
  },

  // 更新话题类型
  updateTopicType: async (topicId: string, type: TopicType) => {
    try {
      const res = await fetch(`/api/messages?id=${topicId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicType: type }),
      });

      if (res.ok) {
        set((state) => {
          if (!state.session) return state;
          const messages = state.session.messages.map((m) =>
            m.id === topicId ? { ...m, topicType: type } : m
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
      console.error("Failed to update topic type:", err);
    }
  },
}));

export { buildMessageTree };