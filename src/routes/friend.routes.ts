import { Router } from 'express';
import {
  acceptFriendRequest,
  getAcceptedFriends,
  getPendingFriendRequests,
  parentApproveFriendRequest,
  parentRejectFriendAwaiting,
  rejectFriendRequest,
  sendFriendRequest,
} from '../controllers/friend.controller';
import {
  friendRequestBurstLimiter,
  friendRequestWindowLimiter,
} from '../middlewares/rateLimit.middleware';
import { requireChild, requireParent } from '../middlewares/rbac.middleware';

export const friendRouter = Router();

friendRouter.post('/parent-approve', requireParent, parentApproveFriendRequest);
friendRouter.post('/parent-reject-awaiting', requireParent, parentRejectFriendAwaiting);

friendRouter.post(
  '/request',
  requireChild,
  friendRequestBurstLimiter,
  friendRequestWindowLimiter,
  sendFriendRequest,
);
friendRouter.post('/accept', requireChild, acceptFriendRequest);
friendRouter.post('/reject', requireChild, rejectFriendRequest);
friendRouter.get('/requests/:userId', requireChild, getPendingFriendRequests);
friendRouter.get('/:userId', requireChild, getAcceptedFriends);
