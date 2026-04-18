import type { Request, Response } from "express";
import { AchievementSystemKind, FriendStatus } from "@prisma/client";

import { toApiAchievementEntity } from "../lib/achievementApi";
import { levelTierFromUserLevel } from "../lib/achievementLevelTiers";
import { logError } from "../lib/logger";
import { prisma } from "../lib/prisma";
import { ensureAchievementSystemCatalog } from "../services/achievementSystemEnsure.service";

function assertChild(req: Request, userId: string): boolean {
  const auth = req.auth;
  return Boolean(auth && auth.kind === "child" && auth.userId === userId);
}

async function assertFriendsAccepted(a: string, b: string): Promise<boolean> {
  const row = await prisma.friend.findFirst({
    where: {
      status: FriendStatus.ACCEPTED,
      OR: [
        { userId: a, friendId: b },
        { userId: b, friendId: a },
      ],
    },
    select: { id: true },
  });
  return Boolean(row);
}

const COLLECTION_LABELS: Record<string, string> = {
  scientists: "Científicos",
  explorers: "Exploradores",
  artists: "Artistas",
  animals: "Animales",
  countries: "Países",
};

/**
 * GET /achievements/system/overview
 * Catálogo completo del sistema de logros + estado del usuario + bandas de nivel.
 */
export async function getAchievementSystemOverview(req: Request, res: Response): Promise<void> {
  const userId = typeof req.query.userId === "string" ? req.query.userId.trim() : "";
  if (!userId) {
    res.status(400).json({ error: "userId es obligatorio." });
    return;
  }
  if (!assertChild(req, userId)) {
    res.status(403).json({ error: "Solo el menor puede consultar su sistema de logros." });
    return;
  }

  try {
    await ensureAchievementSystemCatalog();
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { level: true, achievementsPublicOnProfile: true },
    });
    if (!user) {
      res.status(404).json({ error: "Usuario no encontrado." });
      return;
    }

    const [all, mine] = await Promise.all([
      prisma.achievement.findMany({
        where: { slug: { not: null } },
        orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      }),
      prisma.userAchievement.findMany({
        where: { userId },
        select: { achievementId: true, obtainedAt: true },
      }),
    ]);

    const unlockedSet = new Set(mine.map((m) => m.achievementId));
    const obtainedAt = new Map(mine.map((m) => [m.achievementId, m.obtainedAt.toISOString()]));

    const byKind: Partial<Record<AchievementSystemKind, { unlocked: number; total: number }>> = {};
    for (const k of Object.values(AchievementSystemKind)) {
      byKind[k] = { unlocked: 0, total: 0 };
    }

    const collectionTotals = new Map<string, { unlocked: number; total: number }>();

    for (const a of all) {
      const k = a.systemKind;
      if (byKind[k]) {
        byKind[k]!.total += 1;
        if (unlockedSet.has(a.id)) byKind[k]!.unlocked += 1;
      }
      if (a.collectionKey) {
        const cur = collectionTotals.get(a.collectionKey) ?? { unlocked: 0, total: 0 };
        cur.total += 1;
        if (unlockedSet.has(a.id)) cur.unlocked += 1;
        collectionTotals.set(a.collectionKey, cur);
      }
    }

    const items = all.map((a) => {
      const unlocked = unlockedSet.has(a.id);
      const base = toApiAchievementEntity(a);
      const hiddenLocked = a.hidden && !unlocked;
      return {
        ...base,
        systemKind: a.systemKind,
        collectionKey: a.collectionKey,
        slug: a.slug,
        hidden: a.hidden,
        unlocked,
        obtainedAt: unlocked ? obtainedAt.get(a.id) ?? null : null,
        displayTitle: hiddenLocked ? "Logro oculto" : a.title,
        displayDescription: hiddenLocked ? "Seguí explorando EduPlay para descubrirlo." : a.description,
        certificateUrl: a.collectionKey
          ? `/api/users/${encodeURIComponent(userId)}/certificates/collection/${encodeURIComponent(a.collectionKey)}`
          : null,
      };
    });

    const collections = [...collectionTotals.entries()].map(([key, v]) => ({
      key,
      label: COLLECTION_LABELS[key] ?? key,
      unlocked: v.unlocked,
      total: v.total,
      complete: v.unlocked >= v.total && v.total > 0,
      certificateUrl: `/api/users/${encodeURIComponent(userId)}/certificates/collection/${encodeURIComponent(key)}`,
    }));

    res.json({
      level: user.level,
      levelTier: levelTierFromUserLevel(user.level),
      achievementsPublicOnProfile: user.achievementsPublicOnProfile,
      stats: {
        unlockedTotal: mine.length,
        catalogTotal: all.length,
        byKind,
      },
      collections,
      exhibition: {
        publicProfileToggle: true,
        friendCompare: true,
        trophyWall: true,
        downloadableCertificates: collections.filter((c) => c.complete).map((c) => ({
          collectionKey: c.key,
          url: c.certificateUrl,
        })),
      },
      items,
    });
  } catch (err) {
    logError("achievements.system.overview", err);
    res.status(500).json({ error: "Error al cargar el sistema de logros." });
  }
}

/**
 * GET /achievements/system/compare?userId=&peerId=
 * Comparativa simple con un amigo (solo si hay amistad aceptada).
 */
export async function getAchievementSystemCompare(req: Request, res: Response): Promise<void> {
  const userId = typeof req.query.userId === "string" ? req.query.userId.trim() : "";
  const peerId = typeof req.query.peerId === "string" ? req.query.peerId.trim() : "";
  if (!userId || !peerId) {
    res.status(400).json({ error: "userId y peerId son obligatorios." });
    return;
  }
  if (!assertChild(req, userId)) {
    res.status(403).json({ error: "Solo el menor puede comparar su progreso." });
    return;
  }

  try {
    const ok = await assertFriendsAccepted(userId, peerId);
    if (!ok) {
      res.status(403).json({ error: "Solo podés compararte con amigos aceptados." });
      return;
    }

    await ensureAchievementSystemCatalog();
    const totalCatalog = await prisma.achievement.count({ where: { slug: { not: null } } });

    const [me, peer, peerUser] = await Promise.all([
      prisma.userAchievement.count({ where: { userId } }),
      prisma.userAchievement.count({ where: { userId: peerId } }),
      prisma.user.findUnique({
        where: { id: peerId },
        select: { username: true, level: true },
      }),
    ]);

    if (!peerUser) {
      res.status(404).json({ error: "Peer no encontrado." });
      return;
    }

    res.json({
      catalogTotal: totalCatalog,
      you: { userId, unlocked: me },
      peer: { userId: peerId, username: peerUser.username, level: peerUser.level, unlocked: peer },
      delta: me - peer,
    });
  } catch (err) {
    logError("achievements.system.compare", err);
    res.status(500).json({ error: "Error al comparar logros." });
  }
}

/**
 * PATCH /achievements/system/profile-visibility
 * Body: { userId, public: boolean }
 */
export async function patchAchievementProfileVisibility(req: Request, res: Response): Promise<void> {
  const body = req.body as { userId?: unknown; public?: unknown };
  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  const pub = body.public === true;
  if (!userId) {
    res.status(400).json({ error: "userId es obligatorio." });
    return;
  }
  if (!assertChild(req, userId)) {
    res.status(403).json({ error: "No autorizado." });
    return;
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { achievementsPublicOnProfile: pub },
    });
    res.json({ achievementsPublicOnProfile: pub });
  } catch (err) {
    logError("achievements.system.visibility", err);
    res.status(500).json({ error: "Error al actualizar visibilidad." });
  }
}
