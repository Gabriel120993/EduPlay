import { Router } from 'express';
import {
  getLibrary,
  getLibraryBookmarks,
  getLibraryHistory,
  getLibraryItem,
  getLibraryRecommended,
  postLibraryBookmark,
  postLibraryProgress,
  postLibraryRate,
} from '../controllers/library.controller';
import { authWriteLimiter, mediumLimiter } from '../middlewares/rateLimit.middleware';
import { requireChild } from '../middlewares/rbac.middleware';

export const libraryRouter = Router();

libraryRouter.use(requireChild);
libraryRouter.use(mediumLimiter);

libraryRouter.get('/recommended', getLibraryRecommended);
libraryRouter.get('/bookmarks', getLibraryBookmarks);
libraryRouter.get('/history', getLibraryHistory);
libraryRouter.get('/', getLibrary);
libraryRouter.get('/:slug', getLibraryItem);
libraryRouter.post('/:slug/progress', authWriteLimiter, postLibraryProgress);
libraryRouter.post('/:slug/bookmark', authWriteLimiter, postLibraryBookmark);
libraryRouter.post('/:slug/rate', authWriteLimiter, postLibraryRate);
