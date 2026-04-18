import { Router } from "express";
import {
  getGameLeaderboard,
  getMiniGameDetail,
  getMyGameSessions,
  listMiniGames,
  postCreateGameSession,
  postFinishGameSession,
  putUpdateGameSession,
} from "../controllers/gamesApi.controller";
import { authWriteLimiter } from "../middlewares/rateLimit.middleware";
import { requireChild } from "../middlewares/rbac.middleware";

export const gamesRouter = Router();

gamesRouter.use(requireChild);

gamesRouter.get("/my-sessions", getMyGameSessions);
gamesRouter.get("/leaderboard/:gameId", getGameLeaderboard);
gamesRouter.get("/", listMiniGames);
gamesRouter.post("/:gameId/sessions", authWriteLimiter, postCreateGameSession);
gamesRouter.put("/sessions/:sessionId", authWriteLimiter, putUpdateGameSession);
gamesRouter.post("/sessions/:sessionId/finish", authWriteLimiter, postFinishGameSession);
gamesRouter.get("/:gameId", getMiniGameDetail);
