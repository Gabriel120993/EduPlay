import { Router } from "express";
import { createGameResult } from "../controllers/gameResult.controller";
import { requireChild } from "../middlewares/rbac.middleware";

export const gameResultRouter = Router();

gameResultRouter.use(requireChild);

gameResultRouter.post("/", createGameResult);
