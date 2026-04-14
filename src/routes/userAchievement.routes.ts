import { Router } from "express";
import { createUserAchievement } from "../controllers/userAchievement.controller";
import { requireChild } from "../middlewares/rbac.middleware";

export const userAchievementRouter = Router();

userAchievementRouter.use(requireChild);

userAchievementRouter.post("/", createUserAchievement);
