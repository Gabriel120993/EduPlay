import { Router } from 'express';
import {
  getGamificationLeaderboard,
  getGamificationLeaderboardByCategory,
  getGamificationProfile,
  getMyInventory,
  listAllAchievements,
  listCollections,
  listMyAchievements,
  postEquipItem,
} from '../controllers/gamificationApi.controller';
import { authWriteLimiter } from '../middlewares/rateLimit.middleware';
import { requireAuthenticated, requireChild } from '../middlewares/rbac.middleware';

export const gamificationRouter = Router();

gamificationRouter.get('/profile', requireChild, getGamificationProfile);
gamificationRouter.get('/achievements', requireAuthenticated, listAllAchievements);
gamificationRouter.get('/my-achievements', requireChild, listMyAchievements);
gamificationRouter.get('/collections', requireAuthenticated, listCollections);
gamificationRouter.get('/inventory', requireChild, getMyInventory);
gamificationRouter.post('/equip/:itemId', requireChild, authWriteLimiter, postEquipItem);
gamificationRouter.get('/leaderboard', requireChild, getGamificationLeaderboard);
gamificationRouter.get(
  '/leaderboard/:category',
  requireChild,
  getGamificationLeaderboardByCategory,
);
