import type { Request, Response } from 'express';
import { ChallengeBucket } from '@prisma/client';
import { z } from 'zod';
import { logError } from '../lib/logger';
import { prisma } from '../lib/prisma';
import {
  applyGamifiedChallengeProgress,
  listGamifiedChallengesForUser,
} from '../services/challenges.service';
import { formatZodError } from '../lib/validation/schemas';

function requireChild(req: Request, res: Response): string | null {
  const auth = req.auth;
  if (!auth || auth.kind !== 'child') {
    res.status(403).json({ error: 'Solo menores autenticados.' });
    return null;
  }
  return auth.userId;
}

/** GET /api/challenges/daily */
export async function getChallengesDailyRest(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;

  try {
    const pack = await listGamifiedChallengesForUser(userId);
    res.json({
      dateKey: pack.dateKey,
      challenges: pack.daily.map((c) => ({
        id: c.id,
        slug: c.challengeSlug,
        title: c.title,
        target: c.target,
        progress: c.progress,
        completed: c.completed,
      })),
    });
  } catch (e) {
    logError('challengesApi.daily', e);
    res.status(500).json({ error: 'Error al cargar retos diarios.' });
  }
}

/** GET /api/challenges/weekly */
export async function getChallengesWeeklyRest(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;

  try {
    const pack = await listGamifiedChallengesForUser(userId);
    res.json({
      mondayKey: pack.mondayKey,
      weekly: pack.weekly,
    });
  } catch (e) {
    logError('challengesApi.weekly', e);
    res.status(500).json({ error: 'Error al cargar reto semanal.' });
  }
}

/** GET /api/challenges/special */
export async function getChallengesSpecialRest(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;

  try {
    const pack = await listGamifiedChallengesForUser(userId);
    res.json({ specials: pack.specials });
  } catch (e) {
    logError('challengesApi.special', e);
    res.status(500).json({ error: 'Error al cargar retos especiales.' });
  }
}

/** GET /api/challenges/my-progress */
export async function getChallengesMyProgress(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;

  try {
    const rows = await prisma.userGamifiedChallenge.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 200,
    });
    res.json({ challenges: rows });
  } catch (e) {
    logError('challengesApi.myProgress', e);
    res.status(500).json({ error: 'Error al cargar progreso.' });
  }
}

const claimSchema = z.object({
  bucket: z.nativeEnum(ChallengeBucket).optional(),
});

/** POST /api/challenges/:challengeId/claim — `challengeId` es el id de fila `UserGamifiedChallenge` */
export async function postChallengeClaim(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;

  const challengeId = req.params.challengeId?.trim();
  if (!challengeId) {
    res.status(400).json({ error: 'challengeId inválido.' });
    return;
  }

  const parsed = claimSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }

  try {
    const row = await prisma.userGamifiedChallenge.findFirst({
      where: { id: challengeId, userId },
    });
    if (!row) {
      res.status(404).json({ error: 'Reto no encontrado.' });
      return;
    }
    if (row.completed) {
      res.json({
        ok: true,
        alreadyCompleted: true,
        rewards: row.rewardsGranted,
      });
      return;
    }

    const result = await applyGamifiedChallengeProgress({
      userId,
      bucket: row.bucket,
      challengeSlug: row.challengeSlug,
      setProgress: row.target,
    });

    res.json({ ok: true, result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('UNKNOWN') || msg.includes('NOT_FOUND')) {
      res.status(400).json({ error: 'No se pudo reclamar el reto.' });
      return;
    }
    logError('challengesApi.claim', e);
    res.status(500).json({ error: 'Error al reclamar recompensa.' });
  }
}
