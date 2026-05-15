import { Router } from 'express';
import { getParentCoach } from '../controllers/coach.controller';
import { requireParent } from '../middlewares/rbac.middleware';

export const coachRouter = Router();

coachRouter.get('/parent/:parentId', requireParent, getParentCoach);
