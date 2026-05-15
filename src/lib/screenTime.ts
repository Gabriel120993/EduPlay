import { prisma } from './prisma';

/** Inicio del día UTC (00:00) para resets diarios y clave de `DailyTimeUsage.date`. */
export function utcDayStart(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

export type ScreenTimeState = {
  dailyLimitMinutes: number;
  usedTodaySeconds: number;
  limitExceeded: boolean;
  remainingSeconds: number;
  lastReset: Date;
  /** `true` cuando `ParentSettings.dailyScreenTimeLimit === 0`. */
  isUnlimited: boolean;
};

const DEFAULT_LIMIT_MINUTES = 120;

async function resolveDailyLimitMinutes(userId: string): Promise<number> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      parentSettings: { select: { dailyScreenTimeLimit: true } },
    },
  });
  if (!row) return DEFAULT_LIMIT_MINUTES;
  const lim = row.parentSettings?.dailyScreenTimeLimit;
  if (lim == null) return DEFAULT_LIMIT_MINUTES;
  return lim;
}

async function getTodayUsedSeconds(userId: string, day: Date): Promise<number> {
  const row = await prisma.dailyTimeUsage.findUnique({
    where: {
      userId_date: { userId, date: day },
    },
    select: { usedSeconds: true },
  });
  return row?.usedSeconds ?? 0;
}

function buildState(
  limitMin: number,
  usedSeconds: number,
  dayStart: Date,
): Omit<ScreenTimeState, never> {
  const isUnlimited = limitMin === 0;
  if (isUnlimited) {
    return {
      dailyLimitMinutes: 0,
      usedTodaySeconds: usedSeconds,
      limitExceeded: false,
      remainingSeconds: 0,
      lastReset: dayStart,
      isUnlimited: true,
    };
  }
  const limitSec = limitMin * 60;
  const limitExceeded = usedSeconds >= limitSec;
  const remainingSeconds = Math.max(0, limitSec - usedSeconds);
  return {
    dailyLimitMinutes: limitMin,
    usedTodaySeconds: usedSeconds,
    limitExceeded,
    remainingSeconds,
    lastReset: dayStart,
    isUnlimited: false,
  };
}

/**
 * Solo lectura: tiempo de pantalla del día UTC actual (sin mutar filas de uso).
 */
export async function peekScreenTimeToday(userId: string): Promise<{
  usedTodaySeconds: number;
  dailyLimitMinutes: number;
  isUnlimited: boolean;
} | null> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      parentSettings: { select: { dailyScreenTimeLimit: true } },
    },
  });
  if (!row) return null;
  const limitMin = row.parentSettings?.dailyScreenTimeLimit ?? DEFAULT_LIMIT_MINUTES;
  const dayStart = utcDayStart();
  const used = await getTodayUsedSeconds(userId, dayStart);
  const isUnlimited = limitMin === 0;
  return {
    usedTodaySeconds: used,
    dailyLimitMinutes: limitMin,
    isUnlimited,
  };
}

/**
 * Obtiene estado de tiempo de pantalla (día UTC) y sincroniza `ScreenTime` como caché de límite / lastReset.
 */
export async function getScreenTimeState(userId: string): Promise<ScreenTimeState | null> {
  const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!userExists) return null;

  const limitMin = await resolveDailyLimitMinutes(userId);
  const dayStart = utcDayStart();
  const usedSeconds = await getTodayUsedSeconds(userId, dayStart);

  const mirrorLimit = limitMin > 0 ? limitMin : DEFAULT_LIMIT_MINUTES;
  const st = await prisma.screenTime.findUnique({ where: { userId } });
  if (!st) {
    await prisma.screenTime.create({
      data: {
        userId,
        dailyLimitMinutes: mirrorLimit,
        usedTodaySeconds: 0,
        lastReset: dayStart,
      },
    });
  } else if (st.lastReset < dayStart) {
    await prisma.screenTime.update({
      where: { userId },
      data: {
        usedTodaySeconds: 0,
        lastReset: dayStart,
        dailyLimitMinutes: mirrorLimit,
      },
    });
  } else if (st.dailyLimitMinutes !== mirrorLimit) {
    await prisma.screenTime.update({
      where: { userId },
      data: { dailyLimitMinutes: mirrorLimit },
    });
  }

  return buildState(limitMin, usedSeconds, dayStart);
}

/**
 * Suma tiempo de uso (segundos) en el registro del día UTC actual.
 */
export async function addScreenTimeSeconds(
  userId: string,
  deltaSeconds: number,
): Promise<ScreenTimeState | null> {
  if (deltaSeconds <= 0) {
    return getScreenTimeState(userId);
  }

  const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!userExists) return null;

  await getScreenTimeState(userId);

  const limitMin = await resolveDailyLimitMinutes(userId);
  const dayStart = utcDayStart();

  await prisma.dailyTimeUsage.upsert({
    where: {
      userId_date: { userId, date: dayStart },
    },
    create: {
      userId,
      date: dayStart,
      usedSeconds: deltaSeconds,
    },
    update: {
      usedSeconds: { increment: deltaSeconds },
    },
  });

  const usedSeconds = await getTodayUsedSeconds(userId, dayStart);
  return buildState(limitMin, usedSeconds, dayStart);
}
