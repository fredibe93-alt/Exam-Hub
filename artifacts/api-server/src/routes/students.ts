import { Router, type IRouter } from "express";
import { db, usersTable, attemptsTable, resultsTable } from "@workspace/db";
import { eq, and, count } from "drizzle-orm";
import { requireAdmin } from "../lib/auth";
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
