import { Router } from 'express';
import { deleteAccount } from '../controllers/account.controller';
import { authWriteLimiter } from '../middlewares/rateLimit.middleware';

export const accountRouter = Router();

accountRouter.delete('/', authWriteLimiter, deleteAccount);
