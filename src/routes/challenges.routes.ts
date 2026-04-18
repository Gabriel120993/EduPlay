import { Router } from "express";
import {
  getChallengesDailyRest,
  getChallengesMyProgress,
  getChallengesSpecialRest,
  getChallengesWeeklyRest,
  postChallengeClaim,
} from "../controllers/challengesApi.controller";
import { authWriteLimiter } from "../middlewares/rateLimit.middleware";
import { requireChild } from "../middlewares/rbac.middleware";

export const challengesRouter = Router();

challengesRouter.use(requireChild);

challengesRouter.get("/daily", getChallengesDailyRest);
challengesRouter.get("/weekly", getChallengesWeeklyRest);
challengesRouter.get("/special", getChallengesSpecialRest);
challengesRouter.get("/my-progress", getChallengesMyProgress);
challengesRouter.post("/:challengeId/claim", authWriteLimiter, postChallengeClaim);
