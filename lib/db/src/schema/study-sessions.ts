import { date, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const studySessionsTable = pgTable("study_sessions", {
  id: serial("id").primaryKey(),
  date: date("date", { mode: "string" }).notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  durationSeconds: integer("duration_seconds").notNull().default(0),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertStudySessionSchema = createInsertSchema(studySessionsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertStudySession = z.infer<typeof insertStudySessionSchema>;
export type StudySession = typeof studySessionsTable.$inferSelect;