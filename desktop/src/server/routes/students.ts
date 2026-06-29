import { Router } from 'express';
import { eq, and } from 'drizzle-orm';
import { getDb } from '../db';
import { usersTable, attemptsTable, resultsTable, examsTable, subjectsTable } from '../schema';
import { requireAdmin } from '../auth';

const router = Router();

router.get('/students', requireAdmin, (_req, res) => {
  const db = getDb();
  const students = db.select().from(usersTable).where(eq(usersTable.role, 'student')).all();
  const attempts = db.select().from(attemptsTable).all();
  const passed = db.select().from(resultsTable).where(eq(resultsTable.passed, true)).all();
  const attMap = new Map<number, number>();
  for (const a of attempts) attMap.set(a.studentId, (attMap.get(a.studentId) ?? 0) + 1);
  const passMap = new Map<number, number>();
  for (const p of passed) passMap.set(p.studentId, (passMap.get(p.studentId) ?? 0) + 1);
  res.json(students.map(s => ({ id: s.id, name: s.name, email: s.email, createdAt: s.createdAt, totalAttempts: attMap.get(s.id) ?? 0, passedCount: passMap.get(s.id) ?? 0 })));
});

router.get('/students/:id', requireAdmin, (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const db = getDb();
  const student = db.select().from(usersTable).where(and(eq(usersTable.id, id), eq(usersTable.role, 'student'))).get();
  if (!student) { res.status(404).json({ error: 'Student not found' }); return; }
  const attempts = db.select().from(attemptsTable).where(eq(attemptsTable.studentId, id)).all();
  const passed = db.select().from(resultsTable).where(and(eq(resultsTable.studentId, id), eq(resultsTable.passed, true))).all();
  res.json({ id: student.id, name: student.name, email: student.email, createdAt: student.createdAt, totalAttempts: attempts.length, passedCount: passed.length });
});

router.get('/students/:id/report-card', requireAdmin, (req, res) => {
  const studentId = parseInt(String(req.params.id), 10);
  const db = getDb();
  const student = db.select().from(usersTable).where(and(eq(usersTable.id, studentId), eq(usersTable.role, 'student'))).get();
  if (!student) { res.status(404).json({ error: 'Student not found' }); return; }

  const allResults = db.select().from(resultsTable).where(eq(resultsTable.studentId, studentId)).all();
  const allExams = db.select().from(examsTable).all();
  const allSubjects = db.select().from(subjectsTable).all();
  const examMap = new Map(allExams.map(e => [e.id, e]));
  const subjectMap = new Map(allSubjects.map(s => [s.id, s]));

  function grade(pct: number) {
    if (pct >= 70) return 'A'; if (pct >= 60) return 'B';
    if (pct >= 50) return 'C'; if (pct >= 40) return 'D'; return 'F';
  }

  // Best result per exam
  const bestByExam = new Map<number, typeof allResults[number]>();
  for (const r of allResults) {
    const prev = bestByExam.get(r.examId);
    if (!prev || r.percentage > prev.percentage) bestByExam.set(r.examId, r);
  }

  const subjectGroups = new Map<number, { subjectId: number; subjectName: string; exams: any[] }>();
  for (const r of bestByExam.values()) {
    const exam = examMap.get(r.examId);
    if (!exam) continue;
    const subject = subjectMap.get(exam.subjectId);
    if (!subject) continue;
    if (!subjectGroups.has(subject.id)) subjectGroups.set(subject.id, { subjectId: subject.id, subjectName: subject.name, exams: [] });
    subjectGroups.get(subject.id)!.exams.push({ examId: r.examId, examTitle: exam.title, score: r.score, totalQuestions: r.totalQuestions, percentage: Number(r.percentage.toFixed(1)), passed: r.passed, grade: grade(r.percentage), submittedAt: r.submittedAt });
  }

  const subjects = Array.from(subjectGroups.values()).sort((a, b) => a.subjectName.localeCompare(b.subjectName)).map(s => {
    const total = s.exams.reduce((a: number, e: any) => a + e.score, 0);
    const totalQ = s.exams.reduce((a: number, e: any) => a + e.totalQuestions, 0);
    const pct = totalQ > 0 ? (total / totalQ) * 100 : 0;
    return { ...s, totalScore: total, totalQuestions: totalQ, percentage: Number(pct.toFixed(1)), grade: grade(pct) };
  });

  const grandScore = subjects.reduce((a, s) => a + s.totalScore, 0);
  const grandQ = subjects.reduce((a, s) => a + s.totalQuestions, 0);
  const grandPct = grandQ > 0 ? (grandScore / grandQ) * 100 : 0;

  res.json({
    student: { id: student.id, name: student.name, email: student.email },
    generatedAt: new Date().toISOString(),
    subjects,
    grandTotal: { totalScore: grandScore, totalQuestions: grandQ, percentage: Number(grandPct.toFixed(1)), grade: grade(grandPct), passed: grandPct >= 40 },
  });
});

router.delete('/students/:id', requireAdmin, (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const [s] = getDb().delete(usersTable).where(and(eq(usersTable.id, id), eq(usersTable.role, 'student'))).returning().all();
  if (!s) { res.status(404).json({ error: 'Student not found' }); return; }
  res.json({ message: 'Student deleted' });
});

export default router;
