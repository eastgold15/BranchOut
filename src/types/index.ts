// AtomMessage 统一数据结构
// role = "topic" → 话题（可以有 children）
// role = "user" 或 "assistant" → 消息（属于某个话题）
export type MessageRole = "user" | "assistant" | "topic";
export type SessionStatus = "active" | "completed" | "archived";

export interface AtomMessageData {
  id: string;
  sessionId: string;
  content: string;
  role: MessageRole;
  timestamp: Date;
  title: string; // 简述目的（AI生成）
  embedding?: number[] | null; // 语义向量（384维）
  parentId: string | null; // null 表示根话题，有值表示属于某个话题
  children?: AtomMessageData[]; // 子消息/话题（用于嵌套渲染）
}

// 辅助类型
export type TopicData = AtomMessageData & { role: "topic" };
export type ChatMessageData = AtomMessageData & { role: "user" | "assistant" };

// 会话数据
export interface KnowledgeSession {
  id: string;
  rootTopic: string;
  userId: string;
  status: SessionStatus;
  createdAt: Date;
  updatedAt: Date;
  // 消息树（AtomMessage）
  messages: AtomMessageData[];
}

// 树渲染节点（用于 3D 视图）
export interface TreeRenderNode {
  id: string;
  position: [number, number, number];
  scale: number; // children.length * 基础大小
  title: string;
  isTopic: boolean; // role === "topic"
}

// 树渲染边（用于 3D 视图）
export interface TreeRenderEdge {
  from: string;
  to: string;
}

// 视图模式
export type ViewMode = "tree" | "chat";

// 导航栈项
export interface NavigationStackItem {
  nodeId: string;
  title: string;
}