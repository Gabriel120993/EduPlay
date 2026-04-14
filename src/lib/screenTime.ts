import { prisma } from "./prisma";

/** Inicio del día UTC (00:00) para resets diarios. */
export function utcDayStart(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

export type ScreenTimeState = {
  dailyLimitMinutes: number;
  usedTodaySeconds: number;
  limitExceeded: boolean;
  remainingSeconds: number;
  lastReset: Date;
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
  return row.parentSettings?.dailyScreenTimeLimit ?? DEFAULT_LIMIT_MINUTES;
}

/**
 * Solo lectura: tiempo de pantalla del día UTC actual (sin crear ni mutar filas).
 */
export async function peekScreenTimeToday(userId: string): Promise<{
  usedTodaySeconds: number;
  dailyLimitMinutes: number;
} | null> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      parentSettings: { select: { dailyScreenTimeLimit: true } },
      screenTime: {
        select: {
          usedTodaySeconds: true,
          dailyLimitMinutes: true,
          lastReset: true,
        },
      },
    },
  });
  if (!row) return null;
  const limitFromSettings = row.parentSettings?.dailyScreenTimeLimit ?? DEFAULT_LIMIT_MINUTES;
  const dayStart = utcDayStart();
  const st = row.screenTime;
  if (!st || st.lastReset < dayStart) {
    return {
      usedTodaySeconds: 0,
      dailyLimitMinutes: st?.dailyLimitMinutes ?? limitFromSettings,
    };
  }
  return {
    usedTodaySeconds: st.usedTodaySeconds,
    dailyLimitMinutes: st.dailyLimitMinutes,
  };
}

/**
 * Obtiene o crea el registro de ScreenTime, aplica reset diario (UTC) y sincroniza el límite con ParentSettings.
 */
export async function getScreenTimeState(userId: string): Promise<ScreenTimeState | null> {
  const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!userExists) return null;

  const limitMin = await resolveDailyLimitMinutes(userId);
  const dayStart = utcDayStart();

  let st = await prisma.screenTime.findUnique({ where: { userId } });

  if (!st) {
    st = await prisma.screenTime.create({
      data: {
        userId,
        dailyLimitMinutes: limitMin,
        usedTodaySeconds: 0,
        lastReset: dayStart,
      },
    });
  } else if (st.lastReset < dayStart) {
    st = await prisma.screenTime.update({
      where: { userId },
      data: {
        usedTodaySeconds: 0,
        lastReset: dayStart,
        dailyLimitMinutes: limitMin,
      },
    });
  } else if (st.dailyLimitMinutes !== limitMin) {
    st = await prisma.screenTime.update({
      where: { userId },
      data: { dailyLimitMinutes: limitMin },
    });
  }

  const limitSec = st.dailyLimitMinutes * 60;
  const limitExceeded = st.usedTodaySeconds >= limitSec;
  const remainingSeconds = Math.max(0, limitSec - st.usedTodaySeconds);

  return {
    dailyLimitMinutes: st.dailyLimitMinutes,
    usedTodaySeconds: st.usedTodaySeconds,
    limitExceeded,
    remainingSeconds,
    lastReset: st.lastReset,
  };
}

/**
 * Suma tiempo de uso (segundos) tras validar usuario y día. `deltaSeconds` acotado en el controlador.
 */
export async function addScreenTimeSeconds(userId: string, deltaSeconds: number): Promise<ScreenTimeState | null> {
  if (deltaSeconds <= 0) {
    return getScreenTimeState(userId);
  }

  const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!userExists) return null;

  await getScreenTimeState(userId);

  const updated = await prisma.screenTime.update({
    where: { userId },
    data: {
      usedTodaySeconds: { increment: deltaSeconds },
    },
  });

  const limitSec = updated.dailyLimitMinutes * 60;
  const limitExceeded = updated.usedTodaySeconds >= limitSec;
  const remainingSeconds = Math.max(0, limitSec - updated.usedTodaySeconds);

  return {
    dailyLimitMinutes: updated.dailyLimitMinutes,
    usedTodaySeconds: updated.usedTodaySeconds,
    limitExceeded,
    remainingSeconds,
    lastReset: updated.lastReset,
  };
}
