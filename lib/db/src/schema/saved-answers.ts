import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { attemptsTable } from "./attempts";
import { questionsTable } from "./questions";

export const savedAnswersTable = pgTable("saved_answers", {
  id: serial("id").primaryKey(),
  attemptId: integer("attempt_id").notNull().references(() => attemptsTable.id, { onDelete: "cascade" }),
  questionId: integer("question_id").notNull().references(() => questionsTable.id, { onDelete: "cascade" }),
  selectedOption: integer("selected_option").notNull(),
  savedAt: timestamp("saved_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertSavedAnswerSchema = createInsertSchema(savedAnswersTable).omit({ id: true, savedAt: true });
export type InsertSavedAnswer = z.infer<typeof insertSavedAnswerSchema>;
export type SavedAnswer = typeof savedAnswersTable.$inferSelect;
