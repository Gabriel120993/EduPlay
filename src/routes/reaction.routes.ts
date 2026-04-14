import { Router } from "express";
import { createReaction } from "../controllers/reaction.controller";
import { requireChild } from "../middlewares/rbac.middleware";

export const reactionRouter = Router();

reactionRouter.use(requireChild);

reactionRouter.post("/", createReaction);
