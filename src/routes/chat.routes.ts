import { Router } from 'express';
import {
  getChatThread,
  listChatConversations,
  postChatMessage,
} from '../controllers/chat.controller';
import { requireChild } from '../middlewares/rbac.middleware';

export const chatRouter = Router();

chatRouter.post('/messages', requireChild, postChatMessage);
chatRouter.get('/conversations', requireChild, listChatConversations);
chatRouter.get('/threads/:peerId', requireChild, getChatThread);
