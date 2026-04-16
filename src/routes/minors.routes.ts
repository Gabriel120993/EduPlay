import { Router } from "express";
import {
  approveMinorActivity,
  createMinor,
  deleteMinor,
  getMinorDetail,
  getMinorsByParent,
  updateMinor,
} from "../controllers/minors.controller";
import { requireAuthenticated, requireParent } from "../middlewares/rbac.middleware";

export const minorsRouter = Router();
minorsRouter.post("/parents/:parentId/minors", requireParent, createMinor);
minorsRouter.get("/parents/:parentId/minors", requireParent, getMinorsByParent);
minorsRouter.get("/minors/:minorId", requireAuthenticated, getMinorDetail);
minorsRouter.put("/minors/:minorId", requireParent, updateMinor);
minorsRouter.delete("/minors/:minorId", requireParent, deleteMinor);
minorsRouter.patch("/minors/:minorId/approve", requireParent, approveMinorActivity);
