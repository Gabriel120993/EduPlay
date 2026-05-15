import type { Request, Response } from 'express';
import { Difficulty } from '@prisma/client';
import { z } from 'zod';
import { logError } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { formatZodError } from '../lib/validation/schemas';

function requireChild(req: Request, res: Response): string | null {
  const auth = req.auth;
  if (!auth || auth.kind !== 'child') {
    res.status(403).json({ error: 'Solo menores autenticados.' });
    return null;
  }
  return auth.userId;
}

/** GET /api/content/categories */
export async function listEducationalCategories(_req: Request, res: Response): Promise<void> {
  try {
    const rows = await prisma.educationalCategory.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    res.json({ categories: rows });
  } catch (e) {
    logError('contentApi.categories', e);
    res.status(500).json({ error: 'Error al listar categorías.' });
  }
}

/** GET /api/content/categories/:categoryId/subjects */
export async function listSubjectsByCategory(req: Request, res: Response): Promise<void> {
  const categoryId = req.params.categoryId?.trim();
  if (!categoryId) {
    res.status(400).json({ error: 'categoryId inválido.' });
    return;
  }
  try {
    const rows = await prisma.educationalSubject.findMany({
      where: { categoryId },
      orderBy: { sortOrder: 'asc' },
    });
    res.json({ subjects: rows });
  } catch (e) {
    logError('contentApi.subjects', e);
    res.status(500).json({ error: 'Error al listar materias.' });
  }
}

/** GET /api/content/subjects/:subjectId/topics */
export async function listTopicsBySubject(req: Request, res: Response): Promise<void> {
  const subjectId = req.params.subjectId?.trim();
  if (!subjectId) {
    res.status(400).json({ error: 'subjectId inválido.' });
    return;
  }
  try {
    const rows = await prisma.educationalTopic.findMany({
      where: { subjectId },
      orderBy: { sortOrder: 'asc' },
    });
    res.json({ topics: rows });
  } catch (e) {
    logError('contentApi.topics', e);
    res.status(500).json({ error: 'Error al listar temas.' });
  }
}

/** GET /api/content/topics/:topicId/contents */
export async function listContentsByTopic(req: Request, res: Response): Promise<void> {
  const topicId = req.params.topicId?.trim();
  if (!topicId) {
    res.status(400).json({ error: 'topicId inválido.' });
    return;
  }
  try {
    const rows = await prisma.educationalContent.findMany({
      where: { topicId, published: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ contents: rows });
  } catch (e) {
    logError('contentApi.topicContents', e);
    res.status(500).json({ error: 'Error al listar contenidos.' });
  }
}

const listContentsQuerySchema = z.object({
  age: z.coerce.number().int().min(3).max(99).optional(),
  difficulty: z.nativeEnum(Difficulty).optional(),
  type: z.string().trim().max(32).optional(),
});

/** GET /api/content/contents */
export async function listContentsFiltered(req: Request, res: Response): Promise<void> {
  const parsed = listContentsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }
  try {
    const rows = await prisma.educationalContent.findMany({
      where: {
        published: true,
        ...(parsed.data.difficulty ? { difficulty: parsed.data.difficulty } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ contents: rows });
  } catch (e) {
    logError('contentApi.listContents', e);
    res.status(500).json({ error: 'Error al listar contenidos.' });
  }
}

/** GET /api/content/contents/:contentId */
export async function getContentDetail(req: Request, res: Response): Promise<void> {
  const contentId = req.params.contentId?.trim();
  if (!contentId) {
    res.status(400).json({ error: 'contentId inválido.' });
    return;
  }
  try {
    const item = await prisma.educationalContent.findUnique({ where: { id: contentId } });
    if (!item) {
      res.status(404).json({ error: 'Contenido no encontrado.' });
      return;
    }
    res.json({ content: item });
  } catch (e) {
    logError('contentApi.getContent', e);
    res.status(500).json({ error: 'Error al obtener contenido.' });
  }
}

const viewBodySchema = z.object({
  progressPercent: z.coerce.number().min(0).max(100).optional(),
});

/** POST /api/content/contents/:contentId/view */
export async function postContentView(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;

  const contentId = req.params.contentId?.trim();
  if (!contentId) {
    res.status(400).json({ error: 'contentId inválido.' });
    return;
  }

  const parsed = viewBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }

  try {
    await prisma.analyticsEvent.create({
      data: {
        userId,
        eventName: 'content_view',
        metadata: { contentId, ...parsed.data },
      },
    });
    res.status(201).json({ ok: true });
  } catch (e) {
    logError('contentApi.view', e);
    res.status(500).json({ error: 'Error al registrar vista.' });
  }
}

/** GET /api/content/contents/:contentId/recommended */
export async function getRecommendedSimilar(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;

  const contentId = req.params.contentId?.trim();
  if (!contentId) {
    res.status(400).json({ error: 'contentId inválido.' });
    return;
  }

  try {
    const base = await prisma.educationalContent.findUnique({ where: { id: contentId } });
    if (!base) {
      res.status(404).json({ error: 'Contenido no encontrado.' });
      return;
    }
    const similar = await prisma.educationalContent.findMany({
      where: {
        published: true,
        id: { not: base.id },
        category: base.category,
        difficulty: base.difficulty,
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ contents: similar });
  } catch (e) {
    logError('contentApi.recommended', e);
    res.status(500).json({ error: 'Error al obtener recomendaciones.' });
  }
}

const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

/** GET /api/content/search */
export async function searchContent(req: Request, res: Response): Promise<void> {
  const parsed = searchQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }

  try {
    const q = parsed.data.q;
    const rows = await prisma.educationalContent.findMany({
      where: {
        published: true,
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: parsed.data.limit,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ contents: rows });
  } catch (e) {
    logError('contentApi.search', e);
    res.status(500).json({ error: 'Error en la búsqueda.' });
  }
}
