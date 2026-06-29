import { createHash } from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { eq } from 'drizzle-orm';
import { getDb } from './db';
import { usersTable } from './schema';

const SALT = 'cbt_salt_2024';

export function hashPassword(password: string): string {
  return createHash('sha256').update(password + SALT).digest('hex');
}

export function createToken(userId: number, role: string, name: string): string {
  return Buffer.from(JSON.stringify({ id: userId, role, name, ts: Date.now() })).toString('base64');
}

export function parseToken(token: string): { id: number; role: string; name: string } | null {
  try {
    const data = JSON.parse(Buffer.from(token, 'base64').toString('utf8'));
    if (typeof data.id !== 'number' || !data.role) return null;
    return data;
  } catch { return null; }
}

function extractToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) { res.status(401).json({ error: 'Unauthorized' }); return; }
  const payload = parseToken(token);
  if (!payload) { res.status(401).json({ error: 'Invalid token' }); return; }
  const db = getDb();
  const user = db.select().from(usersTable).where(eq(usersTable.id, payload.id)).get();
  if (!user) { res.status(401).json({ error: 'User not found' }); return; }
  (req as any).user = user;
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  requireAuth(req, res, () => {
    const user = (req as any).user;
    if (user?.role !== 'admin') { res.status(403).json({ error: 'Forbidden' }); return; }
    next();
  });
}
