import { Router, type IRouter } from "express";
import { db, examsTable, subjectsTable, questionsTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth";
import { CreateExamBody, UpdateExamBody, GetExamParams, UpdateExamParams, DeleteExamParams } from "@workspace/api-zod";

const router: IRouter = Router();

async function buildExamResponse(exam: typeof examsTable.$inferSelect) {
  const [subject] = await db.select().from(subjectsTable).where(eq(subjectsTable.id, exam.subjectId));
  const [qCount] = await db.select({ cnt: count() }).from(questionsTable).where(eq(questionsTable.examId, exam.id));
  return {
    ...exam,
    subjectName: subject?.name ?? "",
    questionCount: Number(qCount?.cnt ?? 0),
  };
}

router.get("/exams", requireAuth, async (_req, res): Promise<void> => {
  const exams = await db.select().from(examsTable).orderBy(examsTable.createdAt);
  const subjects = await db.select().from(subjectsTable);
  const questionCounts = await db.select({ examId: questionsTable.examId, cnt: count() }).from(questionsTable).groupBy(questionsTable.examId);
  const subjectMap = new Map(subjects.map((s) => [s.id, s.name]));
  const qCountMap = new Map(questionCounts.map((q) => [q.examId, Number(q.cnt)]));
  res.json(exams.map((e) => ({ ...e, subjectName: subjectMap.get(e.subjectId) ?? "", questionCount: qCountMap.get(e.id) ?? 0 })));
});

router.post("/exams", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateExamBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [exam] = await db.insert(examsTable).values(parsed.data).returning();
  res.status(201).json(await buildExamResponse(exam));
});

router.get("/exams/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetExamParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, params.data.id));
  if (!exam) {
    res.status(404).json({ error: "Exam not found" });
    return;
  }
  res.json(await buildExamResponse(exam));
});

router.patch("/exams/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateExamParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateExamBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [exam] = await db.update(examsTable).set(parsed.data).where(eq(examsTable.id, params.data.id)).returning();
  if (!exam) {
    res.status(404).json({ error: "Exam not found" });
    return;
  }
  res.json(await buildExamResponse(exam));
});

router.delete("/exams/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = DeleteExamParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [exam] = await db.delete(examsTable).where(eq(examsTable.id, params.data.id)).returning();
  if (!exam) {
    res.status(404).json({ error: "Exam not found" });
    return;
  }
  res.json({ message: "Exam deleted" });
});

export default router;
