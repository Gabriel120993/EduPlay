import { Router } from 'express';
import { listEducationalAssets } from '../controllers/educationalAsset.controller';
import { requireChild } from '../middlewares/rbac.middleware';

export const educationalAssetRouter = Router();

educationalAssetRouter.use(requireChild);

educationalAssetRouter.get('/', listEducationalAssets);
