import { text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { pgTable } from "drizzle-orm/pg-core";

export const monthlySummariesTable = pgTable("monthly_summaries", {
  month: text("month").primaryKey(),
  reflectionGood: text("reflection_good").notNull().default(""),
  reflectionImprove: text("reflection_improve").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertMonthlySummarySchema = createInsertSchema(monthlySummariesTable).omit({
  updatedAt: true,
});
export type InsertMonthlySummary = z.infer<typeof insertMonthlySummarySchema>;
export type MonthlySummary = typeof monthlySummariesTable.$inferSelect;