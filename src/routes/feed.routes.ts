import { Router } from 'express';
import {
  getFeed,
  getFeedNotifications,
  getFeedPostDetail,
  postFeedComment,
  postFeedPost,
  removeFeedPost,
  toggleFeedPostLike,
} from '../controllers/feed.controller';
import { requirePostOwner } from '../middlewares/resourceOwnership.middleware';
import { authWriteLimiter, mediumLimiter } from '../middlewares/rateLimit.middleware';
import { requireChild } from '../middlewares/rbac.middleware';

export const feedRouter = Router();

feedRouter.use(requireChild);
feedRouter.use(mediumLimiter);

feedRouter.get('/', getFeed);
feedRouter.get('/notifications', getFeedNotifications);
feedRouter.post('/posts', authWriteLimiter, postFeedPost);
feedRouter.get('/posts/:id', getFeedPostDetail);
feedRouter.post('/posts/:id/like', authWriteLimiter, toggleFeedPostLike);
feedRouter.post('/posts/:id/comment', authWriteLimiter, postFeedComment);
feedRouter.delete('/posts/:id', requirePostOwner(), authWriteLimiter, removeFeedPost);
