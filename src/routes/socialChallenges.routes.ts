import { Router } from 'express';
import {
  getSocialChallenges,
  postAcceptSocialChallenge,
  postCompleteSocialChallenge,
  postSocialChallenge,
} from '../controllers/socialChallenge.controller';
import { authWriteLimiter, mediumLimiter } from '../middlewares/rateLimit.middleware';
import { requireChild } from '../middlewares/rbac.middleware';

export const socialChallengesRouter = Router();

socialChallengesRouter.use(requireChild);
socialChallengesRouter.use(mediumLimiter);

socialChallengesRouter.get('/', getSocialChallenges);
socialChallengesRouter.post('/', authWriteLimiter, postSocialChallenge);
socialChallengesRouter.post('/:id/accept', authWriteLimiter, postAcceptSocialChallenge);
socialChallengesRouter.post('/:id/complete', authWriteLimiter, postCompleteSocialChallenge);
