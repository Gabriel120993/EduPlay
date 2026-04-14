import { Router } from "express";
import { completeQuiz, getRandomQuiz } from "../controllers/quiz.controller";
import { requireChild } from "../middlewares/rbac.middleware";

export const quizRouter = Router();

quizRouter.use(requireChild);

quizRouter.get("/", getRandomQuiz);
quizRouter.post("/complete", completeQuiz);
