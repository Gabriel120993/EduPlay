import type { Request, Response } from 'express';
import { PostType, Prisma, Visibility, XpGainSource } from '@prisma/client';
import { toApiAchievementEntity, toApiBadge } from '../lib/achievementApi';
import { formatAchievementUnlockPostContent } from '../lib/achievementPost';
import {
  applyAchievementMissionProgress,
  applyEarnXpMissionProgress,
  maybeGrantDailyChallengeBonus,
} from '../lib/missionProgress';
import { recordXpGain } from '../lib/xpLedger';
import { ACHIEVEMENT_XP_REWARD, addExperience } from '../lib/xpLevel';
import { bumpUserInterestScore, interestDeltaForAchievement } from '../lib/userInterest';
import { logError } from '../lib/logger';
import { prisma } from '../lib/prisma';

function validateCreateUserAchievement(
  body: unknown,
): { ok: true; data: { userId: string; achievementId: string } } | { ok: false; error: string } {
  if (body === null || typeof body !== 'object') {
    return { ok: false, error: 'El cuerpo debe ser un objeto JSON.' };
  }
  const b = body as Record<string, unknown>;
  if (b.userId === undefined || b.userId === null || String(b.userId).trim() === '') {
    return { ok: false, error: 'userId es obligatorio.' };
  }
  if (
    b.achievementId === undefined ||
    b.achievementId === null ||
    String(b.achievementId).trim() === ''
  ) {
    return { ok: false, error: 'achievementId es obligatorio.' };
  }
  return {
    ok: true,
    data: {
      userId: String(b.userId).trim(),
      achievementId: String(b.achievementId).trim(),
    },
  };
}

export async function createUserAchievement(req: Request, res: Response): Promise<void> {
  const validation = validateCreateUserAchievement(req.body);
  if (!validation.ok) {
    res.status(400).json({ error: validation.error });
    return;
  }
  const { userId, achievementId } = validation.data;

  try {
    const [user, achievement] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
      prisma.achievement.findUnique({
        where: { id: achievementId },
        select: {
          id: true,
          title: true,
          description: true,
          category: true,
          iconUrl: true,
          badgeColor: true,
          badgeIcon: true,
          rarity: true,
          systemKind: true,
          hidden: true,
          collectionKey: true,
          slug: true,
          sortOrder: true,
        },
      }),
    ]);
    if (!user) {
      res.status(400).json({ error: 'userId no corresponde a un usuario existente.' });
      return;
    }
    if (!achievement) {
      res.status(400).json({ error: 'achievementId no corresponde a un logro existente.' });
      return;
    }

    const xpGained = ACHIEVEMENT_XP_REWARD;
    const interestDelta = interestDeltaForAchievement(achievement.rarity);

    const achievementPostContent = formatAchievementUnlockPostContent(
      achievement.title,
      achievement.badgeIcon,
      achievement.rarity,
    );

    const result = await prisma.$transaction(async (tx) => {
      const userAchievement = await tx.userAchievement.create({
        data: { userId, achievementId },
      });

      await bumpUserInterestScore(tx, userId, achievement.category, interestDelta);

      const post = await tx.post.create({
        data: {
          userId,
          category: achievement.category,
          type: PostType.ACHIEVEMENT,
          visibility: Visibility.PUBLIC,
          content: achievementPostContent,
          userAchievementId: userAchievement.id,
        },
      });

      const before = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { level: true, experience: true },
      });
      const next = addExperience(before.level, before.experience, xpGained);
      let userProgress = await tx.user.update({
        where: { id: userId },
        data: { level: next.level, experience: next.experience },
        select: { id: true, level: true, experience: true },
      });
      await recordXpGain(tx, userId, xpGained, XpGainSource.ACHIEVEMENT);

      const missionRewards = [
        ...(await applyAchievementMissionProgress(tx, userId)),
        ...(await applyEarnXpMissionProgress(tx, userId, xpGained)),
      ];
      const dailyChallengeBonus = await maybeGrantDailyChallengeBonus(tx, userId);

      if (missionRewards.length > 0 || dailyChallengeBonus) {
        userProgress = await tx.user.findUniqueOrThrow({
          where: { id: userId },
          select: { id: true, level: true, experience: true },
        });
      }

      return {
        userAchievement,
        post,
        userProgress: { ...userProgress, xpGained },
        missionRewards,
        dailyChallengeBonus,
      };
    });

    const badge = toApiBadge(achievement);

    res.status(201).json({
      userAchievement: result.userAchievement,
      post: { ...result.post, badge },
      userProgress: result.userProgress,
      achievement: toApiAchievementEntity(achievement),
      missionRewards: result.missionRewards,
      dailyChallengeBonus: result.dailyChallengeBonus,
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') {
        const target = err.meta?.target;
        const targetStr = Array.isArray(target) ? target.join(',') : String(target ?? '');
        if (targetStr.includes('userId') && targetStr.includes('achievementId')) {
          res.status(409).json({
            error:
              'Este usuario ya desbloqueó este logro (constraint @@unique[userId, achievementId]); no se duplica el evento ni el post.',
          });
          return;
        }
        res.status(409).json({
          error:
            'Ya existe un post vinculado a este desbloqueo (Post.userAchievementId único) o conflicto de clave duplicada.',
        });
        return;
      }
      if (err.code === 'P2003') {
        res.status(400).json({ error: 'Referencia inválida.' });
        return;
      }
    }
    logError('userAchievement', err);
    res.status(500).json({ error: 'Error al registrar el logro del usuario.' });
  }
}
