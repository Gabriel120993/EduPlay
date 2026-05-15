import type { Request, Response } from 'express';
import type { Prisma } from '@prisma/client';
import { logError } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { formatZodError, uuidSchema } from '../lib/validation/schemas';

function parseStringQuery(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim() !== '') return value.trim();
  if (Array.isArray(value) && value[0] != null) {
    const first = String(value[0]).trim();
    if (first !== '') return first;
  }
  return undefined;
}

function parseTagsList(raw: string): string[] {
  return raw
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

function buildAssetListWhere(params: {
  category?: string;
  name?: string;
  tag?: string;
  tagsList?: string[];
}): Prisma.EducationalAssetWhereInput {
  const clauses: Prisma.EducationalAssetWhereInput[] = [];
  if (params.category) {
    clauses.push({ category: { equals: params.category, mode: 'insensitive' } });
  }
  if (params.name) {
    clauses.push({ name: { equals: params.name, mode: 'insensitive' } });
  }
  if (params.tag) {
    clauses.push({ tags: { has: params.tag } });
  }
  if (params.tagsList && params.tagsList.length > 0) {
    clauses.push({ tags: { hasSome: params.tagsList } });
  }
  return clauses.length > 0 ? { AND: clauses } : {};
}

/**
 * GET /api/educational-assets · GET /api/assets
 * Query: category, name, tag, tags (coma, conjunto con hasSome), limit
 */
export async function listEducationalAssets(req: Request, res: Response): Promise<void> {
  const category = parseStringQuery(req.query.category);
  const name = parseStringQuery(req.query.name);
  const tag = parseStringQuery(req.query.tag);
  const tagsParam = parseStringQuery(req.query.tags);
  const tagsList = tagsParam ? parseTagsList(tagsParam) : undefined;
  const limitRaw = Number(parseStringQuery(req.query.limit));
  const take = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(200, Math.floor(limitRaw)) : 80;

  try {
    const where = buildAssetListWhere({ category, name, tag, tagsList });
    const rows = await prisma.educationalAsset.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      take,
    });
    res.json({ assets: rows });
  } catch (e) {
    logError('educationalAsset.list', e);
    res.status(500).json({ error: 'Error al listar activos educativos.' });
  }
}

/**
 * GET /api/assets/:id
 */
export async function getEducationalAssetById(req: Request, res: Response): Promise<void> {
  const parsed = uuidSchema.safeParse(req.params.id);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }
  try {
    const asset = await prisma.educationalAsset.findUnique({
      where: { id: parsed.data },
    });
    if (!asset) {
      res.status(404).json({ error: 'Activo no encontrado.' });
      return;
    }
    res.json(asset);
  } catch (e) {
    logError('educationalAsset.getById', e);
    res.status(500).json({ error: 'Error al obtener el activo.' });
  }
}

/**
 * GET /api/assets/category/:category
 */
export async function listEducationalAssetsByCategory(req: Request, res: Response): Promise<void> {
  const category = req.params.category?.trim();
  if (!category) {
    res.status(400).json({ error: 'Categoría inválida.' });
    return;
  }
  const limitRaw = Number(parseStringQuery(req.query.limit));
  const take =
    Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(500, Math.floor(limitRaw)) : 200;

  try {
    const rows = await prisma.educationalAsset.findMany({
      where: { category: { equals: category, mode: 'insensitive' } },
      orderBy: { name: 'asc' },
      take,
    });
    res.json({ assets: rows });
  } catch (e) {
    logError('educationalAsset.listByCategory', e);
    res.status(500).json({ error: 'Error al listar activos por categoría.' });
  }
}
