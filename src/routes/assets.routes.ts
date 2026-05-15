import { Router } from 'express';
import {
  getEducationalAssetById,
  listEducationalAssets,
  listEducationalAssetsByCategory,
} from '../controllers/educationalAsset.controller';
import { requireChild } from '../middlewares/rbac.middleware';

/**
 * Catálogo de activos educativos (alias corto de `/api/educational-assets`).
 *
 * - GET /api/assets?category=flags&tags=bandera,pais&limit=50
 * - GET /api/assets/category/:category
 * - GET /api/assets/:id
 */
export const assetsRouter = Router();

assetsRouter.use(requireChild);

assetsRouter.get('/category/:category', listEducationalAssetsByCategory);
assetsRouter.get('/:id', getEducationalAssetById);
assetsRouter.get('/', listEducationalAssets);
