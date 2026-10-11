import { Router, type IRouter } from "express";
import { db, attemptsTable, examsTable, questionsTable, savedAnswersTable, resultsTable } from "@workspace/db";
import { eq, and, asc } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import {
  StartAttemptParams,
  GetAttemptParams,
  SaveAnswersParams,
  SaveAnswersBody,
  SubmitAttemptParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/exams/:examId/attempts", requireAuth, async (req, res): Promise<void> => {
  const params = StartAttemptParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const user = (req as any).user;
  const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, params.data.examId));
  if (!exam) {
    res.status(404).json({ error: "Exam not found" });
    return;
  }
  // Check for existing in-progress attempt
  const [existing] = await db
    .select()
    .from(attemptsTable)
    .where(and(eq(attemptsTable.examId, exam.id), eq(attemptsTable.studentId, user.id), eq(attemptsTable.status, "in_progress")));
  if (existing) {
    const elapsed = Math.floor((Date.now() - new Date(existing.startedAt).getTime()) / 1000);
    const total = exam.durationMinutes * 60;
    const remaining = Math.max(0, total - elapsed);
    res.status(201).json({
      id: existing.id,
      examId: existing.examId,
      examTitle: exam.title,
      studentId: existing.studentId,
      status: existing.status,
      startedAt: existing.startedAt,
      submittedAt: existing.submittedAt ?? null,
      timeRemainingSeconds: remaining,
    });
    return;
  }
  const [attempt] = await db
    .insert(attemptsTable)
    .values({ examId: exam.id, studentId: user.id, status: "in_progress" })
    .returning();
  res.status(201).json({
    id: attempt.id,
    examId: attempt.examId,
    examTitle: exam.title,
    studentId: attempt.studentId,
    status: attempt.status,
    startedAt: attempt.startedAt,
    submittedAt: attempt.submittedAt ?? null,
    timeRemainingSeconds: exam.durationMinutes * 60,
  });
});

router.get("/attempts/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetAttemptParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const user = (req as any).user;
  const [attempt] = await db.select().from(attemptsTable).where(eq(attemptsTable.id, params.data.id));
  if (!attempt) {
    res.status(404).json({ error: "Attempt not found" });
    return;
  }
  if (user.role !== "admin" && attempt.studentId !== user.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, attempt.examId));
  if (!exam) {
    res.status(404).json({ error: "Exam not found" });
    return;
  }
  const questions = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.examId, exam.id))
    .orderBy(asc(questionsTable.order), asc(questionsTable.id));
  const savedAnswers = await db
    .select()
    .from(savedAnswersTable)
    .where(eq(savedAnswersTable.attemptId, attempt.id));
  const answersMap: Record<string, number> = {};
  for (const a of savedAnswers) {
    answersMap[String(a.questionId)] = a.selectedOption;
  }
  const elapsed = Math.floor((Date.now() - new Date(attempt.startedAt).getTime()) / 1000);
  const total = exam.durationMinutes * 60;
  const remaining = Math.max(0, total - elapsed);
  res.json({
    id: attempt.id,
    examId: attempt.examId,
    examTitle: exam.title,
    durationMinutes: exam.durationMinutes,
    studentId: attempt.studentId,
    status: attempt.status,
    startedAt: attempt.startedAt,
    submittedAt: attempt.submittedAt ?? null,
    timeRemainingSeconds: remaining,
    questions: questions.map((q) => ({ id: q.id, text: q.text, options: q.options, order: q.order, imagePath: q.imagePath })),
    savedAnswers: answersMap,
  });
});

router.patch("/attempts/:id/answers", requireAuth, async (req, res): Promise<void> => {
  const params = SaveAnswersParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = SaveAnswersBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = (req as any).user;
  const [attempt] = await db.select().from(attemptsTable).where(eq(attemptsTable.id, params.data.id));
  if (!attempt || attempt.studentId !== user.id) {
    res.status(404).json({ error: "Attempt not found" });
    return;
  }
  if (attempt.status !== "in_progress") {
    res.status(400).json({ error: "Attempt already submitted" });
    return;
  }
  for (const [questionIdStr, selectedOption] of Object.entries(parsed.data.answers)) {
    const questionId = parseInt(questionIdStr, 10);
    const [existing] = await db
      .select()
      .from(savedAnswersTable)
      .where(and(eq(savedAnswersTable.attemptId, attempt.id), eq(savedAnswersTable.questionId, questionId)));
    if (existing) {
      await db
        .update(savedAnswersTable)
        .set({ selectedOption, savedAt: new Date() })
        .where(eq(savedAnswersTable.id, existing.id));
    } else {
      await db.insert(savedAnswersTable).values({ attemptId: attempt.id, questionId, selectedOption });
    }
  }
  res.json({ message: "Answers saved" });
});

router.post("/attempts/:id/submit", requireAuth, async (req, res): Promise<void> => {
  const params = SubmitAttemptParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const user = (req as any).user;
  const [attempt] = await db.select().from(attemptsTable).where(eq(attemptsTable.id, params.data.id));
  if (!attempt || attempt.studentId !== user.id) {
    res.status(404).json({ error: "Attempt not found" });
    return;
  }
  if (attempt.status !== "in_progress") {
    // Already submitted — return existing result
    const [result] = await db.select().from(resultsTable).where(eq(resultsTable.attemptId, attempt.id));
    if (result) {
      const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, attempt.examId));
      res.json({
        id: result.id,
        attemptId: result.attemptId,
        examId: result.examId,
        examTitle: exam?.title ?? "",
        subjectName: "",
        studentId: result.studentId,
        studentName: user.name,
        score: result.score,
        totalQuestions: result.totalQuestions,
        percentage: result.percentage,
        passed: result.passed,
        submittedAt: result.submittedAt,
      });
      return;
    }
    res.status(400).json({ error: "Attempt already submitted" });
    return;
  }
  const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, attempt.examId));
  if (!exam) {
    res.status(404).json({ error: "Exam not found" });
    return;
  }
  const questions = await db.select().from(questionsTable).where(eq(questionsTable.examId, exam.id));
  const savedAnswers = await db.select().from(savedAnswersTable).where(eq(savedAnswersTable.attemptId, attempt.id));
  const answerMap = new Map(savedAnswers.map((a) => [a.questionId, a.selectedOption]));
  let score = 0;
  for (const q of questions) {
    if (answerMap.get(q.id) === q.correctOption) score++;
  }
  const totalQuestions = questions.length;
  const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100 * 10) / 10 : 0;
  const passed = percentage >= exam.passingScore;
  const submittedAt = new Date();
  await db.update(attemptsTable).set({ status: "submitted", submittedAt }).where(eq(attemptsTable.id, attempt.id));
  const [result] = await db
    .insert(resultsTable)
    .values({ attemptId: attempt.id, studentId: user.id, examId: exam.id, score, totalQuestions, percentage, passed, submittedAt })
    .returning();
  res.json({
    id: result.id,
    attemptId: result.attemptId,
    examId: result.examId,
    examTitle: exam.title,
    subjectName: "",
    studentId: result.studentId,
    studentName: user.name,
    score: result.score,
    totalQuestions: result.totalQuestions,
    percentage: result.percentage,
    passed: result.passed,
    submittedAt: result.submittedAt,
  });
});

export default router;
