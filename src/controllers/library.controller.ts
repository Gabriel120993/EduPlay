import type { Request, Response } from 'express';
import { z } from 'zod';
import { formatZodError } from '../lib/validation/schemas';
import {
  getLibraryContentBySlug,
  getRecommendedLibraryContent,
  listLibraryBookmarks,
  listLibraryContent,
  listLibraryHistory,
  rateLibraryContent,
  toggleLibraryBookmark,
  upsertLibraryProgress,
} from '../services/library.service';

function requireChild(req: Request, res: Response): string | null {
  const auth = req.auth;
  if (!auth || auth.kind !== 'child') {
    res.status(403).json({ error: 'Solo menores autenticados.' });
    return null;
  }
  return auth.userId;
}

const progressSchema = z.object({
  progressSec: z.coerce.number().int().min(0),
  isCompleted: z.boolean().optional(),
});

const rateSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
});

export async function getLibrary(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;
  try {
    const result = await listLibraryContent({
      userId,
      type: typeof req.query.type === 'string' ? (req.query.type as never) : undefined,
      category: typeof req.query.category === 'string' ? (req.query.category as never) : undefined,
      ageMin: req.query.ageMin != null ? Number(req.query.ageMin) : undefined,
      ageMax: req.query.ageMax != null ? Number(req.query.ageMax) : undefined,
      search: typeof req.query.search === 'string' ? req.query.search : undefined,
      channelId: typeof req.query.channelId === 'string' ? req.query.channelId : undefined,
      page: req.query.page != null ? Number(req.query.page) : 1,
      limit: req.query.limit != null ? Number(req.query.limit) : 15,
    });
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Error al listar biblioteca.' });
  }
}

export async function getLibraryRecommended(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;
  const contents = await getRecommendedLibraryContent(userId, Number(req.query.limit) || 10);
  res.json({ contents });
}

export async function getLibraryItem(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;
  const slug = req.params.slug?.trim();
  if (!slug) {
    res.status(400).json({ error: 'slug inválido.' });
    return;
  }
  const detail = await getLibraryContentBySlug(slug, userId);
  if (!detail) {
    res.status(404).json({ error: 'Contenido no encontrado.' });
    return;
  }
  res.json(detail);
}

export async function postLibraryProgress(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;
  const slug = req.params.slug?.trim();
  const parsed = progressSchema.safeParse(req.body);
  if (!slug || !parsed.success) {
    res.status(400).json({ error: parsed.success ? 'slug inválido.' : formatZodError(parsed.error) });
    return;
  }
  try {
    const result = await upsertLibraryProgress(userId, slug, parsed.data);
    res.json(result);
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Error.' });
  }
}

export async function postLibraryBookmark(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;
  const slug = req.params.slug?.trim();
  if (!slug) {
    res.status(400).json({ error: 'slug inválido.' });
    return;
  }
  try {
    res.json(await toggleLibraryBookmark(userId, slug));
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Error.' });
  }
}

export async function postLibraryRate(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;
  const slug = req.params.slug?.trim();
  const parsed = rateSchema.safeParse(req.body);
  if (!slug || !parsed.success) {
    res.status(400).json({ error: parsed.success ? 'slug inválido.' : formatZodError(parsed.error) });
    return;
  }
  try {
    res.json(await rateLibraryContent(userId, slug, parsed.data.rating));
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Error.' });
  }
}

export async function getLibraryBookmarks(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;
  res.json(await listLibraryBookmarks(userId));
}

export async function getLibraryHistory(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;
  res.json(await listLibraryHistory(userId));
}
