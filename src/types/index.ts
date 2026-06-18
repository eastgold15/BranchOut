export type NodeStatus = "untouched" | "mentioned" | "explored" | "mastered" | "weak";
export type MessageRole = "user" | "assistant";
export type MessageType = "text" | "correction" | "question" | "summary";
export type NodeSource = "ai-init" | "user-mention" | "ai-correction";
export type SessionStatus = "active" | "completed" | "archived";

export interface TopicNodeData {
  id: string;
  title: string;
  content: string;
  parentId: string | null;
  children: string[];
  depth: number;
  status: NodeStatus;
  source: NodeSource;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessageData {
  id: string;
  nodeId: string;
  role: MessageRole;
  content: string;
  type: MessageType;
  spawnedNodeId?: string;
  timestamp: Date;
}

export interface KnowledgeSession {
  id: string;
  rootTopic: string;
  status: SessionStatus;
  nodes: Map<string, TopicNodeData>;
  rootNodeId: string;
  currentFocusNodeId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TreeRenderNode {
  id: string;
  title: string;
  position: [number, number, number];
  status: NodeStatus;
  depth: number;
}

export interface TreeRenderEdge {
  from: string;
  to: string;
}

export type ViewMode = "tree" | "chat";

export interface NavigationStackItem {
  nodeId: string;
  title: string;
}
