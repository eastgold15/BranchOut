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
export type ViewType =
  | "default"
  | "semantic"
  | "chronological"
  | "problem-solving"
  | string; // 允许自定义视角 ID

export interface CustomView {
  id: string;
  name: string;
  segments: Array<{ title: string; nodeIds: string[] }>;
  viewGroups?: ViewGroup[];
}

export interface ViewGroup {
  color: string;
  createdAt: Date;
  id: string;
  nodeIds: string[];
  parentId: string | null;
  position: number;
  title: string;
  updatedAt: Date;
  viewId: string;
}

export interface TopicNodeData {
  children: string[];
  content: string;
  createdAt: Date;
  depth: number;
  embedding?: number[] | null;
  id: string;
  offset?: string; // JSON: "[x,y,z]" 3D偏移量
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
