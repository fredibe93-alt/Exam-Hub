import { Router } from 'express';
import { eq, asc } from 'drizzle-orm';
import { getDb } from '../db';
import { questionsTable } from '../schema';
import { requireAuth, requireAdmin } from '../auth';

const router = Router();

router.get('/exams/:examId/questions', requireAuth, (req, res) => {
  const examId = parseInt(String(req.params.examId), 10);
  res.json(getDb().select().from(questionsTable).where(eq(questionsTable.examId, examId)).orderBy(asc(questionsTable.order), asc(questionsTable.id)).all());
});

router.post('/exams/:examId/questions', requireAdmin, (req, res) => {
  const examId = parseInt(String(req.params.examId), 10);
  const { text, options, correctOption, order = 0, imagePath = null } = req.body ?? {};
  if (!text?.trim() || !Array.isArray(options) || options.length < 2) { res.status(400).json({ error: 'text and options (min 2) are required' }); return; }
  if (imagePath !== null && (typeof imagePath !== 'string' || !/^\/objects\/uploads\/[a-zA-Z0-9-]+\.(png|jpg|webp|gif)$/.test(imagePath))) { res.status(400).json({ error: 'Invalid diagram image path' }); return; }
  const [q] = getDb().insert(questionsTable).values({ examId, text: text.trim(), options, correctOption: Number(correctOption), order: Number(order), imagePath }).returning().all();
  res.status(201).json(q);
});

router.post('/exams/:examId/questions/bulk', requireAdmin, (req, res) => {
  const examId = parseInt(String(req.params.examId), 10);
  const questions: unknown[] = Array.isArray(req.body?.questions) ? req.body.questions : [];
  if (!questions.length) { res.status(400).json({ error: 'questions array is required' }); return; }
  if (questions.length > 200) { res.status(400).json({ error: 'Max 200 questions per import' }); return; }

  const db = getDb();
  const existing = db.select().from(questionsTable).where(eq(questionsTable.examId, examId)).all();
  let startOrder = existing.length;

  const rows = [];
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i] as any;
    if (!q.text?.trim() || !Array.isArray(q.options) || q.options.length < 2) { res.status(400).json({ error: `Question ${i + 1}: invalid format` }); return; }
    if (typeof q.correctOption !== 'number' || q.correctOption < 0 || q.correctOption >= q.options.length) { res.status(400).json({ error: `Question ${i + 1}: correctOption out of range` }); return; }
    rows.push({ examId, text: q.text.trim(), options: q.options, correctOption: q.correctOption, order: startOrder + i });
  }

  const inserted = db.insert(questionsTable).values(rows).returning().all();
  res.status(201).json({ imported: inserted.length, questions: inserted });
});

router.patch('/questions/:id', requireAdmin, (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const { text, options, correctOption } = req.body ?? {};
  const update: Record<string, unknown> = {};
  if (text !== undefined) update.text = text;
  if (options !== undefined) update.options = options;
  if (correctOption !== undefined) update.correctOption = correctOption;
  if (req.body?.imagePath !== undefined) {
    if (req.body.imagePath !== null && (typeof req.body.imagePath !== 'string' || !/^\/objects\/uploads\/[a-zA-Z0-9-]+\.(png|jpg|webp|gif)$/.test(req.body.imagePath))) { res.status(400).json({ error: 'Invalid diagram image path' }); return; }
    update.imagePath = req.body.imagePath;
  }
  const [q] = getDb().update(questionsTable).set(update).where(eq(questionsTable.id, id)).returning().all();
  if (!q) { res.status(404).json({ error: 'Question not found' }); return; }
  res.json(q);
});

router.delete('/questions/:id', requireAdmin, (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const [q] = getDb().delete(questionsTable).where(eq(questionsTable.id, id)).returning().all();
  if (!q) { res.status(404).json({ error: 'Question not found' }); return; }
  res.json({ message: 'Question deleted' });
});

export default router;
