import { date, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const studiesTable = pgTable("my_studies", {
  id: serial("id").primaryKey(),
  date: date("date", { mode: "string" }).notNull(),
  month: text("month").notNull(),
  description: text("description").notNull(),
  newWords: integer("new_words").notNull().default(0),
  studyMinutes: integer("study_minutes").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertStudySchema = createInsertSchema(studiesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertStudy = z.infer<typeof insertStudySchema>;
export type Study = typeof studiesTable.$inferSelect;