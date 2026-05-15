import { Router } from 'express';
import {
  getMyQuizAttempts,
  getQuizAttemptResults,
  getQuizDetail,
  getQuizQuestions,
  getRecommendedQuizzes,
  listQuizzes,
  postFinishQuizAttempt,
  postQuizAttemptAnswer,
  postStartQuizAttempt,
} from '../controllers/quizzesApi.controller';
import { authWriteLimiter } from '../middlewares/rateLimit.middleware';
import { requireChild } from '../middlewares/rbac.middleware';

export const quizzesRouter = Router();

quizzesRouter.use(requireChild);

quizzesRouter.get('/my-attempts', getMyQuizAttempts);
quizzesRouter.get('/recommended', getRecommendedQuizzes);
quizzesRouter.get('/', listQuizzes);
quizzesRouter.post('/attempts/:attemptId/answer', authWriteLimiter, postQuizAttemptAnswer);
quizzesRouter.post('/attempts/:attemptId/finish', authWriteLimiter, postFinishQuizAttempt);
quizzesRouter.get('/attempts/:attemptId/results', getQuizAttemptResults);
quizzesRouter.get('/:quizId/questions', getQuizQuestions);
quizzesRouter.post('/:quizId/attempt', authWriteLimiter, postStartQuizAttempt);
quizzesRouter.get('/:quizId', getQuizDetail);
