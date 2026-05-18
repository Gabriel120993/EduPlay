import type { Request, Response } from 'express';
import { z } from 'zod';
import { formatZodError } from '../lib/validation/schemas';
import {
  acceptSocialGroupChallenge,
  completeSocialGroupChallenge,
  createSocialGroupChallenge,
  listSocialGroupChallenges,
} from '../services/socialChallenge.service';

function requireChild(req: Request, res: Response): string | null {
  const auth = req.auth;
  if (!auth || auth.kind !== 'child') {
    res.status(403).json({ error: 'Solo menores autenticados.' });
    return null;
  }
  return auth.userId;
}

const createSchema = z.object({
  type: z.enum(['BEAT_SCORE', 'COMPLETE_IN_TIME', 'STREAK_DAYS', 'GROUP_GOAL']),
  gameId: z.string().uuid().optional(),
  playGameId: z.string().uuid().optional(),
  description: z.string().min(3).max(300),
  targetScore: z.coerce.number().int().positive().optional(),
  targetTime: z.coerce.number().int().positive().optional(),
  invitedFriends: z.array(z.string().uuid()).min(1).max(10),
  durationHours: z.coerce.number().int().min(1).max(168).default(48),
  rewardCoins: z.coerce.number().int().min(0).max(500).optional(),
  rewardGems: z.coerce.number().int().min(0).max(100).optional(),
});

export async function postSocialChallenge(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }
  try {
    const challenge = await createSocialGroupChallenge(userId, parsed.data);
    res.status(201).json({ challenge });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al crear desafío.';
    res.status(400).json({ error: msg });
  }
}

export async function getSocialChallenges(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;
  try {
    const data = await listSocialGroupChallenges(userId);
    res.json(data);
  } catch {
    res.status(500).json({ error: 'Error al listar desafíos.' });
  }
}

export async function postAcceptSocialChallenge(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;
  const id = req.params.id?.trim();
  if (!id) {
    res.status(400).json({ error: 'id inválido.' });
    return;
  }
  try {
    const result = await acceptSocialGroupChallenge(id, userId);
    res.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error.';
    res.status(400).json({ error: msg });
  }
}

export async function postCompleteSocialChallenge(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;
  const id = req.params.id?.trim();
  const score = Number(req.body?.score);
  if (!id || !Number.isFinite(score)) {
    res.status(400).json({ error: 'id y score son obligatorios.' });
    return;
  }
  try {
    const result = await completeSocialGroupChallenge(id, userId, score);
    res.json(result);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error.';
    res.status(400).json({ error: msg });
  }
}
