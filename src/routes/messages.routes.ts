import { Router } from 'express';
import {
  getRestChatsByUserId,
  getRestMessagesByChatId,
  postRestMessage,
} from '../controllers/chat.controller';
import { requireChild } from '../middlewares/rbac.middleware';

/** Rutas REST bajo `/api`: POST /messages, GET /messages/:chatId, GET /chats/:userId */
export const messagesRestRouter = Router();

messagesRestRouter.post('/messages', requireChild, postRestMessage);
messagesRestRouter.get('/messages/:chatId', requireChild, getRestMessagesByChatId);
messagesRestRouter.get('/chats/:userId', requireChild, getRestChatsByUserId);
