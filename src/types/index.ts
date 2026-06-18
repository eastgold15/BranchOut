export type NodeStatus =
  | "untouched"
  | "mentioned"
  | "explored"
  | "mastered"
  | "weak";
export type MessageRole = "user" | "assistant";
export type MessageType = "text" | "correction" | "question" | "summary";
export type NodeSource = "ai-init" | "user-mention" | "ai-correction";
export type SessionStatus = "active" | "completed" | "archived";

export interface TopicNodeData {
  children: string[];
  content: string;
  createdAt: Date;
  depth: number;
  id: string;
  parentId: string | null;
  source: NodeSource;
  status: NodeStatus;
  title: string;
  updatedAt: Date;
}

export interface ChatMessageData {
  content: string;
  id: string;
  nodeId: string;
  role: MessageRole;
  spawnedNodeId?: string;
  timestamp: Date;
  type: MessageType;
}

export interface KnowledgeSession {
  createdAt: Date;
  currentFocusNodeId: string | null;
  id: string;
  nodes: Map<string, TopicNodeData>;
  rootNodeId: string;
  rootTopic: string;
  status: SessionStatus;
  updatedAt: Date;
}

export interface TreeRenderNode {
  depth: number;
  id: string;
  position: [number, number, number];
  status: NodeStatus;
  title: string;
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
