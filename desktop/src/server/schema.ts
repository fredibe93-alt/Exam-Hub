import { sqliteTable, integer, text, real, customType } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

function jsonCol<T>(name: string) {
  return customType<{ data: T; driverData: string }>({
    dataType() { return 'text'; },
    toDriver(val: T) { return JSON.stringify(val); },
    fromDriver(val) { return JSON.parse(String(val)) as T; },
  })(name);
}

export const usersTable = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: ['student', 'admin'] }).notNull().default('student'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const subjectsTable = sqliteTable('subjects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const examsTable = sqliteTable('exams', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  subjectId: integer('subject_id').notNull().references(() => subjectsTable.id, { onDelete: 'cascade' }),
  durationMinutes: integer('duration_minutes').notNull().default(60),
  passingScore: integer('passing_score').notNull().default(50),
  assessmentType: text('assessment_type', { enum: ['ca1', 'ca2', 'final'] }).notNull().default('final'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const questionsTable = sqliteTable('questions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  examId: integer('exam_id').notNull().references(() => examsTable.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  options: jsonCol<string[]>('options').notNull(),
  correctOption: integer('correct_option').notNull(),
  order: integer('order').notNull().default(0),
  imagePath: text('image_path'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
});

export const attemptsTable = sqliteTable('attempts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  examId: integer('exam_id').notNull().references(() => examsTable.id, { onDelete: 'cascade' }),
  studentId: integer('student_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ['in_progress', 'submitted'] }).notNull().default('in_progress'),
  startedAt: text('started_at').notNull().default(sql`(datetime('now'))`),
  submittedAt: text('submitted_at'),
});

export const savedAnswersTable = sqliteTable('saved_answers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  attemptId: integer('attempt_id').notNull().references(() => attemptsTable.id, { onDelete: 'cascade' }),
  questionId: integer('question_id').notNull().references(() => questionsTable.id, { onDelete: 'cascade' }),
  selectedOption: integer('selected_option').notNull(),
  savedAt: text('saved_at').notNull().default(sql`(datetime('now'))`),
});

export const resultsTable = sqliteTable('results', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  attemptId: integer('attempt_id').notNull().references(() => attemptsTable.id, { onDelete: 'cascade' }),
  studentId: integer('student_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  examId: integer('exam_id').notNull().references(() => examsTable.id, { onDelete: 'cascade' }),
  score: integer('score').notNull(),
  totalQuestions: integer('total_questions').notNull(),
  percentage: real('percentage').notNull(),
  passed: integer('passed', { mode: 'boolean' }).notNull(),
  submittedAt: text('submitted_at').notNull().default(sql`(datetime('now'))`),
});
