import type { Request, Response } from "express";
import { FriendStatus } from "@prisma/client";
import { z } from "zod";
import { peekScreenTimeToday } from "../lib/screenTime";
import { logError } from "../lib/logger";
import { prisma } from "../lib/prisma";
import { formatZodError } from "../lib/validation/schemas";

async function assertMinorAccess(req: Request, res: Response, minorId: string): Promise<boolean> {
  const auth = req.auth;
  if (!auth) {
    res.status(401).json({ error: "No autenticado." });
    return false;
  }
  if (auth.kind === "child" && auth.userId === minorId) {
    return true;
  }
  if (auth.kind === "parent") {
    const minor = await prisma.user.findUnique({
      where: { id: minorId },
      select: { parentId: true, type: true },
    });
    if (!minor || minor.type !== "minor" || minor.parentId !== auth.parentId) {
      res.status(403).json({ error: "No autorizado para este menor." });
      return false;
    }
    return true;
  }
  res.status(403).json({ error: "No autorizado." });
  return false;
}

/** GET /api/minors/:minorId/progress */
export async function getMinorProgress(req: Request, res: Response): Promise<void> {
  const minorId = req.params.minorId?.trim();
  if (!minorId) {
    res.status(400).json({ error: "minorId inválido." });
    return;
  }
  if (!(await assertMinorAccess(req, res, minorId))) return;

  try {
    const user = await prisma.user.findUnique({
      where: { id: minorId },
      select: {
        level: true,
        experience: true,
        quizCoins: true,
        activityStreakDays: true,
        lastActivityStreakUtc: true,
        onboardingCompletedAt: true,
      },
    });
    if (!user) {
      res.status(404).json({ error: "Usuario no encontrado." });
      return;
    }
    const missions = await prisma.userMission.count({
      where: { userId: minorId, completed: true },
    });
    const achievements = await prisma.userAchievement.count({ where: { userId: minorId } });
    res.json({
      progress: {
        ...user,
        missionsCompleted: missions,
        achievementsUnlocked: achievements,
      },
    });
  } catch (e) {
    logError("minorsApi.getMinorProgress", e);
    res.status(500).json({ error: "Error al cargar progreso." });
  }
}

/** GET /api/minors/:minorId/activity */
export async function getMinorActivity(req: Request, res: Response): Promise<void> {
  const minorId = req.params.minorId?.trim();
  if (!minorId) {
    res.status(400).json({ error: "minorId inválido." });
    return;
  }
  if (!(await assertMinorAccess(req, res, minorId))) return;

  try {
    const events = await prisma.analyticsEvent.findMany({
      where: { userId: minorId },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: { eventName: true, metadata: true, createdAt: true },
    });
    res.json({ activity: events });
  } catch (e) {
    logError("minorsApi.getMinorActivity", e);
    res.status(500).json({ error: "Error al cargar actividad." });
  }
}

/** GET /api/minors/:minorId/stats */
export async function getMinorStats(req: Request, res: Response): Promise<void> {
  const minorId = req.params.minorId?.trim();
  if (!minorId) {
    res.status(400).json({ error: "minorId inválido." });
    return;
  }
  if (!(await assertMinorAccess(req, res, minorId))) return;

  try {
    const [quizAttempts, gameResults, xpSum] = await Promise.all([
      prisma.quizAttempt.count({ where: { userId: minorId } }),
      prisma.gameResult.count({ where: { userId: minorId } }),
      prisma.xpGainLedger.aggregate({
        where: { userId: minorId },
        _sum: { amount: true },
      }),
    ]);
    res.json({
      stats: {
        quizAttempts,
        gameResults,
        totalXpGained: xpSum._sum.amount ?? 0,
      },
    });
  } catch (e) {
    logError("minorsApi.getMinorStats", e);
    res.status(500).json({ error: "Error al cargar estadísticas." });
  }
}

/** GET /api/minors/:minorId/friends */
export async function getMinorFriends(req: Request, res: Response): Promise<void> {
  const minorId = req.params.minorId?.trim();
  if (!minorId) {
    res.status(400).json({ error: "minorId inválido." });
    return;
  }
  if (!(await assertMinorAccess(req, res, minorId))) return;

  try {
    const friends = await prisma.friend.findMany({
      where: {
        OR: [
          { userId: minorId, status: FriendStatus.ACCEPTED },
          { friendId: minorId, status: FriendStatus.ACCEPTED },
        ],
      },
      take: 200,
    });
    const ids = new Set<string>();
    for (const f of friends) {
      ids.add(f.userId === minorId ? f.friendId : f.userId);
    }
    const users = await prisma.user.findMany({
      where: { id: { in: [...ids] } },
      select: { id: true, username: true, realName: true, avatarUrl: true, level: true },
    });
    res.json({ friends: users });
  } catch (e) {
    logError("minorsApi.getMinorFriends", e);
    res.status(500).json({ error: "Error al listar amigos." });
  }
}

const timeUsageQuerySchema = z.object({
  day: z.string().trim().optional(),
});

/** GET /api/minors/:minorId/time-usage — principalmente para tutores */
export async function getMinorTimeUsage(req: Request, res: Response): Promise<void> {
  const minorId = req.params.minorId?.trim();
  if (!minorId) {
    res.status(400).json({ error: "minorId inválido." });
    return;
  }
  const auth = req.auth;
  if (auth?.kind !== "parent") {
    res.status(403).json({ error: "Solo el tutor puede ver el uso de tiempo detallado." });
    return;
  }
  if (!(await assertMinorAccess(req, res, minorId))) return;

  const parsed = timeUsageQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }

  try {
    const peek = await peekScreenTimeToday(minorId);
    res.json({
      timeUsage: {
        dailyLimitMinutes: peek?.dailyLimitMinutes ?? null,
        usedTodaySeconds: peek?.usedTodaySeconds ?? 0,
        isUnlimited: peek?.isUnlimited ?? false,
        lastReset: null,
        peekToday: peek,
      },
    });
  } catch (e) {
    logError("minorsApi.getMinorTimeUsage", e);
    res.status(500).json({ error: "Error al cargar tiempo de pantalla." });
  }
}
