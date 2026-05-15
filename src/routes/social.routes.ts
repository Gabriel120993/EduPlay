import { Router } from 'express';
import {
  deleteSocialFriend,
  getFriendRecommendations,
  getSocialConversations,
  getSocialFriends,
  getSocialMessagesWithUser,
  getStudyGroupDetail,
  listStudyGroups,
  postCreateStudyGroup,
  postJoinStudyGroup,
  postLeaveStudyGroup,
  postSocialFriendRequest,
  postSocialPredefinedMessage,
  putAcceptFriendRequestRest,
  putRejectFriendRequestRest,
} from '../controllers/socialApi.controller';
import {
  friendRequestBurstLimiter,
  friendRequestWindowLimiter,
} from '../middlewares/rateLimit.middleware';
import { requireChild } from '../middlewares/rbac.middleware';

export const socialRouter = Router();

socialRouter.use(requireChild);

socialRouter.get('/friends', getSocialFriends);
socialRouter.post(
  '/friends/request',
  friendRequestBurstLimiter,
  friendRequestWindowLimiter,
  postSocialFriendRequest,
);
socialRouter.put('/friends/requests/:requestId/accept', putAcceptFriendRequestRest);
socialRouter.put('/friends/requests/:requestId/reject', putRejectFriendRequestRest);
socialRouter.delete('/friends/:friendId', deleteSocialFriend);
socialRouter.get('/friends/recommendations', getFriendRecommendations);

socialRouter.get('/study-groups', listStudyGroups);
socialRouter.post('/study-groups', postCreateStudyGroup);
socialRouter.get('/study-groups/:groupId', getStudyGroupDetail);
socialRouter.post('/study-groups/:groupId/join', postJoinStudyGroup);
socialRouter.post('/study-groups/:groupId/leave', postLeaveStudyGroup);

socialRouter.get('/messages', getSocialConversations);
socialRouter.get('/messages/:userId', getSocialMessagesWithUser);
socialRouter.post('/messages', postSocialPredefinedMessage);
