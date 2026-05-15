import { Router } from 'express';
import { postContentReport } from '../controllers/report.controller';
import { getMyContentReports } from '../controllers/reportsApi.controller';
import { authWriteLimiter, contentReportUserLimiter } from '../middlewares/rateLimit.middleware';
import { requireChild } from '../middlewares/rbac.middleware';

export const reportRouter = Router();

reportRouter.use(requireChild);
reportRouter.get('/my-reports', getMyContentReports);
reportRouter.post('/', contentReportUserLimiter, authWriteLimiter, postContentReport);
