import { Router, type IRouter } from "express";
import { db, subjectsTable, examsTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth";
import { CreateSubjectBody, UpdateSubjectBody, GetSubjectParams, UpdateSubjectParams, DeleteSubjectParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/subjects", requireAuth, async (_req, res): Promise<void> => {
  const subjects = await db.select().from(subjectsTable).orderBy(subjectsTable.name);
  const examCounts = await db.select({ subjectId: examsTable.subjectId, cnt: count() }).from(examsTable).groupBy(examsTable.subjectId);
  const countMap = new Map(examCounts.map((e) => [e.subjectId, Number(e.cnt)]));
  res.json(subjects.map((s) => ({ ...s, examCount: countMap.get(s.id) ?? 0 })));
});

router.post("/subjects", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateSubjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [subject] = await db.insert(subjectsTable).values(parsed.data).returning();
  res.status(201).json({ ...subject, examCount: 0 });
});

router.get("/subjects/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetSubjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [subject] = await db.select().from(subjectsTable).where(eq(subjectsTable.id, params.data.id));
  if (!subject) {
    res.status(404).json({ error: "Subject not found" });
    return;
  }
  const [examCount] = await db.select({ cnt: count() }).from(examsTable).where(eq(examsTable.subjectId, subject.id));
  res.json({ ...subject, examCount: Number(examCount?.cnt ?? 0) });
});

router.patch("/subjects/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateSubjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateSubjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [subject] = await db.update(subjectsTable).set(parsed.data).where(eq(subjectsTable.id, params.data.id)).returning();
  if (!subject) {
    res.status(404).json({ error: "Subject not found" });
    return;
  }
  const [examCount] = await db.select({ cnt: count() }).from(examsTable).where(eq(examsTable.subjectId, subject.id));
  res.json({ ...subject, examCount: Number(examCount?.cnt ?? 0) });
});

router.delete("/subjects/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = DeleteSubjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [subject] = await db.delete(subjectsTable).where(eq(subjectsTable.id, params.data.id)).returning();
  if (!subject) {
    res.status(404).json({ error: "Subject not found" });
    return;
  }
  res.json({ message: "Subject deleted" });
});

export default router;
