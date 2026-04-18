import { Router } from "express";
import {
  getChallengesDaily,
  getChallengesNotifications,
  getChallengesOverview,
  getChallengesSpecials,
  getChallengesWeekly,
  postChallengeProgress,
} from "../controllers/challenges.controller";
import { getTodayDailyMissions, postGenerateDailyMissions } from "../controllers/dailyMission.controller";
import { getUserOnboardingStatus, postUserOnboarding } from "../controllers/onboarding.controller";
import { getUserRecommendations } from "../controllers/recommendations.controller";
import { getUserScreenTime, postUserScreenTimeTick } from "../controllers/screenTime.controller";
import {
  deleteMyAccount,
  getMyFullProfile,
  putMyAvatar,
  putMyProfile,
} from "../controllers/usersProfile.controller";
import { requireAuthenticated, requireChild, requireParent } from "../middlewares/rbac.middleware";
import { authWriteLimiter } from "../middlewares/rateLimit.middleware";
import { createUser, getUserProfile, listUsers, patchUserPreferences, postPushToken } from "../controllers/user.controller";

export const userRouter = Router();

userRouter.get("/profile", requireAuthenticated, getMyFullProfile);
userRouter.put("/profile", requireAuthenticated, authWriteLimiter, putMyProfile);
userRouter.put("/avatar", requireAuthenticated, authWriteLimiter, putMyAvatar);
userRouter.delete("/account", requireAuthenticated, authWriteLimiter, deleteMyAccount);

/** Tutor: alta y listado de menores. */
userRouter.post("/", requireParent, createUser);
userRouter.get("/", requireParent, listUsers);

/** Tutor o menor: el controlador valida que el menor sea el propio usuario o hijo del tutor. */
userRouter.get("/:id/onboarding", requireAuthenticated, getUserOnboardingStatus);
userRouter.post("/:id/onboarding", requireAuthenticated, postUserOnboarding);

/** Solo menor (app del hijo). */
userRouter.post("/:id/push-token", requireChild, postPushToken);
userRouter.patch("/:id/preferences", requireChild, patchUserPreferences);
userRouter.get("/:id/screen-time", requireChild, getUserScreenTime);
userRouter.post("/:id/screen-time/tick", requireChild, postUserScreenTimeTick);
userRouter.get("/:id/recommendations", requireChild, getUserRecommendations);
userRouter.get("/:id/profile", requireChild, getUserProfile);
userRouter.get("/:id/daily-missions/today", requireChild, getTodayDailyMissions);
userRouter.post("/:id/daily-missions/generate", requireChild, postGenerateDailyMissions);
userRouter.get("/:id/challenges", requireChild, getChallengesOverview);
userRouter.get("/:id/challenges/daily", requireChild, getChallengesDaily);
userRouter.get("/:id/challenges/weekly", requireChild, getChallengesWeekly);
userRouter.get("/:id/challenges/specials", requireChild, getChallengesSpecials);
userRouter.get("/:id/challenges/notifications", requireChild, getChallengesNotifications);
userRouter.post("/:id/challenges/progress", requireChild, postChallengeProgress);
