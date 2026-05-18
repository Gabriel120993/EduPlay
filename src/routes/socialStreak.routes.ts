import { Router } from 'express';
import { getSocialStreaks } from '../controllers/socialStreak.controller';
import { mediumLimiter } from '../middlewares/rateLimit.middleware';
import { requireChild } from '../middlewares/rbac.middleware';

export const socialStreaksRouter = Router();

socialStreaksRouter.use(requireChild);
socialStreaksRouter.use(mediumLimiter);
socialStreaksRouter.get('/', getSocialStreaks);
