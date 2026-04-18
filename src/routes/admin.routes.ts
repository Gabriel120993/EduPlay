import { Router } from "express";
import {
  adminCreateContent,
  adminDeleteContent,
  adminListContent,
  adminListReports,
  adminListUsers,
  adminPutUserStatus,
  adminResolveReport,
  adminStats,
  adminUpdateContent,
} from "../controllers/adminApi.controller";
import { requireAdminSecret } from "../middlewares/admin.middleware";
import { authWriteLimiter, strictLimiter } from "../middlewares/rateLimit.middleware";

export const adminRouter = Router();

adminRouter.use(strictLimiter);
adminRouter.use(requireAdminSecret);

adminRouter.get("/users", adminListUsers);
adminRouter.put("/users/:userId/status", authWriteLimiter, adminPutUserStatus);
adminRouter.get("/content", adminListContent);
adminRouter.post("/content", authWriteLimiter, adminCreateContent);
adminRouter.put("/content/:contentId", authWriteLimiter, adminUpdateContent);
adminRouter.delete("/content/:contentId", authWriteLimiter, adminDeleteContent);
adminRouter.get("/reports", adminListReports);
adminRouter.put("/reports/:reportId/resolve", authWriteLimiter, adminResolveReport);
adminRouter.get("/stats", adminStats);
