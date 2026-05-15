import { Router } from 'express';
import { getHealth, getReady } from '../controllers/health.controller';

export const healthRouter = Router();

healthRouter.get('/', getHealth);
healthRouter.get('/ready', getReady);
