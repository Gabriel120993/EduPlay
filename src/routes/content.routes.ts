import { Router } from "express";
import {
  completeEducationalContent,
  getEducationalContentById,
  listEducationalContent,
} from "../controllers/content.controller";
import {
  getContentDetail,
  getRecommendedSimilar,
  listContentsByTopic,
  listContentsFiltered,
  listEducationalCategories,
  listSubjectsByCategory,
  listTopicsBySubject,
  postContentView,
  searchContent,
} from "../controllers/contentApi.controller";
import { requireChild } from "../middlewares/rbac.middleware";

export const contentRouter = Router();

contentRouter.use(requireChild);

contentRouter.get("/categories", listEducationalCategories);
contentRouter.get("/categories/:categoryId/subjects", listSubjectsByCategory);
contentRouter.get("/subjects/:subjectId/topics", listTopicsBySubject);
contentRouter.get("/topics/:topicId/contents", listContentsByTopic);
contentRouter.get("/contents", listContentsFiltered);
contentRouter.get("/contents/:contentId", getContentDetail);
contentRouter.post("/contents/:contentId/view", postContentView);
contentRouter.get("/contents/:contentId/recommended", getRecommendedSimilar);
contentRouter.get("/search", searchContent);

contentRouter.get("/", listEducationalContent);
contentRouter.get("/:id", getEducationalContentById);
contentRouter.post("/:id/complete", completeEducationalContent);
