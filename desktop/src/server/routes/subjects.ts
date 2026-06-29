import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { getDb } from '../db';
import { subjectsTable } from '../schema';
import { requireAuth, requireAdmin } from '../auth';

const router = Router();

router.get('/subjects', requireAuth, (_req, res) => {
  res.json(getDb().select().from(subjectsTable).all());
});

router.post('/subjects', requireAdmin, (req, res) => {
  const { name, description = '' } = req.body ?? {};
  if (!name?.trim()) { res.status(400).json({ error: 'name is required' }); return; }
  const [s] = getDb().insert(subjectsTable).values({ name: name.trim(), description }).returning().all();
  res.status(201).json(s);
});

router.patch('/subjects/:id', requireAdmin, (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const { name, description } = req.body ?? {};
  const update: Record<string, unknown> = {};
  if (name !== undefined) update.name = name;
  if (description !== undefined) update.description = description;
  if (!Object.keys(update).length) { res.status(400).json({ error: 'Nothing to update' }); return; }
  const [s] = getDb().update(subjectsTable).set(update).where(eq(subjectsTable.id, id)).returning().all();
  if (!s) { res.status(404).json({ error: 'Subject not found' }); return; }
  res.json(s);
});

router.delete('/subjects/:id', requireAdmin, (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const [s] = getDb().delete(subjectsTable).where(eq(subjectsTable.id, id)).returning().all();
  if (!s) { res.status(404).json({ error: 'Subject not found' }); return; }
  res.json({ message: 'Subject deleted' });
});

export default router;
