import { Router } from 'express';
import { eq, asc } from 'drizzle-orm';
import { getDb } from '../db';
import { resultsTable, examsTable, subjectsTable, usersTable, questionsTable, savedAnswersTable } from '../schema';
import { requireAuth, requireAdmin } from '../auth';

const router = Router();

function buildResult(result: typeof resultsTable.$inferSelect) {
  const db = getDb();
  const exam = db.select().from(examsTable).where(eq(examsTable.id, result.examId)).get();
  const subject = exam ? db.select().from(subjectsTable).where(eq(subjectsTable.id, exam.subjectId)).get() : null;
  const student = db.select().from(usersTable).where(eq(usersTable.id, result.studentId)).get();
  return {
    id: result.id, attemptId: result.attemptId, examId: result.examId,
    examTitle: exam?.title ?? '', subjectName: subject?.name ?? '',
    studentId: result.studentId, studentName: student?.name ?? '',
    score: result.score, totalQuestions: result.totalQuestions,
    percentage: result.percentage, passed: result.passed, submittedAt: result.submittedAt,
  };
}

router.get('/results', requireAuth, (req, res) => {
  const user = (req as any).user;
  const results = getDb().select().from(resultsTable).where(eq(resultsTable.studentId, user.id)).orderBy(asc(resultsTable.submittedAt)).all();
  res.json(results.map(buildResult));
});

router.get('/results/:id', requireAuth, (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  const user = (req as any).user;
  const db = getDb();
  const result = db.select().from(resultsTable).where(eq(resultsTable.id, id)).get();
  if (!result) { res.status(404).json({ error: 'Result not found' }); return; }
  if (user.role !== 'admin' && result.studentId !== user.id) { res.status(403).json({ error: 'Forbidden' }); return; }

  const base = buildResult(result);
  const questions = db.select().from(questionsTable).where(eq(questionsTable.examId, result.examId)).orderBy(asc(questionsTable.order), asc(questionsTable.id)).all();
  const savedAnswers = db.select().from(savedAnswersTable).where(eq(savedAnswersTable.attemptId, result.attemptId)).all();
  const answerMap = new Map(savedAnswers.map(a => [a.questionId, a.selectedOption]));

  const questionReview = questions.map(q => {
    const selected = answerMap.has(q.id) ? answerMap.get(q.id)! : null;
    return { questionId: q.id, text: q.text, options: q.options, correctOption: q.correctOption, selectedOption: selected, isCorrect: selected !== null && selected === q.correctOption, imagePath: q.imagePath };
  });

  res.json({ ...base, questionReview });
});

router.get('/admin/results', requireAdmin, (_req, res) => {
  const results = getDb().select().from(resultsTable).orderBy(asc(resultsTable.submittedAt)).all();
  res.json(results.map(buildResult));
});

export default router;
