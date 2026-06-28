import { Router, type IRouter } from "express";
import { db, usersTable, examsTable, subjectsTable, attemptsTable, resultsTable } from "@workspace/db";
import { eq, count, avg } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../lib/auth";

const router: IRouter = Router();

async function buildResult(result: typeof resultsTable.$inferSelect) {
  const [exam] = await db.select().from(examsTable).where(eq(examsTable.id, result.examId));
  const [subject] = exam ? await db.select().from(subjectsTable).where(eq(subjectsTable.id, exam.subjectId)) : [null];
  const [student] = await db.select().from(usersTable).where(eq(usersTable.id, result.studentId));
  return {
    id: result.id,
    attemptId: result.attemptId,
    examId: result.examId,
    examTitle: exam?.title ?? "",
    subjectName: subject?.name ?? "",
    studentId: result.studentId,
    studentName: student?.name ?? "",
    score: result.score,
    totalQuestions: result.totalQuestions,
    percentage: result.percentage,
    passed: result.passed,
    submittedAt: result.submittedAt,
  };
}

router.get("/dashboard/summary", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const allResults = await db.select().from(resultsTable).where(eq(resultsTable.studentId, user.id));
  const completedExams = allResults.length;
  const passedExams = allResults.filter((r) => r.passed).length;
  const failedExams = completedExams - passedExams;
  const averageScore = completedExams > 0
    ? Math.round((allResults.reduce((sum, r) => sum + r.percentage, 0) / completedExams) * 10) / 10
    : 0;
  const recentResults = allResults.slice(-5).reverse();
  const builtRecent = await Promise.all(recentResults.map(buildResult));
  const availableExams = await db.select().from(examsTable).where(eq(examsTable.isActive, true));
  const subjects = await db.select().from(subjectsTable);
  const subjectMap = new Map(subjects.map((s) => [s.id, s.name]));
  const availableWithSubject = availableExams.map((e) => ({
    ...e,
    subjectName: subjectMap.get(e.subjectId) ?? "",
    questionCount: 0,
  }));
  res.json({
    totalExams: availableExams.length,
    completedExams,
    passedExams,
    failedExams,
    averageScore,
    recentResults: builtRecent,
    availableExams: availableWithSubject,
  });
});

router.get("/admin/dashboard", requireAdmin, async (_req, res): Promise<void> => {
  const [studentCount] = await db.select({ cnt: count() }).from(usersTable).where(eq(usersTable.role, "student"));
  const [examCount] = await db.select({ cnt: count() }).from(examsTable);
  const [subjectCount] = await db.select({ cnt: count() }).from(subjectsTable);
  const [attemptCount] = await db.select({ cnt: count() }).from(attemptsTable);
  const allResults = await db.select().from(resultsTable);
  const passRate = allResults.length > 0
    ? Math.round((allResults.filter((r) => r.passed).length / allResults.length) * 1000) / 10
    : 0;
  const recentResults = allResults.slice(-10).reverse();
  const builtRecent = await Promise.all(recentResults.map(buildResult));
  const exams = await db.select().from(examsTable);
  const examStats = await Promise.all(exams.map(async (exam) => {
    const examResults = allResults.filter((r) => r.examId === exam.id);
    const attempts = examResults.length;
    const examPassRate = attempts > 0 ? Math.round((examResults.filter((r) => r.passed).length / attempts) * 1000) / 10 : 0;
    const examAvgScore = attempts > 0
      ? Math.round((examResults.reduce((sum, r) => sum + r.percentage, 0) / attempts) * 10) / 10
      : 0;
    return { examId: exam.id, examTitle: exam.title, attempts, passRate: examPassRate, averageScore: examAvgScore };
  }));
  res.json({
    totalStudents: Number(studentCount?.cnt ?? 0),
    totalExams: Number(examCount?.cnt ?? 0),
    totalSubjects: Number(subjectCount?.cnt ?? 0),
    totalAttempts: Number(attemptCount?.cnt ?? 0),
    passRate,
    recentResults: builtRecent,
    examStats,
  });
});

export default router;
