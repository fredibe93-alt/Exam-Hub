import { eq } from 'drizzle-orm';
import { getDb } from './db';
import { usersTable } from './schema';
import { hashPassword } from './auth';

export function seedDb(): void {
  const db = getDb();
  const existing = db.select().from(usersTable).where(eq(usersTable.email, 'admin@examhub.com')).get();
  if (!existing) {
    db.insert(usersTable).values({
      name: 'Administrator',
      email: 'admin@examhub.com',
      passwordHash: hashPassword('admin123'),
      role: 'admin',
    }).run();
    console.log('[ExamHub] Default admin created: admin@examhub.com / admin123');
  }
}
