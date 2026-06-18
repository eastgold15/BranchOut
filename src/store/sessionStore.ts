import { create } from "zustand";
import type {
  KnowledgeSession,
  TopicNodeData,
  ChatMessageData,
  ViewMode,
  NavigationStackItem,
  NodeStatus,
} from "@/types";

interface SessionState {
  session: KnowledgeSession | null;
  viewMode: ViewMode;
  navigationStack: NavigationStackItem[];
  currentChatNodeId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setSession: (session: KnowledgeSession) => void;
  addNode: (node: TopicNodeData) => void;
  updateNodeStatus: (nodeId: string, status: NodeStatus) => void;
  addMessage: (message: ChatMessageData) => void;
  enterChat: (nodeId: string, title: string) => void;
  enterSubChat: (nodeId: string, title: string) => void;
  goBack: () => void;
  returnToTree: () => void;
  setViewMode: (mode: ViewMode) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  session: null,
  viewMode: "tree",
  navigationStack: [],
  currentChatNodeId: null,
  isLoading: false,
  error: null,

  setSession: (session) =>
    set({
      session,
      viewMode: "tree",
      navigationStack: [],
      currentChatNodeId: null,
      error: null,
    }),

  addNode: (node) =>
    set((state) => {
      if (!state.session) return state;
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
      if (!state.session) return state;
      const node = state.session.nodes.get(nodeId);
      if (!node) return state;

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

  addMessage: (message) =>
    set((state) => {
      if (!state.session) return state;
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
        currentChatNodeId: newStack[newStack.length - 1].nodeId,
      };
    }),

  returnToTree: () =>
    set({
      viewMode: "tree",
      currentChatNodeId: null,
      navigationStack: [],
    }),

  setViewMode: (mode) => set({ viewMode: mode }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  clearSession: () =>
    set({
      session: null,
      viewMode: "tree",
      navigationStack: [],
      currentChatNodeId: null,
      error: null,
    }),
}));
