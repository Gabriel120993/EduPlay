import { Router } from "express";
import { postContentReport } from "../controllers/report.controller";
import { authWriteLimiter, contentReportUserLimiter } from "../middlewares/rateLimit.middleware";
import { requireChild } from "../middlewares/rbac.middleware";

export const reportRouter = Router();

reportRouter.use(requireChild);
reportRouter.post("/", contentReportUserLimiter, authWriteLimiter, postContentReport);
