import { Router } from 'express';

import {
  getAvailableMissions,
  getThematicMissionsCatalog,
  getThematicMissionsSeasons,
  getThematicMissionsState,
  patchThematicMissionProgress,
  postThematicMissionRestart,
  postThematicMissionVote,
} from '../controllers/missions.controller';
import {
  getMissionDetailRest,
  getMyMissionsCompleted,
  getMyMissionsProgress,
  listMissionsRest,
  postClaimMissionRewards,
  postCompleteMissionActivity,
  postStartMission,
} from '../controllers/missionsApi.controller';
import { authWriteLimiter } from '../middlewares/rateLimit.middleware';
import { requireChild } from '../middlewares/rbac.middleware';

export const missionsRouter = Router();

missionsRouter.get('/thematic/catalog', requireChild, getThematicMissionsCatalog);
missionsRouter.get('/thematic/seasons', requireChild, getThematicMissionsSeasons);
missionsRouter.get('/thematic/state', requireChild, getThematicMissionsState);
missionsRouter.patch('/thematic/:slug/progress', requireChild, patchThematicMissionProgress);
missionsRouter.post('/thematic/:slug/restart', requireChild, postThematicMissionRestart);
missionsRouter.post('/thematic/:slug/vote', requireChild, postThematicMissionVote);

missionsRouter.get('/available', requireChild, getAvailableMissions);
missionsRouter.get('/', requireChild, listMissionsRest);
missionsRouter.get('/my-progress', requireChild, getMyMissionsProgress);
missionsRouter.get('/my-completed', requireChild, getMyMissionsCompleted);
missionsRouter.post(
  '/progress/:progressId/complete-activity',
  requireChild,
  authWriteLimiter,
  postCompleteMissionActivity,
);
missionsRouter.post(
  '/progress/:progressId/claim-rewards',
  requireChild,
  authWriteLimiter,
  postClaimMissionRewards,
);
missionsRouter.post('/:missionId/start', requireChild, authWriteLimiter, postStartMission);
missionsRouter.get('/:missionId', requireChild, getMissionDetailRest);
