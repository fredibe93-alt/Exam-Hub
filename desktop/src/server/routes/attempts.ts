import { Router } from 'express';
import { eq, and, asc } from 'drizzle-orm';
import { getDb } from '../db';
import { attemptsTable, examsTable, questionsTable, savedAnswersTable, resultsTable } from '../schema';
import { requireAuth } from '../auth';

const router = Router();

router.post('/exams/:examId/attempts', requireAuth, (req, res) => {
  const examId = parseInt(String(req.params.examId), 10);
  const user = (req as any).user;
  const db = getDb();

  const exam = db.select().from(examsTable).where(eq(examsTable.id, examId)).get();
  if (!exam) { res.status(404).json({ error: 'Exam not found' }); return; }

  const existing = db.select().from(attemptsTable).where(and(eq(attemptsTable.examId, examId), eq(attemptsTable.studentId, user.id), eq(attemptsTable.status, 'in_progress'))).get();
  if (existing) {
    const elapsed = Math.floor((Date.now() - new Date(existing.startedAt).getTime()) / 1000);
    const remaining = Math.max(0, exam.durationMinutes * 60 - elapsed);
    res.status(201).json({ id: existing.id, examId: existing.examId, examTitle: exam.title, studentId: existing.studentId, status: existing.status, startedAt: existing.startedAt, submittedAt: existing.submittedAt ?? null, timeRemainingSeconds: remaining });
    return;
  }

  const [attempt] = db.insert(attemptsTable).values({ examId: exam.id, studentId: user.id, status: 'in_progress' }).returning().all();
  res.status(201).json({ id: attempt.id, examId: attempt.examId, examTitle: exam.title, studentId: attempt.studentId, status: attempt.status, startedAt: attempt.startedAt, submittedAt: attempt.submittedAt ?? null, timeRemainingSeconds: exam.durationMinutes * 60 });
});

router.get('/attempts/:id', requireAuth, (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const user = (req as any).user;
  const db = getDb();

  const attempt = db.select().from(attemptsTable).where(eq(attemptsTable.id, id)).get();
  if (!attempt) { res.status(404).json({ error: 'Attempt not found' }); return; }
  if (user.role !== 'admin' && attempt.studentId !== user.id) { res.status(403).json({ error: 'Forbidden' }); return; }

  const exam = db.select().from(examsTable).where(eq(examsTable.id, attempt.examId)).get();
  if (!exam) { res.status(404).json({ error: 'Exam not found' }); return; }

  const questions = db.select().from(questionsTable).where(eq(questionsTable.examId, exam.id)).orderBy(asc(questionsTable.order), asc(questionsTable.id)).all();
  const savedAnswers = db.select().from(savedAnswersTable).where(eq(savedAnswersTable.attemptId, attempt.id)).all();
  const answersMap: Record<string, number> = {};
  for (const a of savedAnswers) answersMap[String(a.questionId)] = a.selectedOption;

  const elapsed = Math.floor((Date.now() - new Date(attempt.startedAt).getTime()) / 1000);
  const remaining = Math.max(0, exam.durationMinutes * 60 - elapsed);

  res.json({
    id: attempt.id, examId: attempt.examId, examTitle: exam.title, durationMinutes: exam.durationMinutes,
    studentId: attempt.studentId, status: attempt.status, startedAt: attempt.startedAt,
    submittedAt: attempt.submittedAt ?? null, timeRemainingSeconds: remaining,
    questions: questions.map(q => ({ id: q.id, text: q.text, options: q.options, order: q.order, imagePath: q.imagePath })),
    savedAnswers: answersMap,
  });
});

router.patch('/attempts/:id/answers', requireAuth, (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const user = (req as any).user;
  const db = getDb();

  const attempt = db.select().from(attemptsTable).where(eq(attemptsTable.id, id)).get();
  if (!attempt || attempt.studentId !== user.id) { res.status(404).json({ error: 'Attempt not found' }); return; }
  if (attempt.status !== 'in_progress') { res.status(400).json({ error: 'Attempt already submitted' }); return; }

  const answers = req.body?.answers ?? {};
  for (const [qIdStr, selectedOption] of Object.entries(answers)) {
    const questionId = parseInt(qIdStr, 10);
    const existing = db.select().from(savedAnswersTable).where(and(eq(savedAnswersTable.attemptId, attempt.id), eq(savedAnswersTable.questionId, questionId))).get();
    if (existing) {
      db.update(savedAnswersTable).set({ selectedOption: Number(selectedOption), savedAt: new Date().toISOString() }).where(eq(savedAnswersTable.id, existing.id)).run();
    } else {
      db.insert(savedAnswersTable).values({ attemptId: attempt.id, questionId, selectedOption: Number(selectedOption) }).run();
    }
  }
  res.json({ message: 'Answers saved' });
});

router.post('/attempts/:id/submit', requireAuth, (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const user = (req as any).user;
  const db = getDb();

  const attempt = db.select().from(attemptsTable).where(eq(attemptsTable.id, id)).get();
  if (!attempt || attempt.studentId !== user.id) { res.status(404).json({ error: 'Attempt not found' }); return; }

  if (attempt.status !== 'in_progress') {
    const result = db.select().from(resultsTable).where(eq(resultsTable.attemptId, attempt.id)).get();
    if (result) {
      const exam = db.select().from(examsTable).where(eq(examsTable.id, attempt.examId)).get();
      res.json({ id: result.id, attemptId: result.attemptId, examId: result.examId, examTitle: exam?.title ?? '', subjectName: '', studentId: result.studentId, studentName: user.name, score: result.score, totalQuestions: result.totalQuestions, percentage: result.percentage, passed: result.passed, submittedAt: result.submittedAt });
      return;
    }
    res.status(400).json({ error: 'Attempt already submitted' }); return;
  }

  const exam = db.select().from(examsTable).where(eq(examsTable.id, attempt.examId)).get();
  if (!exam) { res.status(404).json({ error: 'Exam not found' }); return; }

  const questions = db.select().from(questionsTable).where(eq(questionsTable.examId, exam.id)).all();
  const savedAnswers = db.select().from(savedAnswersTable).where(eq(savedAnswersTable.attemptId, attempt.id)).all();
  const answerMap = new Map(savedAnswers.map(a => [a.questionId, a.selectedOption]));

  let score = 0;
  for (const q of questions) if (answerMap.get(q.id) === q.correctOption) score++;

  const totalQuestions = questions.length;
  const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 1000) / 10 : 0;
  const passed = percentage >= exam.passingScore;
  const submittedAt = new Date().toISOString();

  db.update(attemptsTable).set({ status: 'submitted', submittedAt }).where(eq(attemptsTable.id, attempt.id)).run();
  const [result] = db.insert(resultsTable).values({ attemptId: attempt.id, studentId: user.id, examId: exam.id, score, totalQuestions, percentage, passed, submittedAt }).returning().all();

  res.json({ id: result.id, attemptId: result.attemptId, examId: result.examId, examTitle: exam.title, subjectName: '', studentId: result.studentId, studentName: user.name, score: result.score, totalQuestions: result.totalQuestions, percentage: result.percentage, passed: result.passed, submittedAt: result.submittedAt });
});

export default router;
