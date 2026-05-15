import type { Request, Response } from 'express';
import { toApiAchievementEntity } from '../lib/achievementApi';
import { logError } from '../lib/logger';
import { prisma } from '../lib/prisma';

export async function listAchievements(_req: Request, res: Response): Promise<void> {
  try {
    const rows = await prisma.achievement.findMany({
      orderBy: { title: 'asc' },
    });
    const achievements = rows.map(toApiAchievementEntity);
    res.json({ achievements });
  } catch (err) {
    logError('achievement', err);
    res.status(500).json({ error: 'Error al listar logros.' });
  }
}
