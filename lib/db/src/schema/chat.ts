import { pgTable, text, serial, timestamp, boolean, integer } from "drizzle-orm/pg-core";

export const chatSessionsTable = pgTable("chat_sessions", {
  id: serial("id").primaryKey(),
  guestName: text("guest_name").notNull().default("Guest"),
  guestEmail: text("guest_email"),
  guestPhone: text("guest_phone"),
  clerkUserId: text("clerk_user_id"),
  ticketNumber: text("ticket_number"),
  status: text("status").notNull().default("open"),
  priority: text("priority").notNull().default("normal"),
  assigneeUserId: text("assignee_user_id"),
  assigneeName: text("assignee_name"),
  assigneeRole: text("assignee_role"),
  assignedAt: timestamp("assigned_at"),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const chatMessagesTable = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  senderType: text("sender_type").notNull(),
  senderName: text("sender_name").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const chatReplyTemplatesTable = pgTable("chat_reply_templates", {
  id: serial("id").primaryKey(),
  label: text("label").notNull(),
  body: text("body").notNull(),
  category: text("category").notNull().default("general"),
  shortcut: text("shortcut"),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type ChatSession = typeof chatSessionsTable.$inferSelect;
export type ChatMessage = typeof chatMessagesTable.$inferSelect;
export type ChatReplyTemplate = typeof chatReplyTemplatesTable.$inferSelect;
