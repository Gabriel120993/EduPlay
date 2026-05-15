import { Router } from 'express';
import { listAchievements } from '../controllers/achievement.controller';
import {
  getAchievementSystemCompare,
  getAchievementSystemOverview,
  patchAchievementProfileVisibility,
} from '../controllers/achievements.controller';
import { requireChild } from '../middlewares/rbac.middleware';

export const achievementRouter = Router();

achievementRouter.use(requireChild);

achievementRouter.get('/system/overview', getAchievementSystemOverview);
achievementRouter.get('/system/compare', getAchievementSystemCompare);
achievementRouter.patch('/system/profile-visibility', patchAchievementProfileVisibility);
achievementRouter.get('/', listAchievements);
