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
  title: text("title").notNull().default(""),
  embedding: text("embedding"),
  parentId: text("parent_id"),
  order: integer("order").notNull().default(0), // 排序字段，用于手动调整顺序
  topicType: text("topic_type", { enum: ["normal", "galaxy"] }).default("normal"), // 话题类型
});

export const sessionsRelations = relations(sessions, ({ many }) => ({
  messages: many(atomMessages),
}));

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

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type AtomMessage = typeof atomMessages.$inferSelect;
export type NewAtomMessage = typeof atomMessages.$inferInsert;

export type Topic = AtomMessage & { role: "topic" };
export type ChatMessage = AtomMessage & { role: "user" | "assistant" };