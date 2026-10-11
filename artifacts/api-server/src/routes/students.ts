import { Router, type IRouter } from "express";
import { db, usersTable, attemptsTable, resultsTable, examsTable, subjectsTable } from "@workspace/db";
import { eq, and, count, desc } from "drizzle-orm";
import { requireAdmin, requireAuth } from "../lib/auth";
import { GetStudentParams, DeleteStudentParams } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/students", requireAdmin, async (_req, res): Promise<void> => {
  const students = await db.select().from(usersTable).where(eq(usersTable.role, "student"));
  const attemptCounts = await db.select({ studentId: attemptsTable.studentId, cnt: count() }).from(attemptsTable).groupBy(attemptsTable.studentId);
  const passedCounts = await db.select({ studentId: resultsTable.studentId, cnt: count() }).from(resultsTable).where(eq(resultsTable.passed, true)).groupBy(resultsTable.studentId);
  const attMap = new Map(attemptCounts.map((a) => [a.studentId, Number(a.cnt)]));
  const passMap = new Map(passedCounts.map((p) => [p.studentId, Number(p.cnt)]));
  res.json(students.map((s) => ({
    id: s.id,
    name: s.name,
    email: s.email,
    createdAt: s.createdAt,
    totalAttempts: attMap.get(s.id) ?? 0,
    passedCount: passMap.get(s.id) ?? 0,
  })));
});

router.get("/students/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = GetStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [student] = await db.select().from(usersTable).where(and(eq(usersTable.id, params.data.id), eq(usersTable.role, "student")));
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }
  const [attCount] = await db.select({ cnt: count() }).from(attemptsTable).where(eq(attemptsTable.studentId, student.id));
  const [passCount] = await db.select({ cnt: count() }).from(resultsTable).where(and(eq(resultsTable.studentId, student.id), eq(resultsTable.passed, true)));
  res.json({
    id: student.id,
    name: student.name,
    email: student.email,
    createdAt: student.createdAt,
    totalAttempts: Number(attCount?.cnt ?? 0),
    passedCount: Number(passCount?.cnt ?? 0),
  });
});

async function buildReportCard(studentId: number) {
  const [student] = await db.select().from(usersTable)
    .where(and(eq(usersTable.id, studentId), eq(usersTable.role, "student")));
  if (!student) return null;
  const rows = await db
    .select({
      score: resultsTable.score,
      totalQuestions: resultsTable.totalQuestions,
      percentage: resultsTable.percentage,
      passed: resultsTable.passed,
      submittedAt: resultsTable.submittedAt,
      examId: examsTable.id,
      examTitle: examsTable.title,
      assessmentType: examsTable.assessmentType,
      subjectId: subjectsTable.id,
      subjectName: subjectsTable.name,
    })
    .from(resultsTable)
    .innerJoin(examsTable, eq(resultsTable.examId, examsTable.id))
    .innerJoin(subjectsTable, eq(examsTable.subjectId, subjectsTable.id))
    .where(eq(resultsTable.studentId, studentId))
    .orderBy(subjectsTable.name, examsTable.title, desc(resultsTable.submittedAt));

  // Deduplicate: keep only the best result per exam
  const bestByExam = new Map<number, typeof rows[number]>();
  for (const row of rows) {
    const prev = bestByExam.get(row.examId);
    if (!prev || row.percentage > prev.percentage) bestByExam.set(row.examId, row);
  }
  const best = Array.from(bestByExam.values()).sort((a, b) =>
    a.subjectName.localeCompare(b.subjectName) || a.examTitle.localeCompare(b.examTitle)
  );

  function grade(pct: number): string {
    if (pct >= 70) return "A";
    if (pct >= 60) return "B";
    if (pct >= 50) return "C";
    if (pct >= 40) return "D";
    return "F";
  }

  function total(exams: { score: number; totalQuestions: number }[]) {
    const totalScore = exams.reduce((sum, exam) => sum + exam.score, 0);
    const totalQuestions = exams.reduce((sum, exam) => sum + exam.totalQuestions, 0);
    const percentage = totalQuestions ? (totalScore / totalQuestions) * 100 : 0;
    return {
      totalScore,
      totalQuestions,
      percentage: Number(percentage.toFixed(1)),
      grade: grade(percentage),
    };
  }

  const subjectMap = new Map<number, {
    subjectId: number; subjectName: string;
    exams: { examId: number; examTitle: string; assessmentType: "ca1" | "ca2" | "final"; score: number; totalQuestions: number; percentage: number; passed: boolean; grade: string; submittedAt: Date }[];
  }>();
  for (const row of best) {
    if (!subjectMap.has(row.subjectId)) {
      subjectMap.set(row.subjectId, { subjectId: row.subjectId, subjectName: row.subjectName, exams: [] });
    }
    subjectMap.get(row.subjectId)!.exams.push({
      examId: row.examId,
      examTitle: row.examTitle,
      assessmentType: row.assessmentType,
      score: row.score,
      totalQuestions: row.totalQuestions,
      percentage: Number(row.percentage.toFixed(1)),
      passed: row.passed,
      grade: grade(row.percentage),
      submittedAt: row.submittedAt,
    });
  }

  const subjects = Array.from(subjectMap.values()).map((s) => {
    const allTotal = total(s.exams);
    return {
      ...s,
      assessmentTotals: {
        ca1: total(s.exams.filter((e) => e.assessmentType === "ca1")),
        ca2: total(s.exams.filter((e) => e.assessmentType === "ca2")),
        final: total(s.exams.filter((e) => e.assessmentType === "final")),
      },
      ...allTotal,
    };
  });

  const grandTotalScore = subjects.reduce((a, s) => a + s.totalScore, 0);
  const grandTotalQuestions = subjects.reduce((a, s) => a + s.totalQuestions, 0);
  const grandPct = grandTotalQuestions > 0 ? (grandTotalScore / grandTotalQuestions) * 100 : 0;

  return {
    student: { id: student.id, name: student.name, email: student.email },
    generatedAt: new Date().toISOString(),
    subjects,
    grandTotal: {
      totalScore: grandTotalScore,
      totalQuestions: grandTotalQuestions,
      percentage: Number(grandPct.toFixed(1)),
      grade: grade(grandPct),
      passed: grandPct >= 40,
    },
  };
}

router.get("/students/me/report-card", requireAuth, async (req, res): Promise<void> => {
  const user = (req as any).user;
  const report = await buildReportCard(user.id);
  if (!report) { res.status(404).json({ error: "Student not found" }); return; }
  res.json(report);
});

router.get("/students/:id/report-card", requireAdmin, async (req, res): Promise<void> => {
  const studentId = parseInt(String(req.params.id), 10);
  if (isNaN(studentId)) { res.status(400).json({ error: "Invalid student ID" }); return; }
  const report = await buildReportCard(studentId);
  if (!report) { res.status(404).json({ error: "Student not found" }); return; }
  res.json(report);
});

router.delete("/students/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = DeleteStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [student] = await db.delete(usersTable).where(and(eq(usersTable.id, params.data.id), eq(usersTable.role, "student"))).returning();
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }
  res.json({ message: "Student deleted" });
});

export default router;
