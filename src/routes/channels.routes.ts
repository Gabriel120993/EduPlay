import { Router } from 'express';
import {
  getChannelDetail,
  getChannels,
  getSubscribedChannels,
  postChannelSubscribe,
} from '../controllers/channels.controller';
import { authWriteLimiter, mediumLimiter } from '../middlewares/rateLimit.middleware';
import { requireChild } from '../middlewares/rbac.middleware';

export const channelsRouter = Router();

channelsRouter.use(requireChild);
channelsRouter.use(mediumLimiter);

channelsRouter.get('/subscribed', getSubscribedChannels);
channelsRouter.get('/', getChannels);
channelsRouter.get('/:slug', getChannelDetail);
channelsRouter.post('/:slug/subscribe', authWriteLimiter, postChannelSubscribe);
