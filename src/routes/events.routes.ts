import { Router } from 'express';
import {
  getEventDetail,
  getEventLeaderboard,
  getLiveEventsNow,
  getUpcomingEvents,
  postEventTriviaAnswer,
  postJoinEvent,
  postLeaveEvent,
} from '../controllers/eventsApi.controller';
import { authWriteLimiter } from '../middlewares/rateLimit.middleware';
import { requireAuthenticated, requireChild } from '../middlewares/rbac.middleware';

export const eventsRouter = Router();

eventsRouter.get('/upcoming', requireAuthenticated, getUpcomingEvents);
eventsRouter.get('/live', requireAuthenticated, getLiveEventsNow);

eventsRouter.use(requireChild);

eventsRouter.post('/:eventId/join', authWriteLimiter, postJoinEvent);
eventsRouter.post('/:eventId/leave', authWriteLimiter, postLeaveEvent);
eventsRouter.post('/:eventId/answer', authWriteLimiter, postEventTriviaAnswer);
eventsRouter.get('/:eventId/leaderboard', getEventLeaderboard);
eventsRouter.get('/:eventId', getEventDetail);
