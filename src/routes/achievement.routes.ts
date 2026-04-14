import { Router } from "express";
import { listAchievements } from "../controllers/achievement.controller";
import { requireChild } from "../middlewares/rbac.middleware";

export const achievementRouter = Router();

achievementRouter.use(requireChild);

achievementRouter.get("/", listAchievements);
