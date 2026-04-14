import { Router } from "express";
import { getRandomVisualQuiz } from "../controllers/visualQuestion.controller";
import { requireChild } from "../middlewares/rbac.middleware";

export const visualQuestionRouter = Router();

visualQuestionRouter.use(requireChild);

visualQuestionRouter.get("/", getRandomVisualQuiz);
