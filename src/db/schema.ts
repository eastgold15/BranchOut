import { relations } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  rootTopic: text("root_topic").notNull(),
  userId: text("user_id").notNull().default("anonymous"),
  status: text("status", { enum: ["active", "completed", "archived"] })
    .notNull()
    .default("active"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const topicNodes = sqliteTable("topic_nodes", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull().default(""),
  parentId: text("parent_id"),
  depth: integer("depth").notNull().default(0),
  embedding: text("embedding"), // JSON: "[0.023,-0.056,...]" 384维向量
  offset: text("offset").default("[0,0,0]"), // JSON: [x, y, z] 用户拖拽偏移
  status: text("status", {
    enum: ["untouched", "mentioned", "explored", "mastered", "weak"],
  })
    .notNull()
    .default("untouched"),
  source: text("source", {
    enum: ["ai-init", "user-mention", "ai-correction"],
  })
    .notNull()
    .default("ai-init"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const chatMessages = sqliteTable("chat_messages", {
  id: text("id").primaryKey(),
  nodeId: text("node_id")
    .notNull()
    .references(() => topicNodes.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  type: text("type", {
    enum: ["text", "correction", "question", "summary"],
  })
    .notNull()
    .default("text"),
  spawnedNodeId: text("spawned_node_id"),
  timestamp: integer("timestamp", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const sessionsRelations = relations(sessions, ({ many }) => ({
  nodes: many(topicNodes),
}));

export const topicNodesRelations = relations(topicNodes, ({ one, many }) => ({
  session: one(sessions, {
    fields: [topicNodes.sessionId],
    references: [sessions.id],
  }),
  parent: one(topicNodes, {
    fields: [topicNodes.parentId],
    references: [topicNodes.id],
  }),
  messages: many(chatMessages),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  node: one(topicNodes, {
    fields: [chatMessages.nodeId],
    references: [topicNodes.id],
  }),
}));

// 视角（View）- 用户创建的自定义知识结构
export const views = sqliteTable("views", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // 用户定义的视角名称
  type: text("type").notNull().default("custom"), // preset 或 custom
  // segments 是自定义视角的节点分组，格式: [{ title, nodeIds: [] }]
  segments: text("segments").notNull().default("[]"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const viewGroups = sqliteTable("view_groups", {
  id: text("id").primaryKey(),
  viewId: text("view_id")
    .notNull()
    .references(() => views.id, { onDelete: "cascade" }),
  parentId: text("parent_id"),
  title: text("title").notNull(),
  nodeIds: text("node_ids").notNull().default("[]"),
  color: text("color").notNull().default("#60A5FA"),
  position: integer("position").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const viewsRelations = relations(views, ({ one, many }) => ({
  session: one(sessions, {
    fields: [views.sessionId],
    references: [sessions.id],
  }),
  groups: many(viewGroups),
}));

export const viewGroupsRelations = relations(viewGroups, ({ one }) => ({
  view: one(views, {
    fields: [viewGroups.viewId],
    references: [views.id],
  }),
}));

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type TopicNode = typeof topicNodes.$inferSelect;
export type NewTopicNode = typeof topicNodes.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
export type View = typeof views.$inferSelect;
export type NewView = typeof views.$inferInsert;
export type ViewGroup = typeof viewGroups.$inferSelect;
export type NewViewGroup = typeof viewGroups.$inferInsert;
