import type { Request, Response } from 'express';
import {
  getChannelBySlug,
  listChannels,
  listSubscribedChannels,
  toggleChannelSubscription,
} from '../services/library.service';

function requireChild(req: Request, res: Response): string | null {
  const auth = req.auth;
  if (!auth || auth.kind !== 'child') {
    res.status(403).json({ error: 'Solo menores autenticados.' });
    return null;
  }
  return auth.userId;
}

export async function getChannels(_req: Request, res: Response): Promise<void> {
  const channels = await listChannels();
  res.json({ channels });
}

export async function getChannelDetail(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;
  const slug = req.params.slug?.trim();
  if (!slug) {
    res.status(400).json({ error: 'slug inválido.' });
    return;
  }
  const detail = await getChannelBySlug(slug, userId);
  if (!detail) {
    res.status(404).json({ error: 'Canal no encontrado.' });
    return;
  }
  res.json(detail);
}

export async function postChannelSubscribe(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;
  const slug = req.params.slug?.trim();
  if (!slug) {
    res.status(400).json({ error: 'slug inválido.' });
    return;
  }
  try {
    res.json(await toggleChannelSubscription(userId, slug));
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Error.' });
  }
}

export async function getSubscribedChannels(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;
  res.json(await listSubscribedChannels(userId));
}
