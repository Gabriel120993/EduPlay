import type { Request, Response } from 'express';
import { z } from 'zod';
import {
  computeProgressRatio,
  getThematicMissionBySlug,
  isThematicMissionAvailableNow,
  thematicMissionStepCount,
  THEMATIC_MISSIONS,
} from '../lib/thematicMissionsCatalog';
import { logError } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { formatZodError } from '../lib/validation/schemas';
import { getThematicMissionsCatalog } from './missions.controller';

function childUserId(req: Request, res: Response): string | null {
  const auth = req.auth;
  if (!auth || auth.kind !== 'child') {
    res.status(403).json({ error: 'Solo menores autenticados.' });
    return null;
  }
  return auth.userId;
}

/** GET /api/missions — alias del catálogo temático */
export async function listMissionsRest(req: Request, res: Response): Promise<void> {
  await getThematicMissionsCatalog(req, res);
}

/** GET /api/missions/:missionId — `missionId` es el slug */
export async function getMissionDetailRest(req: Request, res: Response): Promise<void> {
  const slug = req.params.missionId?.trim();
  if (!slug) {
    res.status(400).json({ error: 'missionId inválido.' });
    return;
  }
  const def = getThematicMissionBySlug(slug);
  if (!def) {
    res.status(404).json({ error: 'Misión no encontrada.' });
    return;
  }
  const now = new Date();
  const total = thematicMissionStepCount(def);
  res.json({
    mission: {
      slug: def.slug,
      title: def.title,
      theme: def.theme,
      narrative: def.narrative,
      reward: def.reward,
      stepCount: total,
      availableNow: isThematicMissionAvailableNow(def, now),
    },
  });
}

/** POST /api/missions/:missionId/start */
export async function postStartMission(req: Request, res: Response): Promise<void> {
  const userId = childUserId(req, res);
  if (!userId) return;

  const slug = req.params.missionId?.trim();
  if (!slug) {
    res.status(400).json({ error: 'missionId inválido.' });
    return;
  }

  const def = getThematicMissionBySlug(slug);
  if (!def) {
    res.status(404).json({ error: 'Misión no encontrada.' });
    return;
  }
  const now = new Date();
  if (!isThematicMissionAvailableNow(def, now)) {
    res.status(403).json({ error: 'Misión no disponible ahora.' });
    return;
  }

  try {
    const total = thematicMissionStepCount(def);
    const row = await prisma.userThematicMissionProgress.upsert({
      where: { userId_missionSlug: { userId, missionSlug: slug } },
      create: {
        userId,
        missionSlug: slug,
        currentStepIndex: 0,
        completed: false,
        attemptCount: 1,
      },
      update: {},
    });

    res.status(201).json({
      progress: {
        id: row.id,
        missionSlug: slug,
        currentStepIndex: row.currentStepIndex,
        completed: row.completed,
        progressPercent: computeProgressRatio(row.currentStepIndex, total),
      },
    });
  } catch (e) {
    logError('missionsApi.start', e);
    res.status(500).json({ error: 'Error al iniciar misión.' });
  }
}

/** GET /api/missions/my-progress */
export async function getMyMissionsProgress(req: Request, res: Response): Promise<void> {
  const userId = childUserId(req, res);
  if (!userId) return;

  try {
    const rows = await prisma.userThematicMissionProgress.findMany({
      where: { userId, completed: false },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ progress: rows });
  } catch (e) {
    logError('missionsApi.myProgress', e);
    res.status(500).json({ error: 'Error al listar progreso.' });
  }
}

/** GET /api/missions/my-completed */
export async function getMyMissionsCompleted(req: Request, res: Response): Promise<void> {
  const userId = childUserId(req, res);
  if (!userId) return;

  try {
    const rows = await prisma.userThematicMissionProgress.findMany({
      where: { userId, completed: true },
      orderBy: { completedAt: 'desc' },
    });
    res.json({ completed: rows });
  } catch (e) {
    logError('missionsApi.myCompleted', e);
    res.status(500).json({ error: 'Error al listar misiones completadas.' });
  }
}

const completeActivitySchema = z.object({
  action: z.literal('advance'),
  score: z.number().int().min(0).max(10_000).optional(),
});

/** POST /api/missions/progress/:progressId/complete-activity */
export async function postCompleteMissionActivity(req: Request, res: Response): Promise<void> {
  const userId = childUserId(req, res);
  if (!userId) return;

  const progressId = req.params.progressId?.trim();
  if (!progressId) {
    res.status(400).json({ error: 'progressId inválido.' });
    return;
  }

  const parsed = completeActivitySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }

  try {
    const row = await prisma.userThematicMissionProgress.findFirst({
      where: { id: progressId, userId },
    });
    if (!row) {
      res.status(404).json({ error: 'Progreso no encontrado.' });
      return;
    }

    const def = getThematicMissionBySlug(row.missionSlug);
    if (!def) {
      res.status(400).json({ error: 'Definición de misión inválida.' });
      return;
    }
    const now = new Date();
    if (!isThematicMissionAvailableNow(def, now)) {
      res.status(403).json({ error: 'Misión no disponible ahora.' });
      return;
    }

    const total = thematicMissionStepCount(def);
    if (row.completed) {
      res.status(409).json({ error: 'Misión ya completada.' });
      return;
    }

    const nextIndex = row.currentStepIndex + 1;
    const justFinished = nextIndex >= total;
    const bestScore =
      justFinished && parsed.data.score != null
        ? row.bestScore == null
          ? parsed.data.score
          : Math.max(row.bestScore, parsed.data.score)
        : row.bestScore;

    const updated = await prisma.userThematicMissionProgress.update({
      where: { id: row.id },
      data: {
        currentStepIndex: justFinished ? total : nextIndex,
        completed: justFinished,
        completedAt: justFinished ? new Date() : null,
        bestScore: bestScore ?? undefined,
      },
    });

    res.json({
      progress: {
        id: updated.id,
        currentStepIndex: updated.currentStepIndex,
        completed: updated.completed,
        progressPercent: computeProgressRatio(updated.currentStepIndex, total),
      },
    });
  } catch (e) {
    logError('missionsApi.completeActivity', e);
    res.status(500).json({ error: 'Error al actualizar actividad.' });
  }
}

/** POST /api/missions/progress/:progressId/claim-rewards */
export async function postClaimMissionRewards(req: Request, res: Response): Promise<void> {
  const userId = childUserId(req, res);
  if (!userId) return;

  const progressId = req.params.progressId?.trim();
  if (!progressId) {
    res.status(400).json({ error: 'progressId inválido.' });
    return;
  }

  try {
    const row = await prisma.userThematicMissionProgress.findFirst({
      where: { id: progressId, userId, completed: true },
    });
    if (!row) {
      res.status(404).json({ error: 'No hay recompensas pendientes para este progreso.' });
      return;
    }

    const def = THEMATIC_MISSIONS.find((m) => m.slug === row.missionSlug);
    res.json({
      claimed: true,
      reward: def?.reward ?? 'Recompensa simbólica',
      note: 'Las recompensas reales se aplican vía XP/monedas en la app principal.',
    });
  } catch (e) {
    logError('missionsApi.claim', e);
    res.status(500).json({ error: 'Error al reclamar recompensas.' });
  }
}
