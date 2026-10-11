import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { getDb } from '../db';
import { examsTable, subjectsTable } from '../schema';
import { requireAuth, requireAdmin } from '../auth';

const router = Router();

router.get('/exams', requireAuth, (_req, res) => {
  const db = getDb();
  const exams = db.select().from(examsTable).all();
  const subjects = db.select().from(subjectsTable).all();
  const subMap = new Map(subjects.map(s => [s.id, s.name]));
  res.json(exams.map(e => ({ ...e, subjectName: subMap.get(e.subjectId) ?? '' })));
});

router.get('/exams/:id', requireAuth, (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const db = getDb();
  const exam = db.select().from(examsTable).where(eq(examsTable.id, id)).get();
  if (!exam) { res.status(404).json({ error: 'Exam not found' }); return; }
  const subject = db.select().from(subjectsTable).where(eq(subjectsTable.id, exam.subjectId)).get();
  res.json({ ...exam, subjectName: subject?.name ?? '' });
});

router.post('/exams', requireAdmin, (req, res) => {
  const { title, description = '', subjectId, durationMinutes = 60, passingScore = 50, assessmentType = 'final', isActive = true } = req.body ?? {};
  if (!title?.trim() || !subjectId) { res.status(400).json({ error: 'title and subjectId are required' }); return; }
  if (!['ca1', 'ca2', 'final'].includes(assessmentType)) { res.status(400).json({ error: 'assessmentType must be ca1, ca2, or final' }); return; }
  const [e] = getDb().insert(examsTable).values({ title: title.trim(), description, subjectId: Number(subjectId), durationMinutes: Number(durationMinutes), passingScore: Number(passingScore), assessmentType, isActive: Boolean(isActive) }).returning().all();
  res.status(201).json(e);
});

router.patch('/exams/:id', requireAdmin, (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const allowed = ['title', 'description', 'subjectId', 'durationMinutes', 'passingScore', 'assessmentType', 'isActive'];
  const update: Record<string, unknown> = {};
  for (const key of allowed) if (req.body?.[key] !== undefined) update[key] = req.body[key];
  if (update.assessmentType !== undefined && !['ca1', 'ca2', 'final'].includes(String(update.assessmentType))) { res.status(400).json({ error: 'assessmentType must be ca1, ca2, or final' }); return; }
  if (!Object.keys(update).length) { res.status(400).json({ error: 'Nothing to update' }); return; }
  const [e] = getDb().update(examsTable).set(update).where(eq(examsTable.id, id)).returning().all();
  if (!e) { res.status(404).json({ error: 'Exam not found' }); return; }
  res.json(e);
});

router.delete('/exams/:id', requireAdmin, (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const [e] = getDb().delete(examsTable).where(eq(examsTable.id, id)).returning().all();
  if (!e) { res.status(404).json({ error: 'Exam not found' }); return; }
  res.json({ message: 'Exam deleted' });
});

export default router;
