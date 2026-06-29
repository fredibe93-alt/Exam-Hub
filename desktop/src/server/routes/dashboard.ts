import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { getDb } from '../db';
import { usersTable, examsTable, resultsTable, subjectsTable } from '../schema';
import { requireAdmin, requireAuth } from '../auth';

const router = Router();

router.get('/dashboard', requireAuth, (req, res) => {
  const user = (req as any).user;
  const db = getDb();
  const myResults = db.select().from(resultsTable).where(eq(resultsTable.studentId, user.id)).all();
  const allExams = db.select().from(examsTable).where(eq(examsTable.isActive, true)).all();
  const completedIds = new Set(myResults.map(r => r.examId));
  const avgScore = myResults.length > 0 ? myResults.reduce((a, r) => a + r.percentage, 0) / myResults.length : 0;
  res.json({
    totalExams: allExams.length,
    completedExams: completedIds.size,
    passedExams: myResults.filter(r => r.passed).length,
    avgScore: Math.round(avgScore * 10) / 10,
    recentResults: myResults.slice(-5).reverse().map(r => ({ id: r.id, examId: r.examId, score: r.score, totalQuestions: r.totalQuestions, percentage: r.percentage, passed: r.passed, submittedAt: r.submittedAt })),
    availableExams: allExams.filter(e => !completedIds.has(e.id)).slice(0, 6).map(e => ({ id: e.id, title: e.title, subjectId: e.subjectId, durationMinutes: e.durationMinutes, passingScore: e.passingScore })),
  });
});

router.get('/admin/dashboard', requireAdmin, (_req, res) => {
  const db = getDb();
  const students = db.select().from(usersTable).where(eq(usersTable.role, 'student')).all();
  const exams = db.select().from(examsTable).all();
  const subjects = db.select().from(subjectsTable).all();
  const results = db.select().from(resultsTable).all();

  const passRateByExam = new Map<number, { passed: number; total: number }>();
  for (const r of results) {
    const cur = passRateByExam.get(r.examId) ?? { passed: 0, total: 0 };
    cur.total++;
    if (r.passed) cur.passed++;
    passRateByExam.set(r.examId, cur);
  }

  res.json({
    totalStudents: students.length,
    totalExams: exams.length,
    totalSubjects: subjects.length,
    totalAttempts: results.length,
    recentResults: results.slice(-10).reverse().map(r => {
      const exam = exams.find(e => e.id === r.examId);
      const student = students.find(s => s.id === r.studentId);
      return { id: r.id, examTitle: exam?.title ?? '', studentName: student?.name ?? '', score: r.score, totalQuestions: r.totalQuestions, percentage: r.percentage, passed: r.passed, submittedAt: r.submittedAt };
    }),
    examPassRates: exams.map(e => {
      const stats = passRateByExam.get(e.id) ?? { passed: 0, total: 0 };
      return { examId: e.id, examTitle: e.title, passRate: stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0, totalAttempts: stats.total };
    }),
  });
});

export default router;
