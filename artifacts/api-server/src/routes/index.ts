import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import subjectsRouter from "./subjects";
import examsRouter from "./exams";
import questionsRouter from "./questions";
import attemptsRouter from "./attempts";
import resultsRouter from "./results";
import studentsRouter from "./students";
import dashboardRouter from "./dashboard";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(subjectsRouter);
router.use(examsRouter);
router.use(questionsRouter);
router.use(attemptsRouter);
router.use(resultsRouter);
router.use(studentsRouter);
router.use(dashboardRouter);

export default router;
