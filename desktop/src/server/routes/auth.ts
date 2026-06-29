import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { getDb } from '../db';
import { usersTable } from '../schema';
import { hashPassword, createToken, requireAuth } from '../auth';

const router = Router();

router.post('/auth/register', (req, res) => {
  const { name, email, password } = req.body ?? {};
  if (!name || !email || !password) { res.status(400).json({ error: 'name, email and password are required' }); return; }
  const db = getDb();
  const existing = db.select().from(usersTable).where(eq(usersTable.email, email)).get();
  if (existing) { res.status(409).json({ error: 'Email already registered' }); return; }
  const [user] = db.insert(usersTable).values({ name, email, passwordHash: hashPassword(password), role: 'student' }).returning().all();
  const token = createToken(user.id, user.role, user.name);
  res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

router.post('/auth/login', (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) { res.status(400).json({ error: 'email and password are required' }); return; }
  const db = getDb();
  const user = db.select().from(usersTable).where(eq(usersTable.email, email)).get();
  if (!user || user.passwordHash !== hashPassword(password)) { res.status(401).json({ error: 'Invalid credentials' }); return; }
  const token = createToken(user.id, user.role, user.name);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

router.get('/auth/me', requireAuth, (req, res) => {
  const user = (req as any).user;
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
});

export default router;
