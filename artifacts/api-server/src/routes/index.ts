import { Router, type IRouter } from "express";
import healthRouter from "./health";
import studySessionsRouter from "./study-sessions";
import trackerRouter from "./tracker";

const router: IRouter = Router();

router.use(healthRouter);
router.use(studySessionsRouter);
router.use(trackerRouter);

export default router;
