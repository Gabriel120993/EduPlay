import type { Request, Response } from "express";
import { FriendStatus } from "@prisma/client";
import { z } from "zod";
import { logError } from "../lib/logger";
import { prisma } from "../lib/prisma";
import { formatZodError } from "../lib/validation/schemas";

function requireChild(req: Request, res: Response): string | null {
  const auth = req.auth;
  if (!auth || auth.kind !== "child") {
    res.status(403).json({ error: "Solo disponible para menores autenticados." });
    return null;
  }
  return auth.userId;
}

/** GET /api/gamification/profile */
export async function getGamificationProfile(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        level: true,
        experience: true,
        quizCoins: true,
        activityStreakDays: true,
        lastActivityStreakUtc: true,
        achievementsPublicOnProfile: true,
      },
    });
    if (!user) {
      res.status(404).json({ error: "Usuario no encontrado." });
      return;
    }
    const snapshot = await prisma.userGamificationSnapshot.findUnique({ where: { userId } });
    res.json({ profile: user, snapshot });
  } catch (e) {
    logError("gamificationApi.profile", e);
    res.status(500).json({ error: "Error al cargar perfil de gamificación." });
  }
}

/** GET /api/gamification/achievements */
export async function listAllAchievements(_req: Request, res: Response): Promise<void> {
  try {
    const rows = await prisma.achievement.findMany({
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      take: 500,
    });
    res.json({ achievements: rows });
  } catch (e) {
    logError("gamificationApi.listAllAchievements", e);
    res.status(500).json({ error: "Error al listar logros." });
  }
}

/** GET /api/gamification/my-achievements */
export async function listMyAchievements(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;

  try {
    const rows = await prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
      orderBy: { obtainedAt: "desc" },
      take: 200,
    });
    res.json({
      achievements: rows.map((r) => ({
        obtainedAt: r.obtainedAt.toISOString(),
        achievement: r.achievement,
      })),
    });
  } catch (e) {
    logError("gamificationApi.listMyAchievements", e);
    res.status(500).json({ error: "Error al cargar logros." });
  }
}

/** GET /api/gamification/collections */
export async function listCollections(_req: Request, res: Response): Promise<void> {
  try {
    const grouped = await prisma.achievement.groupBy({
      by: ["collectionKey"],
      where: { collectionKey: { not: null } },
      _count: { id: true },
    });
    res.json({
      collections: grouped
        .filter((g) => g.collectionKey)
        .map((g) => ({ key: g.collectionKey, count: g._count.id })),
    });
  } catch (e) {
    logError("gamificationApi.listCollections", e);
    res.status(500).json({ error: "Error al listar colecciones." });
  }
}

/** GET /api/gamification/inventory */
export async function getMyInventory(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { quizCoins: true, level: true },
    });
    const interests = await prisma.userInterest.findMany({ where: { userId } });
    res.json({
      coins: user?.quizCoins ?? 0,
      level: user?.level ?? 1,
      interests,
      items: [],
      note: "Inventario de ítems cosméticos: pendiente de catálogo dedicado.",
    });
  } catch (e) {
    logError("gamificationApi.getMyInventory", e);
    res.status(500).json({ error: "Error al cargar inventario." });
  }
}

const equipSchema = z.object({
  slot: z.string().trim().max(32).optional(),
});

/** POST /api/gamification/equip/:itemId */
export async function postEquipItem(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;

  const parsed = equipSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }

  const itemId = req.params.itemId?.trim();
  if (!itemId) {
    res.status(400).json({ error: "itemId inválido." });
    return;
  }

  res.status(501).json({
    error: "Equipamiento de ítems aún no está disponible en esta versión de la API.",
    code: "NOT_IMPLEMENTED",
    itemId,
  });
}

const leaderboardQuerySchema = z.object({
  scope: z.enum(["global", "friends", "country"]).optional().default("global"),
  country: z.string().trim().max(3).optional(),
});

/** GET /api/gamification/leaderboard */
export async function getGamificationLeaderboard(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;

  const parsed = leaderboardQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }

  try {
    const take = 25;
    if (parsed.data.scope === "friends") {
      const friends = await prisma.friend.findMany({
        where: {
          OR: [
            { userId, status: FriendStatus.ACCEPTED },
            { friendId: userId, status: FriendStatus.ACCEPTED },
          ],
        },
        select: { userId: true, friendId: true },
      });
      const ids = new Set<string>([userId]);
      for (const f of friends) {
        ids.add(f.userId === userId ? f.friendId : f.userId);
      }
      const users = await prisma.user.findMany({
        where: { id: { in: [...ids] } },
        orderBy: [{ level: "desc" }, { experience: "desc" }],
        take,
        select: { id: true, username: true, realName: true, level: true, experience: true, avatarUrl: true },
      });
      res.json({ scope: "friends", leaderboard: users.map((u, i) => ({ rank: i + 1, ...u })) });
      return;
    }

    if (parsed.data.scope === "country") {
      res.status(501).json({
        error: "Ranking por país requiere campo país en el perfil.",
        code: "NOT_IMPLEMENTED",
      });
      return;
    }

    const users = await prisma.user.findMany({
      orderBy: [{ level: "desc" }, { experience: "desc" }],
      take,
      select: { id: true, username: true, realName: true, level: true, experience: true, avatarUrl: true },
    });
    res.json({
      scope: "global",
      leaderboard: users.map((u, i) => ({ rank: i + 1, ...u })),
    });
  } catch (e) {
    logError("gamificationApi.leaderboard", e);
    res.status(500).json({ error: "Error al cargar ranking." });
  }
}

/** GET /api/gamification/leaderboard/:category */
export async function getGamificationLeaderboardByCategory(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;

  const category = req.params.category?.trim();
  if (!category) {
    res.status(400).json({ error: "Categoría inválida." });
    return;
  }

  try {
    const interests = await prisma.userInterest.findMany({
      where: { category: category as never },
      orderBy: { score: "desc" },
      take: 25,
      include: { user: { select: { id: true, username: true, realName: true, avatarUrl: true, level: true } } },
    });
    res.json({
      category,
      leaderboard: interests.map((r, i) => ({
        rank: i + 1,
        score: r.score,
        user: r.user,
      })),
    });
  } catch (e) {
    logError("gamificationApi.leaderboardCategory", e);
    res.status(500).json({ error: "Error al cargar ranking por categoría." });
  }
}
