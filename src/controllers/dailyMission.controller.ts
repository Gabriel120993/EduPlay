import type { Request, Response } from 'express';

import { DAILY_CHALLENGE_BONUS_XP } from '../lib/dailyChallengeConstants';
import { generateDailyMissionsForUser } from '../lib/dailyMissionGenerator';
import { MISSION_COMPLETION_XP_RANGE, utcMissionDate } from '../lib/missionProgress';
import { logError } from '../lib/logger';
import { prisma } from '../lib/prisma';

export async function getTodayDailyMissions(req: Request, res: Response): Promise<void> {
  const id = req.params.id?.trim();
  if (!id) {
    res.status(400).json({ error: 'id de usuario es obligatorio.' });
    return;
  }

  try {
    await generateDailyMissionsForUser(id);
    const date = utcMissionDate();
    const [rows, bonusRow] = await Promise.all([
      prisma.userMission.findMany({
        where: { userId: id, date },
        orderBy: [{ completed: 'asc' }, { id: 'asc' }],
        include: {
          mission: { select: { title: true, targetValue: true, type: true } },
        },
      }),
      prisma.dailyChallengeBonus.findUnique({
        where: { userId_date: { userId: id, date } },
        select: { bonusXp: true, createdAt: true },
      }),
    ]);

    res.json({
      date: date.toISOString().slice(0, 10),
      rewardXpRange: MISSION_COMPLETION_XP_RANGE,
      /** XP extra al completar las 3 misiones del día (una vez por día). */
      dailyChallengeBonusXp: DAILY_CHALLENGE_BONUS_XP,
      dailyChallengeBonus: bonusRow
        ? { granted: true, bonusXp: bonusRow.bonusXp, grantedAt: bonusRow.createdAt.toISOString() }
        : { granted: false },
      missions: rows.map((r) => ({
        userMissionId: r.id,
        title: r.mission.title,
        targetValue: r.mission.targetValue,
        progress: r.progress,
        completed: r.completed,
        rewardXpGranted: r.rewardXpGranted,
        type: r.mission.type,
      })),
    });
  } catch (err) {
    if (err instanceof Error && err.message === 'USER_NOT_FOUND') {
      res.status(404).json({ error: 'Usuario no encontrado.' });
      return;
    }
    if (err instanceof Error && err.message === 'MISSION_CATALOG_INSUFFICIENT') {
      res.status(400).json({ error: 'Catálogo de misiones insuficiente.' });
      return;
    }
    logError('dailyMission', err);
    res.status(500).json({ error: 'Error al obtener las misiones del día.' });
  }
}

export async function postGenerateDailyMissions(req: Request, res: Response): Promise<void> {
  const id = req.params.id?.trim();
  if (!id) {
    res.status(400).json({ error: 'id de usuario es obligatorio.' });
    return;
  }

  try {
    const result = await generateDailyMissionsForUser(id);
    res.status(result.created ? 201 : 200).json(result);
  } catch (err) {
    if (err instanceof Error && err.message === 'USER_NOT_FOUND') {
      res.status(404).json({ error: 'Usuario no encontrado.' });
      return;
    }
    if (err instanceof Error && err.message === 'MISSION_CATALOG_INSUFFICIENT') {
      res.status(400).json({ error: 'Catálogo de misiones insuficiente.' });
      return;
    }
    logError('dailyMission', err);
    res.status(500).json({ error: 'Error al generar misiones diarias.' });
  }
}
