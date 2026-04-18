import { Router } from "express";
import {
  approveMinorActivity,
  createMinor,
  deleteMinor,
  getMinorDetail,
  getMinorsByParent,
  updateMinor,
} from "../controllers/minors.controller";
import {
  getMinorActivity,
  getMinorFriends,
  getMinorProgress,
  getMinorStats,
  getMinorTimeUsage,
} from "../controllers/minorsApi.controller";
import { requireAuthenticated, requireParent } from "../middlewares/rbac.middleware";

export const minorsRouter = Router();
minorsRouter.post("/parents/:parentId/minors", requireParent, createMinor);
minorsRouter.get("/parents/:parentId/minors", requireParent, getMinorsByParent);
minorsRouter.get("/parents/:parentId/minors/:minorId", requireParent, getMinorDetail);
minorsRouter.get("/minors/:minorId/progress", requireAuthenticated, getMinorProgress);
minorsRouter.get("/minors/:minorId/activity", requireAuthenticated, getMinorActivity);
minorsRouter.get("/minors/:minorId/stats", requireAuthenticated, getMinorStats);
minorsRouter.get("/minors/:minorId/friends", requireAuthenticated, getMinorFriends);
minorsRouter.get("/minors/:minorId/time-usage", requireAuthenticated, getMinorTimeUsage);
minorsRouter.get("/minors/:minorId", requireAuthenticated, getMinorDetail);
minorsRouter.put("/minors/:minorId", requireParent, updateMinor);
minorsRouter.delete("/minors/:minorId", requireParent, deleteMinor);
minorsRouter.patch("/minors/:minorId/approve", requireParent, approveMinorActivity);
