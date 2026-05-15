import { Router } from 'express';
import {
  completeQuiz,
  getQuizCatalog,
  getQuizDailyChallenge,
  getQuizFlashcardsDue,
  getQuizFriendsWeekRanking,
  getQuizWalletHandler,
  getRandomQuiz,
  postQuizDailyRecord,
  postQuizFlashcardReview,
  postQuizFlashcardsFromWrong,
  postQuizHintUnlock,
} from '../controllers/quiz.controller';
import { requireChild } from '../middlewares/rbac.middleware';

export const quizRouter = Router();

quizRouter.use(requireChild);

quizRouter.get('/catalog', getQuizCatalog);
quizRouter.get('/wallet', getQuizWalletHandler);
quizRouter.post('/hint', postQuizHintUnlock);
quizRouter.get('/daily', getQuizDailyChallenge);
quizRouter.post('/daily/record', postQuizDailyRecord);
quizRouter.get('/flashcards', getQuizFlashcardsDue);
quizRouter.post('/flashcards/review', postQuizFlashcardReview);
quizRouter.post('/flashcards/from-wrong', postQuizFlashcardsFromWrong);
quizRouter.get('/friends-week', getQuizFriendsWeekRanking);
quizRouter.get('/', getRandomQuiz);
quizRouter.post('/complete', completeQuiz);
