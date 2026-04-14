import { Router } from "express";

import { getAnalyticsSummary, getParentChildAnalytics, postAnalytics } from "../controllers/analytics.controller";
import { checkPremium } from "../middlewares/premium.middleware";
import { requireChild, requireParent } from "../middlewares/rbac.middleware";

export const analyticsRouter = Router();

analyticsRouter.get("/summary", requireParent, checkPremium, getAnalyticsSummary);
analyticsRouter.get("/parent/:parentId", requireParent, checkPremium, getParentChildAnalytics);
analyticsRouter.post("/", requireChild, postAnalytics);
