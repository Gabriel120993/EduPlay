import { Router } from "express";
import { getLeaderboard } from "../controllers/leaderboard.controller";
import { requireChild } from "../middlewares/rbac.middleware";

export const leaderboardRouter = Router();

leaderboardRouter.use(requireChild);

leaderboardRouter.get("/", getLeaderboard);
