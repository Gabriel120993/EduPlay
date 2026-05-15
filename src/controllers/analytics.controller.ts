/**
 * Consultas SQL crudas: usar siempre `Prisma.sql` con interpolación `${valor}`.
 * Prisma envía esos valores como parámetros enlazados (no concatenación), lo que mitiga inyección SQL.
 * No uses plantillas de cadena normales para armar SQL con entrada del cliente.
 */
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';

import { logError } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { sanitizeShortUserText } from '../lib/sanitizeUserInput';
import { utcDayStart } from '../lib/screenTime';
import { parseUuidParam } from '../lib/validation/schemas';
import { XP_PER_LEVEL } from '../lib/xpLevel';

const SUMMARY_TOP_LIMIT = 10;

type AnalyticsBody = {
  eventName?: unknown;
  metadata?: unknown;
};

export async function postAnalytics(req: Request, res: Response): Promise<void> {
  const auth = req.auth;
  if (!auth || auth.kind !== 'child') {
    res.status(401).json({ error: 'No autenticado.' });
    return;
  }

  const body = req.body as AnalyticsBody;
  const rawName =
    typeof body.eventName === 'string' ? sanitizeShortUserText(body.eventName, 128) : '';
  if (!rawName) {
    res.status(400).json({ error: 'eventName es obligatorio.' });
    return;
  }

  let metadata: Prisma.InputJsonValue = {};
  if (body.metadata !== undefined && body.metadata !== null) {
    if (typeof body.metadata !== 'object' || Array.isArray(body.metadata)) {
      res.status(400).json({ error: 'metadata debe ser un objeto JSON.' });
      return;
    }
    metadata = body.metadata as Prisma.InputJsonValue;
  }

  /** Siempre el menor de la sesión (no se acepta `userId` del body para evitar suplantación). */
  const userId = auth.userId;

  const row = await prisma.analyticsEvent.create({
    data: {
      eventName: rawName,
      metadata,
      userId,
    },
  });

  res.status(201).json({
    id: row.id,
    eventName: row.eventName,
    userId: row.userId,
    createdAt: row.createdAt.toISOString(),
  });
}

type ActiveUserRow = {
  id: string;
  username: string;
  realName: string;
  postCount: number;
  reactionCount: number;
};

type CategoryCountRow = {
  category: string;
  count: number;
};

/** GET /api/analytics/summary — métricas agregadas (tutor + `checkPremium`). */
export async function getAnalyticsSummary(_req: Request, res: Response): Promise<void> {
  const [totalUsers, totalPosts, totalReactions, categoryRows, activeRows] = await Promise.all([
    prisma.user.count(),
    prisma.post.count(),
    prisma.reaction.count(),
    prisma.$queryRaw<CategoryCountRow[]>(Prisma.sql`
      SELECT category::text AS "category", COUNT(*)::int AS "count"
      FROM "Post"
      WHERE category IS NOT NULL
      GROUP BY category
      ORDER BY COUNT(*) DESC
      LIMIT ${SUMMARY_TOP_LIMIT}
    `),
    prisma.$queryRaw<ActiveUserRow[]>(Prisma.sql`
      SELECT u.id,
        u.username,
        u."realName" AS "realName",
        (SELECT COUNT(*)::int FROM "Post" p WHERE p."userId" = u.id) AS "postCount",
        (SELECT COUNT(*)::int FROM "Reaction" r WHERE r."userId" = u.id) AS "reactionCount"
      FROM "User" u
      ORDER BY
        (SELECT COUNT(*)::int FROM "Post" p WHERE p."userId" = u.id) +
        (SELECT COUNT(*)::int FROM "Reaction" r WHERE r."userId" = u.id) DESC
      LIMIT ${SUMMARY_TOP_LIMIT}
    `),
  ]);

  const topCategories = categoryRows.map((r) => ({
    category: r.category,
    count: r.count,
  }));

  const mostActiveUsers = activeRows.map((r) => ({
    userId: r.id,
    username: r.username,
    realName: r.realName,
    postCount: r.postCount,
    reactionCount: r.reactionCount,
    activityScore: r.postCount + r.reactionCount,
  }));

  res.json({
    totalUsers,
    totalPosts,
    totalReactions,
    topCategories,
    mostActiveUsers,
  });
}

function last7UtcDateStrings(): string[] {
  const out: string[] = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function weekStartUtcDate(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - 6);
  return d;
}

type DayMetricRow = { userId: string; day: string; total: number };

function mergeWeeklyDays(
  days: string[],
  xpByDay: Map<string, number>,
  gamesByDay: Map<string, number>,
  missionsByDay: Map<string, number>,
): {
  date: string;
  xpGained: number;
  gamesPlayed: number;
  missionsCompleted: number;
  activityScore: number;
}[] {
  return days.map((date) => {
    const xpGained = xpByDay.get(date) ?? 0;
    const gamesPlayed = gamesByDay.get(date) ?? 0;
    const missionsCompleted = missionsByDay.get(date) ?? 0;
    const activityScore = xpGained + gamesPlayed * 3 + missionsCompleted * 5;
    return { date, xpGained, gamesPlayed, missionsCompleted, activityScore };
  });
}

/** GET /api/analytics/parent/:parentId — por hijo (premium; `checkPremium` en ruta). */
export async function getParentChildAnalytics(req: Request, res: Response): Promise<void> {
  const idParsed = parseUuidParam(req.params.parentId);
  if (!idParsed.ok) {
    res.status(400).json({ error: idParsed.error });
    return;
  }
  const parentId = idParsed.uuid;

  const auth = req.auth;
  if (!auth || auth.kind !== 'parent' || auth.parentId !== parentId) {
    res.status(403).json({ error: 'No autorizado.' });
    return;
  }

  const weekStart = weekStartUtcDate();
  const dayKeys = last7UtcDateStrings();

  try {
    const children = await prisma.user.findMany({
      where: { parentId },
      select: {
        id: true,
        username: true,
        realName: true,
        level: true,
        experience: true,
        dailyTimeUsages: {
          where: { date: utcDayStart() },
          take: 1,
          select: { usedSeconds: true },
        },
        parentSettings: { select: { dailyScreenTimeLimit: true } },
      },
      orderBy: { username: 'asc' },
    });

    if (children.length === 0) {
      res.json({ children: [] });
      return;
    }

    const childIds = children.map((c) => c.id);

    const [
      xpRows,
      gameRows,
      missionRows,
      interestRows,
      gameCatRows,
      missionTotals,
      achievementTotals,
      gameTotals,
    ] = await Promise.all([
      prisma.$queryRaw<DayMetricRow[]>(Prisma.sql`
          SELECT x."userId" AS "userId",
            to_char(date_trunc('day', x."createdAt" AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
            SUM(x.amount)::int AS total
          FROM "XpGainLedger" x
          INNER JOIN "User" u ON u.id = x."userId"
          WHERE u."parentId" = ${parentId}
            AND x."createdAt" >= ${weekStart}
          GROUP BY x."userId", date_trunc('day', x."createdAt" AT TIME ZONE 'UTC')
        `),
      prisma.$queryRaw<DayMetricRow[]>(Prisma.sql`
          SELECT gr."userId" AS "userId",
            to_char(date_trunc('day', gr."createdAt" AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
            COUNT(*)::int AS total
          FROM "GameResult" gr
          INNER JOIN "User" u ON u.id = gr."userId"
          WHERE u."parentId" = ${parentId}
            AND gr."createdAt" >= ${weekStart}
          GROUP BY gr."userId", date_trunc('day', gr."createdAt" AT TIME ZONE 'UTC')
        `),
      prisma.$queryRaw<DayMetricRow[]>(Prisma.sql`
          SELECT um."userId" AS "userId",
            to_char(um.date, 'YYYY-MM-DD') AS day,
            COUNT(*)::int AS total
          FROM "UserMission" um
          INNER JOIN "User" u ON u.id = um."userId"
          WHERE u."parentId" = ${parentId}
            AND um.completed = true
            AND um.date >= ${weekStart}
          GROUP BY um."userId", um.date
        `),
      prisma.userInterest.findMany({
        where: { userId: { in: childIds } },
        select: { userId: true, category: true, score: true },
        orderBy: [{ userId: 'asc' }, { score: 'desc' }],
      }),
      prisma.$queryRaw<{ userId: string; category: string; n: number }[]>(Prisma.sql`
          SELECT gr."userId" AS "userId", g.category::text AS category, COUNT(*)::int AS n
          FROM "GameResult" gr
          INNER JOIN "Game" g ON g.id = gr."gameId"
          INNER JOIN "User" u ON u.id = gr."userId"
          WHERE u."parentId" = ${parentId}
          GROUP BY gr."userId", g.category
        `),
      prisma.userMission.groupBy({
        by: ['userId'],
        where: { userId: { in: childIds }, completed: true },
        _count: { _all: true },
      }),
      prisma.userAchievement.groupBy({
        by: ['userId'],
        where: { userId: { in: childIds } },
        _count: { _all: true },
      }),
      prisma.gameResult.groupBy({
        by: ['userId'],
        where: { userId: { in: childIds } },
        _count: { _all: true },
      }),
    ]);

    const xpMap = new Map<string, Map<string, number>>();
    const gameMap = new Map<string, Map<string, number>>();
    const missionMap = new Map<string, Map<string, number>>();

    for (const row of xpRows) {
      if (!xpMap.has(row.userId)) xpMap.set(row.userId, new Map());
      xpMap.get(row.userId)!.set(row.day, row.total);
    }
    for (const row of gameRows) {
      if (!gameMap.has(row.userId)) gameMap.set(row.userId, new Map());
      gameMap.get(row.userId)!.set(row.day, row.total);
    }
    for (const row of missionRows) {
      if (!missionMap.has(row.userId)) missionMap.set(row.userId, new Map());
      missionMap.get(row.userId)!.set(row.day, row.total);
    }

    const missionCountByUser = new Map(missionTotals.map((m) => [m.userId, m._count._all]));
    const achievementCountByUser = new Map(achievementTotals.map((m) => [m.userId, m._count._all]));
    const gameCountByUser = new Map(gameTotals.map((m) => [m.userId, m._count._all]));

    const gameCatByUser = new Map<string, Map<string, number>>();
    for (const row of gameCatRows) {
      if (!gameCatByUser.has(row.userId)) gameCatByUser.set(row.userId, new Map());
      gameCatByUser.get(row.userId)!.set(row.category, row.n);
    }

    const interestsByUser = new Map<string, { category: string; score: number }[]>();
    for (const row of interestRows) {
      if (!interestsByUser.has(row.userId)) interestsByUser.set(row.userId, []);
      const list = interestsByUser.get(row.userId)!;
      if (list.length < 8) {
        list.push({ category: row.category, score: row.score });
      }
    }

    const payload = children.map((c) => {
      const used = c.dailyTimeUsages[0]?.usedSeconds ?? 0;
      const limitMin = c.parentSettings?.dailyScreenTimeLimit ?? 120;
      const xpToNext = Math.max(0, XP_PER_LEVEL - c.experience);

      const catMap = gameCatByUser.get(c.id) ?? new Map();
      const interestList = interestsByUser.get(c.id) ?? [];
      const categoriesLearned = interestList.map((it) => ({
        category: it.category,
        score: it.score,
        gameSessions: catMap.get(it.category) ?? 0,
      }));
      const extraCats = [...catMap.entries()]
        .filter(([cat]) => !interestList.some((i) => i.category === cat))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([category, gameSessions]) => ({ category, score: 0, gameSessions }));

      const weeklyActivity = mergeWeeklyDays(
        dayKeys,
        xpMap.get(c.id) ?? new Map(),
        gameMap.get(c.id) ?? new Map(),
        missionMap.get(c.id) ?? new Map(),
      );

      return {
        child: {
          id: c.id,
          username: c.username,
          realName: c.realName,
        },
        timeSpent: {
          todaySeconds: used,
          dailyLimitMinutes: limitMin,
        },
        progress: {
          level: c.level,
          experience: c.experience,
          xpToNextLevel: xpToNext,
          missionsCompleted: missionCountByUser.get(c.id) ?? 0,
          achievementsUnlocked: achievementCountByUser.get(c.id) ?? 0,
          gamesPlayed: gameCountByUser.get(c.id) ?? 0,
        },
        categoriesLearned: [...categoriesLearned, ...extraCats].slice(0, 10),
        weeklyActivity,
      };
    });

    res.json({ children: payload });
  } catch (err) {
    logError('analytics', err);
    res.status(500).json({ error: 'Error al cargar analíticas familiares.' });
  }
}
