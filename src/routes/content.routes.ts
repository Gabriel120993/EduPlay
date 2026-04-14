import { Router } from "express";
import {
  completeEducationalContent,
  getEducationalContentById,
  listEducationalContent,
} from "../controllers/content.controller";
import { requireChild } from "../middlewares/rbac.middleware";

export const contentRouter = Router();

contentRouter.use(requireChild);

contentRouter.get("/", listEducationalContent);
contentRouter.get("/:id", getEducationalContentById);
contentRouter.post("/:id/complete", completeEducationalContent);
