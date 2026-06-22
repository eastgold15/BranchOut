import { relations } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// 会话表
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

// AtomMessage 单表设计
// role = "topic" → 话题（可以有 children）
// role = "user" 或 "assistant" → 消息（属于某个话题）
// parentId = null → 根话题
// parentId = 话题id → 属于该话题的消息或子话题
export const atomMessages = sqliteTable("atom_messages", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  role: text("role", { enum: ["user", "assistant", "topic"] }).notNull(),
  timestamp: integer("timestamp", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  title: text("title").notNull().default(""), // 简述目的（AI生成）
  embedding: text("embedding"), // JSON: "[0.023,-0.056,...]" 384维向量
  parentId: text("parent_id"), // null 表示根话题，有值表示属于某个话题
});

// 会话关系
export const sessionsRelations = relations(sessions, ({ many }) => ({
  messages: many(atomMessages),
}));

// AtomMessage 关系
export const atomMessagesRelations = relations(atomMessages, ({ one, many }) => ({
  session: one(sessions, {
    fields: [atomMessages.sessionId],
    references: [sessions.id],
  }),
  parent: one(atomMessages, {
    fields: [atomMessages.parentId],
    references: [atomMessages.id],
  }),
  children: many(atomMessages),
}));

// 类型导出
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type AtomMessage = typeof atomMessages.$inferSelect;
export type NewAtomMessage = typeof atomMessages.$inferInsert;

// 辅助类型
export type Topic = AtomMessage & { role: "topic" };
export type ChatMessage = AtomMessage & { role: "user" | "assistant" };