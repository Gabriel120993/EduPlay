import { Router } from 'express';
import {
  acceptPlayGameChallengeHandler,
  completePlayGameHandler,
  createPlayGameChallengeHandler,
  declinePlayGameChallengeHandler,
  forfeitPlayGameHandler,
  getPlayGameDetailHandler,
  getPlayGameHistoryHandler,
  getPlayGameLeaderboardHandler,
  getPlayGameStateHandler,
  listPlayGameChallengesHandler,
  listPlayGamesHandler,
  playGameActionHandler,
  startPlayGameHandler,
} from '../controllers/playGames.controller';
import { authWriteLimiter, mediumLimiter } from '../middlewares/rateLimit.middleware';
import { requireChild } from '../middlewares/rbac.middleware';

export const playGamesRouter = Router();

playGamesRouter.use(requireChild);
playGamesRouter.use(mediumLimiter);

playGamesRouter.get('/', listPlayGamesHandler);
playGamesRouter.get('/history', getPlayGameHistoryHandler);
playGamesRouter.get('/challenges', listPlayGameChallengesHandler);
playGamesRouter.get('/leaderboard/:slug', getPlayGameLeaderboardHandler);

playGamesRouter.post('/challenge', authWriteLimiter, createPlayGameChallengeHandler);
playGamesRouter.post(
  '/challenge/:challengeId/accept',
  authWriteLimiter,
  acceptPlayGameChallengeHandler,
);
playGamesRouter.post(
  '/challenge/:challengeId/decline',
  authWriteLimiter,
  declinePlayGameChallengeHandler,
);

playGamesRouter.get('/:slug', getPlayGameDetailHandler);
playGamesRouter.post('/:slug/start', authWriteLimiter, startPlayGameHandler);
playGamesRouter.get('/:slug/:sessionId/state', getPlayGameStateHandler);
playGamesRouter.post('/:slug/:sessionId/action', authWriteLimiter, playGameActionHandler);
playGamesRouter.post('/:slug/:sessionId/complete', authWriteLimiter, completePlayGameHandler);
playGamesRouter.post('/:slug/:sessionId/forfeit', authWriteLimiter, forfeitPlayGameHandler);
