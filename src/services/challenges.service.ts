import {
  AchievementRarity,
  ChallengeBucket,
  ContentCategory,
  Prisma,
  XpGainSource,
} from "@prisma/client";

import {
  activeSpecialWindows,
  DAILY_CHALLENGE_POOL,
  listSpecialChallengeWindows,
  type GamifiedChallengeDef,
  type SpecialChallengeWindow,
  WEEKLY_CHALLENGE_POOL,
} from "../lib/challengesCatalog";
import { addExperience } from "../lib/xpLevel";
import { recordXpGain } from "../lib/xpLedger";
import { prisma } from "../lib/prisma";

export function utcDateKey(at: Date = new Date()): string {
  return new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate())).toISOString().slice(0, 10);
}

export function utcMondayKey(at: Date = new Date()): string {
  const d = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
  const dow = d.getUTCDay();
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  d.setUTCDate(d.getUTCDate() + diffToMonday);
  return d.toISOString().slice(0, 10);
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function pickDailyChallenges(userId: string, at: Date = new Date()): GamifiedChallengeDef[] {
  const key = utcDateKey(at);
  const start = hashString(`${userId}:${key}`) % DAILY_CHALLENGE_POOL.length;
  const out: GamifiedChallengeDef[] = [];
  for (let i = 0; i < 3; i++) {
    out.push(DAILY_CHALLENGE_POOL[(start + i) % DAILY_CHALLENGE_POOL.length]!);
  }
  return out;
}

export function pickWeeklyChallenge(userId: string, at: Date = new Date()): GamifiedChallengeDef {
  const monday = utcMondayKey(at);
  const idx = hashString(`${userId}:week:${monday}`) % WEEKLY_CHALLENGE_POOL.length;
  return WEEKLY_CHALLENGE_POOL[idx]!;
}

function specialPeriodKey(w: SpecialChallengeWindow): string {
  return `event:${w.slug}:${w.startsAt.getUTCFullYear()}`;
}

function toWindowDef(w: SpecialChallengeWindow): GamifiedChallengeDef {
  return {
    slug: w.slug,
    title: w.title,
    description: w.description,
    target: w.target,
    rewardCoins: w.rewardCoins,
    rewardXp: w.rewardXp,
    premiumTempHours: w.premiumTempHours,
    grantCertificate: w.grantCertificate,
    badgeAchievementId: w.badgeAchievementId,
  };
}

async function ensureChallengeAchievements(tx: Prisma.TransactionClient): Promise<void> {
  const defs: Array<{ id: string; title: string; description: string }> = [];
  const collect = (d: GamifiedChallengeDef) => {
    if (!d.badgeAchievementId) return;
    defs.push({
      id: d.badgeAchievementId,
      title: `Insignia: ${d.title}`,
      description: d.description,
    });
  };
  DAILY_CHALLENGE_POOL.forEach(collect);
  WEEKLY_CHALLENGE_POOL.forEach(collect);
  for (const w of listSpecialChallengeWindows()) {
    if (w.badgeAchievementId) {
      defs.push({
        id: w.badgeAchievementId,
        title: `Insignia: ${w.title}`,
        description: w.description,
      });
    }
  }

  for (const d of defs) {
    await tx.achievement.upsert({
      where: { id: d.id },
      create: {
        id: d.id,
        title: d.title,
        description: d.description,
        category: ContentCategory.creativity,
        badgeColor: "#f59e0b",
        badgeIcon: "trophy",
        rarity: AchievementRarity.EPIC,
      },
      update: {
        title: d.title,
        description: d.description,
      },
    });
  }
}

async function maybeGrantDailyTripleBonus(
  tx: Prisma.TransactionClient,
  userId: string,
  dateKey: string
): Promise<{ xp: number; coins: number } | null> {
  const rows = await tx.userGamifiedChallenge.findMany({
    where: { userId, bucket: ChallengeBucket.DAILY, periodKey: dateKey },
    select: { id: true, completed: true, rewardsGranted: true },
  });
  if (rows.length !== 3) return null;
  if (!rows.every((r) => r.completed)) return null;
  const marker = rows.some((r) => {
    const rg = r.rewardsGranted as { dailyTripleBonus?: boolean } | null;
    return Boolean(rg?.dailyTripleBonus);
  });
  if (marker) return null;

  const bonusXp = 50;
  const bonusCoins = 30;
  const user = await tx.user.findUniqueOrThrow({
    where: { id: userId },
    select: { level: true, experience: true, quizCoins: true },
  });
  const next = addExperience(user.level, user.experience, bonusXp);
  await tx.user.update({
    where: { id: userId },
    data: {
      level: next.level,
      experience: next.experience,
      quizCoins: user.quizCoins + bonusCoins,
    },
  });
  await recordXpGain(tx, userId, bonusXp, XpGainSource.CHALLENGE);

  const first = rows[0]!;
  await tx.userGamifiedChallenge.update({
    where: { id: first.id },
    data: {
      rewardsGranted: {
        ...(first.rewardsGranted as object | null),
        dailyTripleBonus: true,
        dailyTripleBonusXp: bonusXp,
        dailyTripleBonusCoins: bonusCoins,
      } as Prisma.InputJsonValue,
    },
  });
  return { xp: bonusXp, coins: bonusCoins };
}

async function grantChallengeRewards(
  tx: Prisma.TransactionClient,
  userId: string,
  rowId: string,
  def: GamifiedChallengeDef
): Promise<Record<string, unknown>> {
  await ensureChallengeAchievements(tx);
  const user = await tx.user.findUniqueOrThrow({
    where: { id: userId },
    select: { level: true, experience: true, quizCoins: true },
  });
  const xp = Math.max(0, def.rewardXp);
  const coins = Math.max(0, def.rewardCoins);
  const next = addExperience(user.level, user.experience, xp);
  await tx.user.update({
    where: { id: userId },
    data: {
      level: next.level,
      experience: next.experience,
      quizCoins: user.quizCoins + coins,
    },
  });
  await recordXpGain(tx, userId, xp, XpGainSource.CHALLENGE);

  let badgeUnlocked = false;
  if (def.badgeAchievementId) {
    const existed = await tx.userAchievement.findUnique({
      where: { userId_achievementId: { userId, achievementId: def.badgeAchievementId } },
      select: { id: true },
    });
    await tx.userAchievement.upsert({
      where: { userId_achievementId: { userId, achievementId: def.badgeAchievementId } },
      create: { userId, achievementId: def.badgeAchievementId },
      update: {},
      select: { id: true },
    });
    badgeUnlocked = !existed;
  }

  const certificateUrl = def.grantCertificate
    ? `/api/users/${encodeURIComponent(userId)}/certificates/challenge/${encodeURIComponent(rowId)}`
    : null;

  const rewardsGranted = {
    coins,
    xp,
    badgeUnlocked,
    badgeAchievementId: def.badgeAchievementId,
    certificateUrl,
    premiumTempHours: def.premiumTempHours,
    celebration: {
      animation: "confetti",
      title: "¡Reto completado!",
      body: `Ganaste ${coins} monedas, ${xp} XP y recompensas extra.`,
    },
  };

  await tx.userGamifiedChallenge.update({
    where: { id: rowId },
    data: {
      completed: true,
      completedAt: new Date(),
      progress: def.target,
      rewardsGranted: rewardsGranted as Prisma.InputJsonValue,
    },
  });

  return rewardsGranted;
}

export async function ensureGamifiedChallengesForUser(userId: string, at: Date = new Date()): Promise<void> {
  const dateKey = utcDateKey(at);
  const mondayKey = utcMondayKey(at);
  const specials = activeSpecialWindows(at);

  await prisma.$transaction(async (tx) => {
    await ensureChallengeAchievements(tx);

    const dailyPicked = pickDailyChallenges(userId, at);
    const existingDaily = await tx.userGamifiedChallenge.findMany({
      where: { userId, bucket: ChallengeBucket.DAILY, periodKey: dateKey },
      select: { challengeSlug: true },
    });
    const expectedSlugs = dailyPicked.map((d) => d.slug).sort().join("|");
    const actualSlugs = existingDaily
      .map((r) => r.challengeSlug)
      .sort()
      .join("|");
    if (existingDaily.length !== 3 || expectedSlugs !== actualSlugs) {
      await tx.userGamifiedChallenge.deleteMany({
        where: { userId, bucket: ChallengeBucket.DAILY, periodKey: dateKey },
      });
      for (const d of dailyPicked) {
        await tx.userGamifiedChallenge.create({
          data: {
            userId,
            bucket: ChallengeBucket.DAILY,
            periodKey: dateKey,
            challengeSlug: d.slug,
            title: d.title,
            description: d.description,
            target: d.target,
            progress: 0,
            completed: false,
          },
        });
      }
    }

    const weeklyDef = pickWeeklyChallenge(userId, at);
    const existingWeek = await tx.userGamifiedChallenge.findMany({
      where: { userId, bucket: ChallengeBucket.WEEKLY, periodKey: mondayKey },
      select: { challengeSlug: true },
    });
    if (existingWeek.length !== 1 || existingWeek[0]!.challengeSlug !== weeklyDef.slug) {
      await tx.userGamifiedChallenge.deleteMany({
        where: { userId, bucket: ChallengeBucket.WEEKLY, periodKey: mondayKey },
      });
      await tx.userGamifiedChallenge.create({
        data: {
          userId,
          bucket: ChallengeBucket.WEEKLY,
          periodKey: mondayKey,
          challengeSlug: weeklyDef.slug,
          title: weeklyDef.title,
          description: weeklyDef.description,
          target: weeklyDef.target,
          progress: 0,
          completed: false,
        },
      });
    }

    const activeKeys = [...new Set(specials.map((s) => specialPeriodKey(s)))];
    if (activeKeys.length === 0) {
      await tx.userGamifiedChallenge.deleteMany({ where: { userId, bucket: ChallengeBucket.SPECIAL } });
    } else {
      await tx.userGamifiedChallenge.deleteMany({
        where: { userId, bucket: ChallengeBucket.SPECIAL, periodKey: { notIn: activeKeys } },
      });
    }

    for (const w of specials) {
      const pk = specialPeriodKey(w);
      const def = toWindowDef(w);
      const row = await tx.userGamifiedChallenge.findUnique({
        where: {
          userId_bucket_periodKey_challengeSlug: {
            userId,
            bucket: ChallengeBucket.SPECIAL,
            periodKey: pk,
            challengeSlug: def.slug,
          },
        },
        select: { id: true },
      });
      if (!row) {
        await tx.userGamifiedChallenge.create({
          data: {
            userId,
            bucket: ChallengeBucket.SPECIAL,
            periodKey: pk,
            challengeSlug: def.slug,
            title: def.title,
            description: def.description,
            target: def.target,
            progress: 0,
            completed: false,
          },
        });
      }
    }
  });
}

function resolveDefForSlug(bucket: ChallengeBucket, periodKey: string, slug: string, at: Date): GamifiedChallengeDef | null {
  if (bucket === ChallengeBucket.DAILY) {
    return DAILY_CHALLENGE_POOL.find((d) => d.slug === slug) ?? null;
  }
  if (bucket === ChallengeBucket.WEEKLY) {
    return WEEKLY_CHALLENGE_POOL.find((d) => d.slug === slug) ?? null;
  }
  const w = activeSpecialWindows(at).find((s) => specialPeriodKey(s) === periodKey && s.slug === slug);
  return w ? toWindowDef(w) : null;
}

export type ChallengeProgressResult = {
  progress: number;
  target: number;
  completed: boolean;
  rewards?: Record<string, unknown>;
  dailyTripleBonus?: { xp: number; coins: number } | null;
};

export async function applyGamifiedChallengeProgress(input: {
  userId: string;
  bucket: ChallengeBucket;
  challengeSlug: string;
  increment?: number;
  setProgress?: number;
  at?: Date;
}): Promise<ChallengeProgressResult> {
  const at = input.at ?? new Date();
  const increment = Math.max(0, Math.min(100, input.increment ?? 0));
  const setProgress =
    input.setProgress != null && Number.isFinite(input.setProgress)
      ? Math.max(0, Math.floor(Number(input.setProgress)))
      : null;

  if (increment <= 0 && setProgress === null) {
    throw new Error("INVALID_PROGRESS_DELTA");
  }

  await ensureGamifiedChallengesForUser(input.userId, at);

  const dateKey = utcDateKey(at);
  const mondayKey = utcMondayKey(at);
  const activeSpecial = activeSpecialWindows(at).find((s) => s.slug === input.challengeSlug) ?? null;

  const periodKey =
    input.bucket === ChallengeBucket.DAILY
      ? dateKey
      : input.bucket === ChallengeBucket.WEEKLY
        ? mondayKey
        : activeSpecial
          ? specialPeriodKey(activeSpecial)
          : null;

  if (!periodKey) {
    throw new Error("SPECIAL_NOT_ACTIVE");
  }

  return prisma.$transaction(async (tx) => {
    const row = await tx.userGamifiedChallenge.findUnique({
      where: {
        userId_bucket_periodKey_challengeSlug: {
          userId: input.userId,
          bucket: input.bucket,
          periodKey,
          challengeSlug: input.challengeSlug,
        },
      },
    });
    if (!row) {
      throw new Error("CHALLENGE_ROW_NOT_FOUND");
    }
    if (row.completed) {
      return {
        progress: row.progress,
        target: row.target,
        completed: true,
        rewards: (row.rewardsGranted as Record<string, unknown> | null) ?? undefined,
      };
    }

    const def = resolveDefForSlug(input.bucket, periodKey, input.challengeSlug, at);
    if (!def) {
      throw new Error("UNKNOWN_CHALLENGE_DEF");
    }

    const nextProgress =
      setProgress != null ? Math.min(def.target, setProgress) : Math.min(def.target, row.progress + increment);

    if (nextProgress < row.target) {
      await tx.userGamifiedChallenge.update({
        where: { id: row.id },
        data: { progress: nextProgress },
      });
      return { progress: nextProgress, target: row.target, completed: false };
    }

    const rewards = await grantChallengeRewards(tx, input.userId, row.id, def);
    let dailyTripleBonus: { xp: number; coins: number } | null = null;
    if (input.bucket === ChallengeBucket.DAILY) {
      dailyTripleBonus = await maybeGrantDailyTripleBonus(tx, input.userId, dateKey);
    }

    return {
      progress: def.target,
      target: row.target,
      completed: true,
      rewards,
      dailyTripleBonus,
    };
  });
}

export async function listGamifiedChallengesForUser(userId: string, at: Date = new Date()) {
  await ensureGamifiedChallengesForUser(userId, at);
  const dateKey = utcDateKey(at);
  const mondayKey = utcMondayKey(at);
  const specials = activeSpecialWindows(at).map((w) => ({ w, pk: specialPeriodKey(w) }));

  const [daily, weekly, specialRows] = await Promise.all([
    prisma.userGamifiedChallenge.findMany({
      where: { userId, bucket: ChallengeBucket.DAILY, periodKey: dateKey },
      orderBy: { challengeSlug: "asc" },
    }),
    prisma.userGamifiedChallenge.findMany({
      where: { userId, bucket: ChallengeBucket.WEEKLY, periodKey: mondayKey },
      take: 1,
    }),
    prisma.userGamifiedChallenge.findMany({
      where: {
        userId,
        bucket: ChallengeBucket.SPECIAL,
        periodKey: { in: specials.map((s) => s.pk) },
      },
    }),
  ]);

  return {
    dateKey,
    mondayKey,
    daily,
    weekly: weekly[0] ?? null,
    specials: specialRows,
    rewards: {
      coinsField: "quizCoins",
      xpSource: "CHALLENGE",
      badges: "UserAchievement vinculado a logros de reto",
      premiumTemp: "premiumTempHours informativo; aplicación según política comercial",
      certificates: "URL placeholder bajo /api/users/:id/certificates/challenge/:rowId",
    },
  };
}

export function buildChallengeNotificationBlueprint(): {
  reminders: Array<{ id: string; hourLocal: number; minuteLocal: number; title: string; body: string }>;
  celebrationDefaults: { title: string; body: string; sound: "success" };
} {
  return {
    reminders: [
      {
        id: "morning_9",
        hourLocal: 9,
        minuteLocal: 0,
        title: "¡Tu reto de hoy te espera!",
        body: "Entrá a EduPlay y completá tus 3 retos diarios para sumar monedas, XP e insignias.",
      },
      {
        id: "evening_20",
        hourLocal: 20,
        minuteLocal: 0,
        title: "No olvides completar tus retos",
        body: "Todavía podés avanzar en tus retos diarios, semanales y especiales antes de que termine el día.",
      },
    ],
    celebrationDefaults: {
      title: "¡Lo lograste!",
      body: "Completaste un reto: disfrutá la animación especial y revisá tus recompensas.",
      sound: "success",
    },
  };
}
