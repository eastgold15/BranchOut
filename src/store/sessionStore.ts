import { create } from "zustand";
import type {
  ChatMessageData,
  CustomView,
  KnowledgeSession,
  NavigationStackItem,
  NodeStatus,
  TopicNodeData,
  ViewMode,
  ViewType,
} from "@/types";

interface RecentSession {
  createdAt: Date;
  id: string;
  nodeCount?: number;
  rootTopic: string;
  status: string;
  updatedAt: Date;
}

interface SessionState {
  addMessage: (message: ChatMessageData) => void;
  addNode: (node: TopicNodeData) => void;
  addView: (view: CustomView) => void;
  clearSession: () => void;
  currentChatNodeId: string | null;
  currentGalaxyId: string | null;
  currentViewType: ViewType;
  customViews: CustomView[];
  draggingNodeId: string | null;
  dragStartPos: [number, number, number] | null;
  endDrag: () => void;
  enterChat: (nodeId: string, title: string) => void;
  enterGalaxy: (galaxyId: string) => void;
  enterSubChat: (nodeId: string, title: string) => void;
  error: string | null;
  exitGalaxy: () => void;
  galaxyHistory: string[];
  goBack: () => void;
  isLoading: boolean;
  loadRecentSessions: () => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  loadViews: (sessionId: string) => Promise<void>;
  navigationStack: NavigationStackItem[];
  nodeOffsets: Map<string, [number, number, number]>;
  onDrag: (delta: [number, number, number]) => void;
  recentSessions: RecentSession[];
  returnToTree: () => void;
  session: KnowledgeSession | null;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;

  // Actions
  setSession: (session: KnowledgeSession) => void;
  setViewMode: (mode: ViewMode) => void;
  setViewType: (type: ViewType) => void;
  startDrag: (nodeId: string, worldPos: [number, number, number]) => void;
  updateNodeOffsets: (offsets: Map<string, [number, number, number]>) => void;
  updateNodeStatus: (nodeId: string, status: NodeStatus) => void;
  viewMode: ViewMode;
}

export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  viewMode: "chat",
  currentViewType: "default",
  navigationStack: [],
  currentChatNodeId: null,
  isLoading: false,
  error: null,
  recentSessions: [],
  customViews: [],
  nodeOffsets: new Map(),
  currentGalaxyId: null,
  galaxyHistory: [],
  draggingNodeId: null,
  dragStartPos: null,

  setSession: (session) =>
    set({
      session,
      viewMode: "chat",
      navigationStack: [],
      currentChatNodeId: null,
      error: null,
    }),

  loadRecentSessions: async () => {
    try {
      const res = await fetch("/api/sessions");
      if (!res.ok) {
        return;
      }
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
      if (!res.ok) {
        throw new Error("Failed to load session");
      }
      const data = await res.json();

      const nodesMap = new Map<string, TopicNodeData>();
      for (const node of data.nodes as TopicNodeData[]) {
        nodesMap.set(node.id, node);
      }

      const session: KnowledgeSession = {
        id: data.session.id,
        rootTopic: data.session.rootTopic,
        status: data.session.status,
        nodes: nodesMap,
        rootNodeId: data.rootNodeId,
        currentFocusNodeId: null,
        createdAt: new Date(data.session.createdAt),
        updatedAt: new Date(data.session.updatedAt),
      };

      set({
        session,
        viewMode: "chat",
        navigationStack: [],
        currentChatNodeId: null,
        error: null,
        isLoading: false,
      });
    } catch (err) {
      console.error("Failed to load session:", err);
      set({ error: "加载会话失败", isLoading: false });
    }
  },

  addNode: (node) =>
    set((state) => {
      if (!state.session) {
        return state;
      }
      const newNodes = new Map(state.session.nodes);
      newNodes.set(node.id, node);

      if (node.parentId) {
        const parent = newNodes.get(node.parentId);
        if (parent && !parent.children.includes(node.id)) {
          newNodes.set(node.parentId, {
            ...parent,
            children: [...parent.children, node.id],
          });
        }
      }

      return {
        session: {
          ...state.session,
          nodes: newNodes,
          updatedAt: new Date(),
        },
      };
    }),

  updateNodeStatus: (nodeId, status) =>
    set((state) => {
      if (!state.session) {
        return state;
      }
      const node = state.session.nodes.get(nodeId);
      if (!node) {
        return state;
      }

      const newNodes = new Map(state.session.nodes);
      newNodes.set(nodeId, { ...node, status, updatedAt: new Date() });

      return {
        session: {
          ...state.session,
          nodes: newNodes,
          updatedAt: new Date(),
        },
      };
    }),

  addMessage: (_message) =>
    set((state) => {
      if (!state.session) {
        return state;
      }
      return {
        session: {
          ...state.session,
          updatedAt: new Date(),
        },
      };
    }),

  enterChat: (nodeId, title) =>
    set({
      viewMode: "chat",
      currentChatNodeId: nodeId,
      navigationStack: [{ nodeId, title }],
    }),

  enterSubChat: (nodeId, title) =>
    set((state) => ({
      currentChatNodeId: nodeId,
      navigationStack: [...state.navigationStack, { nodeId, title }],
    })),

  goBack: () =>
    set((state) => {
      if (state.navigationStack.length <= 1) {
        return {
          viewMode: "tree",
          currentChatNodeId: null,
          navigationStack: [],
        };
      }
      const newStack = state.navigationStack.slice(0, -1);
      return {
        navigationStack: newStack,
        currentChatNodeId: newStack.at(-1)?.nodeId,
      };
    }),

  returnToTree: () =>
    set((state) => {
      const currentNodeId = state.currentChatNodeId;
      let newNodes = state.session?.nodes;

      if (currentNodeId && state.session) {
        const node = state.session.nodes.get(currentNodeId);
        if (node && node.status !== "mastered") {
          newNodes = new Map(state.session.nodes);
          newNodes.set(currentNodeId, {
            ...node,
            status: "explored",
            updatedAt: new Date(),
          });
        }
      }

      return {
        viewMode: "tree",
        currentChatNodeId: null,
        navigationStack: [],
        session: state.session
          ? { ...state.session, nodes: newNodes || state.session.nodes }
          : null,
      };
    }),

  setViewMode: (mode) => set({ viewMode: mode }),
  setViewType: (type) => set({ currentViewType: type }),

  loadViews: async (sessionId: string) => {
    try {
      const res = await fetch(`/api/views?sessionId=${sessionId}`);
      if (!res.ok) {
        return;
      }
      const data = await res.json();
      const views: CustomView[] = (data.views || []).map(
        (v: { id: string; name: string; segments: string }) => ({
          id: v.id,
          name: v.name,
          segments: JSON.parse(v.segments || "[]"),
        })
      );
      set({ customViews: views });
    } catch {
      // 静默失败
    }
  },

  addView: (view) =>
    set((state) => ({
      customViews: [...state.customViews, view],
    })),

  updateNodeOffsets: (offsets) => set({ nodeOffsets: offsets }),

  startDrag: (nodeId, worldPos) =>
    set({ draggingNodeId: nodeId, dragStartPos: worldPos }),

  onDrag: (delta) =>
    set((state) => {
      if (!state.draggingNodeId) {
        return state;
      }

      const newOffsets = new Map(state.nodeOffsets);
      const currentOffset = newOffsets.get(state.draggingNodeId) || [0, 0, 0];
      const newOffset: [number, number, number] = [
        currentOffset[0] + delta[0],
        currentOffset[1] + delta[1],
        currentOffset[2] + delta[2],
      ];
      newOffsets.set(state.draggingNodeId, newOffset);

      const node = state.session?.nodes.get(state.draggingNodeId);
      if (node?.children.length) {
        for (const childId of node.children) {
          const childOffset = newOffsets.get(childId) || [0, 0, 0];
          newOffsets.set(childId, [
            childOffset[0] + delta[0],
            childOffset[1] + delta[1],
            childOffset[2] + delta[2],
          ]);
        }
      }

      return { nodeOffsets: newOffsets };
    }),

  endDrag: () => set({ draggingNodeId: null, dragStartPos: null }),

  enterGalaxy: (galaxyId) =>
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

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  clearSession: () =>
    set({
      session: null,
      viewMode: "tree",
      navigationStack: [],
      currentChatNodeId: null,
      customViews: [],
      error: null,
      nodeOffsets: new Map(),
      currentGalaxyId: null,
      galaxyHistory: [],
    }),
}));
