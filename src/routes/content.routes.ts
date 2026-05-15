import { Router } from 'express';
import {
  completeEducationalContent,
  getContentDetailWithProgress,
  getContentExplore,
  getContentFeed,
  getRecommendedContent,
  listContentCategories,
  listEducationalContent,
  postContentProgress,
  searchEducationalContent,
} from '../controllers/content.controller';
import {
  getContentDetail,
  getRecommendedSimilar,
  listContentsByTopic,
  listContentsFiltered,
  listSubjectsByCategory,
  listTopicsBySubject,
  postContentView,
} from '../controllers/contentApi.controller';
import { requireChild } from '../middlewares/rbac.middleware';

export const contentRouter = Router();

contentRouter.use(requireChild);

contentRouter.get('/feed', getContentFeed);
contentRouter.get('/explore', getContentExplore);
contentRouter.get('/recommended', getRecommendedContent);
contentRouter.get('/categories', listContentCategories);
contentRouter.get('/categories/:categoryId/subjects', listSubjectsByCategory);
contentRouter.get('/subjects/:subjectId/topics', listTopicsBySubject);
contentRouter.get('/topics/:topicId/contents', listContentsByTopic);
contentRouter.get('/contents', listContentsFiltered);
contentRouter.get('/contents/:contentId', getContentDetail);
contentRouter.post('/contents/:contentId/view', postContentView);
contentRouter.get('/contents/:contentId/recommended', getRecommendedSimilar);
contentRouter.get('/search', searchEducationalContent);

contentRouter.get('/', listEducationalContent);
contentRouter.post('/:contentId/progress', postContentProgress);
contentRouter.get('/:contentId', getContentDetailWithProgress);
contentRouter.post('/:id/complete', completeEducationalContent);
