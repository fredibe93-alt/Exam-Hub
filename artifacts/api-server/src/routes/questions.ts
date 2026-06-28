import { Router, type IRouter } from "express";
import { db, questionsTable } from "@workspace/db";
import { eq, asc, count } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth";
import {
  ListQuestionsParams,
  CreateQuestionParams,
  CreateQuestionBody,
  UpdateQuestionParams,
  UpdateQuestionBody,
  DeleteQuestionParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

interface BulkQuestionItem {
  text: string;
  options: string[];
  correctOption: number;
}

function validateBulkBody(body: unknown): { questions: BulkQuestionItem[] } | { error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { error: "Request body must be a JSON object" };
  const raw = body as Record<string, unknown>;
  if (!Array.isArray(raw.questions)) return { error: '"questions" must be an array' };
  const questions = raw.questions as unknown[];
  if (questions.length === 0) return { error: "At least one question is required" };
  if (questions.length > 200) return { error: "Max 200 questions per import" };
  const items: BulkQuestionItem[] = [];
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q || typeof q !== "object" || Array.isArray(q)) return { error: `Question ${i + 1}: must be an object` };
    const qr = q as Record<string, unknown>;
    if (typeof qr.text !== "string" || !qr.text.trim()) return { error: `Question ${i + 1}: "text" must be a non-empty string` };
    if (!Array.isArray(qr.options) || qr.options.length < 2 || qr.options.length > 6) return { error: `Question ${i + 1}: "options" must be an array of 2–6 strings` };
    const options = (qr.options as unknown[]).map((o) => String(o ?? "").trim()).filter(Boolean);
    if (options.length < 2) return { error: `Question ${i + 1}: "options" must contain at least 2 non-empty values` };
    if (typeof qr.correctOption !== "number" || !Number.isInteger(qr.correctOption) || qr.correctOption < 0 || qr.correctOption >= options.length) {
      return { error: `Question ${i + 1}: "correctOption" must be an integer in range 0–${options.length - 1}` };
    }
    items.push({ text: qr.text.trim(), options, correctOption: qr.correctOption });
  }
  return { questions: items };
}

router.get("/exams/:examId/questions", requireAuth, async (req, res): Promise<void> => {
  const params = ListQuestionsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const questions = await db
    .select()
    .from(questionsTable)
    .where(eq(questionsTable.examId, params.data.examId))
    .orderBy(asc(questionsTable.order), asc(questionsTable.id));
  res.json(questions);
});

router.post("/exams/:examId/questions", requireAdmin, async (req, res): Promise<void> => {
  const params = CreateQuestionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = CreateQuestionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [question] = await db
    .insert(questionsTable)
    .values({ ...parsed.data, examId: params.data.examId })
    .returning();
  res.status(201).json(question);
});

router.post("/exams/:examId/questions/bulk", requireAdmin, async (req, res): Promise<void> => {
  const examIdRaw = parseInt(String(req.params.examId), 10);
  if (isNaN(examIdRaw)) {
    res.status(400).json({ error: "Invalid exam ID" });
    return;
  }

  const validated = validateBulkBody(req.body);
  if ("error" in validated) {
    res.status(400).json({ error: validated.error });
    return;
  }

  // Get current question count to set order values
  const [countRow] = await db
    .select({ cnt: count() })
    .from(questionsTable)
    .where(eq(questionsTable.examId, examIdRaw));
  const startOrder = Number(countRow?.cnt ?? 0);

  const rows = validated.questions.map((q: BulkQuestionItem, i: number) => ({
    examId: examIdRaw,
    text: q.text,
    options: q.options,
    correctOption: q.correctOption,
    order: startOrder + i,
  }));

  const inserted = await db.insert(questionsTable).values(rows).returning();
  res.status(201).json({ imported: inserted.length, questions: inserted });
});

router.patch("/questions/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateQuestionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateQuestionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [question] = await db
    .update(questionsTable)
    .set(parsed.data)
    .where(eq(questionsTable.id, params.data.id))
    .returning();
  if (!question) {
    res.status(404).json({ error: "Question not found" });
    return;
  }
  res.json(question);
});

router.delete("/questions/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = DeleteQuestionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [question] = await db.delete(questionsTable).where(eq(questionsTable.id, params.data.id)).returning();
  if (!question) {
    res.status(404).json({ error: "Question not found" });
    return;
  }
  res.json({ message: "Question deleted" });
});

export default router;
