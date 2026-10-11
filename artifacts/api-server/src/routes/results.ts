import { Router, type IRouter } from "express";
import { db, resultsTable, attemptsTable, examsTable, subjectsTable, usersTable, questionsTable, savedAnswersTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth";
import { GetResultParams } from "@workspace/api-zod";

const router: IRouter = Router();

async function buildResult(result: typeof resultsTable.$inferSelect) {
  const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, result.examId));
  const [subject] = exam ? await db.select().from(subjectsTable).where(eq(subjectsTable.id, exam.subjectId)) : [null];
  const [student] = await db.select().from(usersTable).where(eq(usersTable.id, result.studentId));
  return {
    id: result.id,
    attemptId: result.attemptId,
    examId: result.examId,
    examTitle: exam?.title ?? "",
    subjectName: subject?.name ?? "",
    studentId: result.studentId,
    studentName: student?.name ?? "",
    score: result.score,
    totalQuestions: result.totalQuestions,
    percentage: result.percentage,
    passed: result.passed,
    submittedAt: result.submittedAt,
  };
}

router.get("/results", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const results = await db.select().from(resultsTable).where(eq(resultsTable.studentId, user.id)).orderBy(asc(resultsTable.submittedAt));
  const built = await Promise.all(results.map(buildResult));
  res.json(built);
});

router.get("/results/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetResultParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const user = (req as any).user;
  const [result] = await db.select().from(resultsTable).where(eq(resultsTable.id, params.data.id));
  if (!result) {
    res.status(404).json({ error: "Result not found" });
    return;
  }
  if (user.role !== "admin" && result.studentId !== user.id) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const base = await buildResult(result);
  const questions = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.examId, result.examId))
    .orderBy(asc(questionsTable.order), asc(questionsTable.id));
  const savedAnswers = await db.select().from(savedAnswersTable).where(eq(savedAnswersTable.attemptId, result.attemptId));
  const answerMap = new Map(savedAnswers.map((a) => [a.questionId, a.selectedOption]));
  const questionReview = questions.map((q) => {
    const selected = answerMap.has(q.id) ? answerMap.get(q.id)! : null;
    return {
      questionId: q.id,
      text: q.text,
      options: q.options,
      correctOption: q.correctOption,
      selectedOption: selected,
      isCorrect: selected !== null && selected === q.correctOption,
      imagePath: q.imagePath,
    };
  });
  res.json({ ...base, questionReview });
});

router.get("/admin/results", requireAdmin, async (_req, res): Promise<void> => {
  const results = await db.select().from(resultsTable).orderBy(asc(resultsTable.submittedAt));
  const built = await Promise.all(results.map(buildResult));
  res.json(built);
});

export default router;
