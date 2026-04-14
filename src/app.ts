import cors from "cors";
import express from "express";
import { env } from "./config/env";
import { APP_TAGLINE } from "./lib/brand";
import { securityHeadersMiddleware } from "./middlewares/helmet.middleware";
import { achievementRouter } from "./routes/achievement.routes";
import { authRouter } from "./routes/auth.routes";
import { friendRouter } from "./routes/friend.routes";
import { gameResultRouter } from "./routes/gameResult.routes";
import { leaderboardRouter } from "./routes/leaderboard.routes";
import { requireAuth } from "./middlewares/auth.middleware";
import { requireApprovedChildAccount } from "./middlewares/childAccountApproved.middleware";
import { apiGeneralLimiter, authenticatedUserRateLimiter } from "./middlewares/rateLimit.middleware";
import { postRouter } from "./routes/post.routes";
import { reactionRouter } from "./routes/reaction.routes";
import { userAchievementRouter } from "./routes/userAchievement.routes";
import { apiRouter } from "./routes";

export function createApp() {
  const app = express();

  if (env.trustProxy) {
    app.set("trust proxy", 1);
  }

  app.use(securityHeadersMiddleware);
  app.use(cors());
  app.use(express.json({ limit: "512kb" }));

  app.get("/", (_req, res) => {
    res.json({
      message: "EduPlay API",
      tagline: APP_TAGLINE,
      docs: "/api/health",
    });
  });

  /** Mismo limitador por IP en prefijos usados por la app (comparten contador `api:<ip>`). */
  app.use("/api", apiGeneralLimiter);
  app.use("/friends", apiGeneralLimiter);
  app.use("/posts", apiGeneralLimiter);
  app.use("/reactions", apiGeneralLimiter);
  app.use("/game-results", apiGeneralLimiter);
  app.use("/leaderboard", apiGeneralLimiter);
  app.use("/achievements", apiGeneralLimiter);
  app.use("/user-achievements", apiGeneralLimiter);

  app.use("/auth", authRouter);
  app.use(requireAuth);
  app.use(requireApprovedChildAccount);
  app.use(authenticatedUserRateLimiter);

  app.use("/achievements", achievementRouter);
  app.use("/friends", friendRouter);
  app.use("/game-results", gameResultRouter);
  app.use("/leaderboard", leaderboardRouter);
  app.use("/posts", postRouter);
  app.use("/reactions", reactionRouter);
  app.use("/user-achievements", userAchievementRouter);
  app.use("/api", apiRouter);

  return app;
}
