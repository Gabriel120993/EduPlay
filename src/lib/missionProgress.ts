import {
  AchievementRarity,
  ContentCategory,
  MissionType,
  type Prisma,
  XpGainSource,
} from "@prisma/client";

import {
  DAILY_CHALLENGE_ACHIEVEMENT_ID,
  DAILY_CHALLENGE_BONUS_XP,
  DAILY_CHALLENGE_ORDER,
} from "./dailyChallengeConstants";
import { addExperience } from "./xpLevel";
import { recordXpGain } from "./xpLedger";

/** Día calendario UTC alineado con `UserMission.date` (@db.Date). */
export function utcMissionDate(at: Date = new Date()): Date {
  return new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
}

export const MISSION_COMPLETION_XP_RANGE = { min: 20, max: 50 } as const;

export type MissionCompletionReward = {
  userMissionId: string;
  missionId: string;
  missionTitle: string;
  xpReward: number;
};

/** Bonus al completar las 3 misiones del reto diario el mismo día. */
export type DailyChallengeBonusReward = {
  bonusXp: number;
  badgeUnlocked: boolean;
  badgeTitle: string;
  badgeIcon: string;
};

function rollMissionXpReward(): number {
  const { min, max } = MISSION_COMPLETION_XP_RANGE;
  const span = max - min + 1;
  return min + Math.floor(Math.random() * span);
}

type MissionRowForProgress = {
  id: string;
  progress: number;
  rewardXpGranted: number | null;
  mission: { id: string; title: string; targetValue: number };
};

/**
 * Actualiza progreso; si pasa a completada y aún no hay `rewardXpGranted`, otorga XP (20–50) una sola vez.
 */
async function updateUserMissionProgress(
  tx: Prisma.TransactionClient,
  userId: string,
  row: MissionRowForProgress,
  nextProgress: number,
  nextCompleted: boolean
): Promise<MissionCompletionReward | null> {
  if (!nextCompleted) {
    await tx.userMission.update({
      where: { id: row.id },
      data: { progress: nextProgress, completed: false },
    });
    return null;
  }

  if (row.rewardXpGranted != null) {
    await tx.userMission.update({
      where: { id: row.id },
      data: { progress: nextProgress, completed: true },
    });
    return null;
  }

  const xpReward = rollMissionXpReward();
  const user = await tx.user.findUniqueOrThrow({
    where: { id: userId },
    select: { level: true, experience: true },
  });
  const userNext = addExperience(user.level, user.experience, xpReward);
  await tx.user.update({
    where: { id: userId },
    data: { level: userNext.level, experience: userNext.experience },
  });
  await tx.userMission.update({
    where: { id: row.id },
    data: {
      progress: nextProgress,
      completed: true,
      rewardXpGranted: xpReward,
    },
  });
  await recordXpGain(tx, userId, xpReward, XpGainSource.MISSION);

  return {
    userMissionId: row.id,
    missionId: row.mission.id,
    missionTitle: row.mission.title,
    xpReward,
  };
}

const missionSelect = {
  targetValue: true,
  category: true,
  id: true,
  title: true,
} as const;

/**
 * PLAY_GAMES: +1 por partida si la misión no tiene categoría (cualquier juego) o coincide con la del juego.
 */
export async function applyPlayGamesMissionProgress(
  tx: Prisma.TransactionClient,
  userId: string,
  gameCategory: string,
  at: Date = new Date()
): Promise<MissionCompletionReward[]> {
  const date = utcMissionDate(at);
  const rows = await tx.userMission.findMany({
    where: {
      userId,
      date,
      completed: false,
      mission: { type: MissionType.PLAY_GAMES },
    },
    include: { mission: { select: missionSelect } },
  });
  const g = gameCategory.trim();
  const rewards: MissionCompletionReward[] = [];
  for (const row of rows) {
    const mCat = row.mission.category?.trim() ?? "";
    if (mCat !== "" && mCat !== g) continue;
    const next = row.progress + 1;
    const completed = next >= row.mission.targetValue;
    const r = await updateUserMissionProgress(tx, userId, row, next, completed);
    if (r) rewards.push(r);
  }
  return rewards;
}

/** EARN_XP: suma el XP ganado en el evento al progreso de misiones XP del día. */
export async function applyEarnXpMissionProgress(
  tx: Prisma.TransactionClient,
  userId: string,
  xpGained: number,
  at: Date = new Date()
): Promise<MissionCompletionReward[]> {
  if (xpGained <= 0) return [];
  const date = utcMissionDate(at);
  const rows = await tx.userMission.findMany({
    where: {
      userId,
      date,
      completed: false,
      mission: { type: MissionType.EARN_XP },
    },
    include: { mission: { select: { targetValue: true, id: true, title: true } } },
  });
  const rewards: MissionCompletionReward[] = [];
  for (const row of rows) {
    const next = row.progress + xpGained;
    const completed = next >= row.mission.targetValue;
    const r = await updateUserMissionProgress(tx, userId, row, next, completed);
    if (r) rewards.push(r);
  }
  return rewards;
}

/** READ_CONTENT: +1 al marcar un contenido educativo como aprendido. */
export async function applyReadContentMissionProgress(
  tx: Prisma.TransactionClient,
  userId: string,
  at: Date = new Date()
): Promise<MissionCompletionReward[]> {
  const date = utcMissionDate(at);
  const rows = await tx.userMission.findMany({
    where: {
      userId,
      date,
      completed: false,
      mission: { type: MissionType.READ_CONTENT },
    },
    include: { mission: { select: missionSelect } },
  });
  const rewards: MissionCompletionReward[] = [];
  for (const row of rows) {
    const next = row.progress + 1;
    const completed = next >= row.mission.targetValue;
    const r = await updateUserMissionProgress(tx, userId, row, next, completed);
    if (r) rewards.push(r);
  }
  return rewards;
}

/** CORRECT_ANSWERS: suma respuestas correctas (quiz / juego visual) hacia el objetivo del día. */
export async function applyCorrectAnswersMissionProgress(
  tx: Prisma.TransactionClient,
  userId: string,
  correctDelta: number,
  at: Date = new Date()
): Promise<MissionCompletionReward[]> {
  if (correctDelta <= 0) return [];
  const date = utcMissionDate(at);
  const rows = await tx.userMission.findMany({
    where: {
      userId,
      date,
      completed: false,
      mission: { type: MissionType.CORRECT_ANSWERS },
    },
    include: { mission: { select: missionSelect } },
  });
  const rewards: MissionCompletionReward[] = [];
  for (const row of rows) {
    const next = Math.min(row.progress + correctDelta, row.mission.targetValue);
    const completed = next >= row.mission.targetValue;
    const r = await updateUserMissionProgress(tx, userId, row, next, completed);
    if (r) rewards.push(r);
  }
  return rewards;
}

async function ensureDailyChallengeAchievement(tx: Prisma.TransactionClient) {
  const existing = await tx.achievement.findUnique({
    where: { id: DAILY_CHALLENGE_ACHIEVEMENT_ID },
    select: { id: true },
  });
  if (existing) return;
  await tx.achievement.create({
    data: {
      id: DAILY_CHALLENGE_ACHIEVEMENT_ID,
      title: "Campeón del día",
      description: "Completaste el reto diario: jugar una partida, leer un contenido y acertar 3 respuestas.",
      category: ContentCategory.education,
      badgeIcon: "🏆",
      badgeColor: "#d97706",
      rarity: AchievementRarity.RARE,
    },
  });
}

/**
 * Si las 3 misiones del reto diario están completas ese día, otorga XP extra y (la primera vez) el logro «Campeón del día».
 */
export async function maybeGrantDailyChallengeBonus(
  tx: Prisma.TransactionClient,
  userId: string,
  at: Date = new Date()
): Promise<DailyChallengeBonusReward | null> {
  const date = utcMissionDate(at);
  const rows = await tx.userMission.findMany({
    where: {
      userId,
      date,
      missionId: { in: [...DAILY_CHALLENGE_ORDER] },
    },
    select: { completed: true },
  });
  if (rows.length < 3) return null;
  if (!rows.every((r) => r.completed)) return null;

  const existing = await tx.dailyChallengeBonus.findUnique({
    where: { userId_date: { userId, date } },
  });
  if (existing) return null;

  const bonusXp = DAILY_CHALLENGE_BONUS_XP;
  const priorBonusCount = await tx.dailyChallengeBonus.count({ where: { userId } });

  const user = await tx.user.findUniqueOrThrow({
    where: { id: userId },
    select: { level: true, experience: true },
  });
  const userNext = addExperience(user.level, user.experience, bonusXp);
  await tx.user.update({
    where: { id: userId },
    data: { level: userNext.level, experience: userNext.experience },
  });
  await recordXpGain(tx, userId, bonusXp, XpGainSource.MISSION);
  await tx.dailyChallengeBonus.create({
    data: { userId, date, bonusXp },
  });

  let badgeUnlocked = false;
  if (priorBonusCount === 0) {
    await ensureDailyChallengeAchievement(tx);
    const already = await tx.userAchievement.findUnique({
      where: {
        userId_achievementId: { userId, achievementId: DAILY_CHALLENGE_ACHIEVEMENT_ID },
      },
    });
    if (!already) {
      await tx.userAchievement.create({
        data: { userId, achievementId: DAILY_CHALLENGE_ACHIEVEMENT_ID },
      });
      badgeUnlocked = true;
    }
  }

  return {
    bonusXp,
    badgeUnlocked,
    badgeTitle: "Campeón del día",
    badgeIcon: "🏆",
  };
}

/** COMPLETE_ACHIEVEMENT: +1 por logro desbloqueado. */
export async function applyAchievementMissionProgress(
  tx: Prisma.TransactionClient,
  userId: string,
  at: Date = new Date()
): Promise<MissionCompletionReward[]> {
  const date = utcMissionDate(at);
  const rows = await tx.userMission.findMany({
    where: {
      userId,
      date,
      completed: false,
      mission: { type: MissionType.COMPLETE_ACHIEVEMENT },
    },
    include: { mission: { select: { targetValue: true, id: true, title: true } } },
  });
  const rewards: MissionCompletionReward[] = [];
  for (const row of rows) {
    const next = row.progress + 1;
    const completed = next >= row.mission.targetValue;
    const r = await updateUserMissionProgress(tx, userId, row, next, completed);
    if (r) rewards.push(r);
  }
  return rewards;
}
