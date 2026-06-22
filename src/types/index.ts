// AtomMessage 统一数据结构
// role = "topic" → 话题（可以有 children）
// role = "user" 或 "assistant" → 消息（属于某个话题）
export type MessageRole = "user" | "assistant" | "topic";
export type SessionStatus = "active" | "completed" | "archived";

// 话题类型区分
export type TopicType = "normal" | "galaxy"; // normal=普通话题, galaxy=星系（包含子话题）

export interface AtomMessageData {
  id: string;
  sessionId: string;
  content: string;
  role: MessageRole;
  timestamp: Date;
  title: string; // 简述目的（AI生成）
  embedding?: number[] | null; // 语义向量（384维）
  parentId: string | null; // null 表示根话题，有值表示属于某个话题
  order: number; // 排序字段，用于手动调整顺序
  topicType?: TopicType; // 话题类型（仅 role="topic" 时有意义）
  children?: AtomMessageData[]; // 子消息/话题（用于嵌套渲染）
}

// 辅助类型
export type TopicData = AtomMessageData & { role: "topic" };
export type ChatMessageData = AtomMessageData & { role: "user" | "assistant" };
export type GalaxyTopicData = AtomMessageData & { role: "topic"; topicType: "galaxy" };
export type NormalTopicData = AtomMessageData & { role: "topic"; topicType?: "normal" };

// 判断话题类型
export function isGalaxyTopic(message: AtomMessageData): message is GalaxyTopicData {
  return message.role === "topic" && message.topicType === "galaxy";
}

export function hasChildTopics(message: AtomMessageData): boolean {
  return message.role === "topic" &&
    (message.children?.some((child) => child.role === "topic") ?? false);
}

// 会话数据
export interface KnowledgeSession {
  id: string;
  rootTopic: string;
  userId: string;
  status: SessionStatus;
  createdAt: Date;
  updatedAt: Date;
  messages: AtomMessageData[];
}

// 树渲染节点（用于 3D 视图）
export interface TreeRenderNode {
  id: string;
  position: [number, number, number];
  scale: number;
  title: string;
  isTopic: boolean;
  isGalaxy: boolean;
  hasChildTopics: boolean;
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