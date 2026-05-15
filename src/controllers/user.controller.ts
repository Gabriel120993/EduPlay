import type { Request, Response } from 'express';
import { AchievementRarity, PostType, Prisma } from '@prisma/client';
import { toApiBadge, toApiProfileAchievementItem } from '../lib/achievementApi';
import { hashPassword } from '../lib/password';
import { parentIdOnlySelect, userPublicSelect } from '../lib/prismaPublicSelects';
import { logError } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { createChildUserBodySchema, formatZodError } from '../lib/validation/schemas';

const RARITY_PRIORITY: AchievementRarity[] = [
  AchievementRarity.LEGENDARY,
  AchievementRarity.EPIC,
  AchievementRarity.RARE,
  AchievementRarity.COMMON,
];

function rarityRank(r: AchievementRarity): number {
  const i = RARITY_PRIORITY.indexOf(r);
  return i === -1 ? RARITY_PRIORITY.length : i;
}

export async function createUser(req: Request, res: Response): Promise<void> {
  const parsed = createChildUserBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }

  const { username, realName, age, parentId, password } = parsed.data;

  const auth = req.auth;
  if (!auth || auth.kind !== 'parent') {
    res.status(403).json({ error: 'No autorizado.' });
    return;
  }
  if (parentId !== auth.parentId) {
    res
      .status(403)
      .json({ error: 'Solo podés dar de alta menores vinculados a tu propia cuenta.' });
    return;
  }

  try {
    const parent = await prisma.parent.findUnique({
      where: { id: parentId },
      select: parentIdOnlySelect,
    });
    if (!parent) {
      res.status(400).json({ error: 'parentId no corresponde a un padre/tutor existente.' });
      return;
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        username,
        realName,
        age,
        parentId,
        passwordHash,
        // Bloqueado hasta que el tutor apruebe en el panel (`POST .../approve-account`).
        parentAccountApprovedAt: null,
      },
      select: userPublicSelect,
    });

    res.status(201).json(user);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      res.status(409).json({ error: 'El username ya está en uso.' });
      return;
    }
    logError('user', err);
    res.status(500).json({ error: 'Error al crear el usuario.' });
  }
}

export async function listUsers(req: Request, res: Response): Promise<void> {
  const auth = req.auth;
  if (!auth || auth.kind !== 'parent') {
    res.status(403).json({ error: 'No autorizado.' });
    return;
  }

  try {
    const users = await prisma.user.findMany({
      where: { parentId: auth.parentId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: userPublicSelect,
    });
    res.json(users);
  } catch (err) {
    logError('user', err);
    res.status(500).json({ error: 'Error al listar usuarios' });
  }
}

type ProfileAchievementRow = {
  obtainedAt: Date;
  achievement: {
    title: string;
    badgeColor: string;
    badgeIcon: string;
    rarity: AchievementRarity;
  };
};

function sortAchievementsByRarityThenDate(rows: ProfileAchievementRow[]): ProfileAchievementRow[] {
  return [...rows].sort((a, b) => {
    const ra = rarityRank(a.achievement.rarity);
    const rb = rarityRank(b.achievement.rarity);
    if (ra !== rb) return ra - rb;
    return b.obtainedAt.getTime() - a.obtainedAt.getTime();
  });
}

function toProfileAchievementEntry(a: ProfileAchievementRow['achievement']) {
  return toApiProfileAchievementItem(a);
}

export async function getUserProfile(req: Request, res: Response): Promise<void> {
  const id = req.params.id?.trim();
  if (!id) {
    res.status(400).json({ error: 'id de usuario es obligatorio.' });
    return;
  }

  try {
    const row = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        level: true,
        experience: true,
        _count: {
          select: {
            posts: true,
            achievements: true,
            gameResults: true,
          },
        },
        interests: {
          orderBy: { score: 'desc' },
          select: { category: true, score: true },
        },
        notificationsEnabled: true,
        notificationSoundsEnabled: true,
        posts: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            content: true,
            imageUrl: true,
            videoUrl: true,
            mediaModerationFlagged: true,
            mediaModerationNote: true,
            category: true,
            type: true,
            visibility: true,
            createdAt: true,
            userAchievement: {
              select: {
                achievement: {
                  select: {
                    title: true,
                    category: true,
                    badgeIcon: true,
                    badgeColor: true,
                    rarity: true,
                  },
                },
              },
            },
            gameResult: {
              select: {
                game: { select: { category: true } },
              },
            },
          },
        },
        achievements: {
          select: {
            obtainedAt: true,
            achievement: {
              select: {
                title: true,
                badgeColor: true,
                badgeIcon: true,
                rarity: true,
              },
            },
          },
        },
      },
    });

    if (!row) {
      res.status(404).json({ error: 'Usuario no encontrado.' });
      return;
    }

    const {
      _count,
      posts,
      achievements,
      interests,
      notificationsEnabled,
      notificationSoundsEnabled,
      ...user
    } = row;
    const sortedAchievements = sortAchievementsByRarityThenDate(achievements);
    const featuredBadges = sortedAchievements
      .slice(0, 3)
      .map((row) => toProfileAchievementEntry(row.achievement));

    res.json({
      user: {
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
        level: user.level,
        experience: user.experience,
      },
      stats: {
        totalPosts: _count.posts,
        totalAchievements: _count.achievements,
        totalGameResults: _count.gameResults,
      },
      featuredBadges,
      preferences: {
        notificationsEnabled,
        notificationSoundsEnabled,
      },
      interests: interests.map((i) => ({ category: i.category, score: i.score })),
      recentPosts: posts.map((p) => {
        const ach = p.userAchievement?.achievement;
        const badge = p.type === PostType.ACHIEVEMENT && ach ? toApiBadge(ach) : undefined;
        const categoryResolved =
          p.category != null && String(p.category).trim() !== ''
            ? String(p.category).trim()
            : ach?.category?.trim() || p.gameResult?.game?.category?.trim() || undefined;
        return {
          id: p.id,
          content: p.content,
          imageUrl: p.imageUrl,
          videoUrl: p.videoUrl,
          mediaModerationFlagged: p.mediaModerationFlagged,
          mediaModerationNote: p.mediaModerationNote,
          ...(categoryResolved ? { category: categoryResolved } : {}),
          type: p.type,
          visibility: p.visibility,
          createdAt: p.createdAt.toISOString(),
          ...(badge ? { badge } : {}),
        };
      }),
      achievements: sortedAchievements.map((a) => toProfileAchievementEntry(a.achievement)),
    });
  } catch (err) {
    logError('user', err);
    res.status(500).json({ error: 'Error al obtener el perfil.' });
  }
}

/** Registra o borra el token Expo Push del menor (sesión hijo, mismo `id` que el token JWT). */
export async function postPushToken(req: Request, res: Response): Promise<void> {
  const auth = req.auth;
  if (!auth || auth.kind !== 'child') {
    res
      .status(403)
      .json({ error: 'Solo la cuenta menor puede registrar el token de notificaciones.' });
    return;
  }

  const userId = typeof req.params.id === 'string' ? req.params.id.trim() : '';
  if (!userId || userId !== auth.userId) {
    res.status(403).json({ error: 'No podés modificar el token de otro usuario.' });
    return;
  }

  const body = req.body as { token?: unknown };
  const raw = body.token;

  try {
    if (raw === null || raw === undefined) {
      await prisma.user.update({
        where: { id: userId },
        data: { expoPushToken: null },
      });
      res.status(204).send();
      return;
    }

    if (typeof raw !== 'string') {
      res.status(400).json({ error: 'token debe ser un string o null.' });
      return;
    }

    const trimmed = raw.trim();
    if (trimmed.length === 0) {
      await prisma.user.update({
        where: { id: userId },
        data: { expoPushToken: null },
      });
      res.status(204).send();
      return;
    }

    if (trimmed.length > 8000) {
      res.status(400).json({ error: 'token demasiado largo.' });
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { expoPushToken: trimmed },
    });
    res.status(204).send();
  } catch (err) {
    logError('user', err);
    res.status(500).json({ error: 'Error al guardar el token de notificaciones.' });
  }
}

type PatchUserPreferencesBody = {
  notificationsEnabled?: unknown;
  notificationSoundsEnabled?: unknown;
};

/** Actualiza preferencias del menor (notificaciones / sonidos de notificación). */
export async function patchUserPreferences(req: Request, res: Response): Promise<void> {
  const auth = req.auth;
  if (!auth || auth.kind !== 'child') {
    res.status(403).json({ error: 'Solo la cuenta menor puede actualizar sus preferencias.' });
    return;
  }

  const userId = typeof req.params.id === 'string' ? req.params.id.trim() : '';
  if (!userId || userId !== auth.userId) {
    res.status(403).json({ error: 'No podés modificar las preferencias de otro usuario.' });
    return;
  }

  const body = req.body as PatchUserPreferencesBody;
  const data: { notificationsEnabled?: boolean; notificationSoundsEnabled?: boolean } = {};

  if (body.notificationsEnabled !== undefined) {
    if (typeof body.notificationsEnabled !== 'boolean') {
      res.status(400).json({ error: 'notificationsEnabled debe ser un booleano.' });
      return;
    }
    data.notificationsEnabled = body.notificationsEnabled;
  }
  if (body.notificationSoundsEnabled !== undefined) {
    if (typeof body.notificationSoundsEnabled !== 'boolean') {
      res.status(400).json({ error: 'notificationSoundsEnabled debe ser un booleano.' });
      return;
    }
    data.notificationSoundsEnabled = body.notificationSoundsEnabled;
  }

  if (Object.keys(data).length === 0) {
    res.status(400).json({ error: 'Ninguna preferencia para actualizar.' });
    return;
  }

  try {
    const updated = await prisma.user.update({
      where: { id: userId },
      data,
      select: { notificationsEnabled: true, notificationSoundsEnabled: true },
    });
    res.json({
      preferences: {
        notificationsEnabled: updated.notificationsEnabled,
        notificationSoundsEnabled: updated.notificationSoundsEnabled,
      },
    });
  } catch (err) {
    logError('user', err);
    res.status(500).json({ error: 'Error al guardar las preferencias.' });
  }
}
