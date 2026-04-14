import type { Request, Response } from "express";
import { logError } from "../lib/logger";
import { prisma } from "../lib/prisma";
import { utcWeekRange } from "../lib/xpWeek";

const LEADERBOARD_LIMIT = 10;

const userLeaderboardSelect = {
  id: true,
  username: true,
  realName: true,
  level: true,
  experience: true,
  avatarUrl: true,
} as const;

/**
 * Ranking global: mayor nivel primero; a igual nivel, mayor experiencia (XP en el nivel actual).
 * Ranking semanal: suma de XP registrada en `XpGainLedger` desde el lunes UTC actual (fin exclusivo).
 */
export async function getLeaderboard(_req: Request, res: Response): Promise<void> {
  try {
    const { weekStartUtc, weekEndExclusiveUtc } = utcWeekRange();

    const [allTimeRows, weeklyGrouped] = await Promise.all([
      prisma.user.findMany({
        orderBy: [{ level: "desc" }, { experience: "desc" }],
        take: LEADERBOARD_LIMIT,
        select: userLeaderboardSelect,
      }),
      prisma.xpGainLedger.groupBy({
        by: ["userId"],
        where: {
          createdAt: { gte: weekStartUtc, lt: weekEndExclusiveUtc },
        },
        _sum: { amount: true },
        orderBy: { _sum: { amount: "desc" } },
        take: LEADERBOARD_LIMIT,
      }),
    ]);

    const weeklyUserIds = weeklyGrouped.map((g) => g.userId);
    const weeklyUsers =
      weeklyUserIds.length === 0
        ? []
        : await prisma.user.findMany({
            where: { id: { in: weeklyUserIds } },
            select: userLeaderboardSelect,
          });
    const weeklyById = new Map(weeklyUsers.map((u) => [u.id, u]));

    const weeklyUsersPayload = weeklyGrouped
      .map((g, index) => {
        const u = weeklyById.get(g.userId);
        if (!u) return null;
        const xpGainedThisWeek = g._sum.amount ?? 0;
        return {
          rank: index + 1,
          id: u.id,
          username: u.username,
          realName: u.realName,
          level: u.level,
          experience: u.experience,
          avatarUrl: u.avatarUrl,
          xpGainedThisWeek,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row !== null);

    res.json({
      users: allTimeRows.map((u, index) => ({
        rank: index + 1,
        id: u.id,
        username: u.username,
        realName: u.realName,
        level: u.level,
        experience: u.experience,
        avatarUrl: u.avatarUrl,
      })),
      weekly: {
        weekStartUtc: weekStartUtc.toISOString(),
        weekEndUtc: new Date(weekEndExclusiveUtc.getTime() - 1).toISOString(),
        users: weeklyUsersPayload,
      },
    });
  } catch (err) {
    logError("leaderboard", err);
    res.status(500).json({ error: "Error al obtener el ranking." });
  }
}
