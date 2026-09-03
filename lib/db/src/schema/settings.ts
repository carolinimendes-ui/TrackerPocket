import { boolean, date, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const trackerSettingsTable = pgTable("tracker_settings", {
  id: serial("id").primaryKey(),
  language: text("language").notNull().default("Inglês"),
  dailyGoal: integer("daily_goal").notNull().default(12),
  vocabularyGoal: integer("vocabulary_goal").notNull().default(6000),
  initialVocabulary: integer("initial_vocabulary").notNull().default(4242),
  startDate: date("start_date", { mode: "string" }).notNull().default("2026-06-01"),
  darkMode: boolean("dark_mode").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertTrackerSettingsSchema = createInsertSchema(trackerSettingsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertTrackerSettings = z.infer<typeof insertTrackerSettingsSchema>;
export type TrackerSettings = typeof trackerSettingsTable.$inferSelect;