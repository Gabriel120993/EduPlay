import type { AchievementRarity, ContentCategory, Prisma } from "@prisma/client";

import { prisma } from "./prisma";

/** Cuántas categorías devolver como “top” (2 o 3). */
export type TopInterestsLimit = 2 | 3;

/**
 * Categorías con mayor `score` en `UserInterest` para el usuario (orden score DESC).
 * Por defecto devuelve hasta 3; podés pedir 2 (`limit: 2`).
 */
export async function getTopUserInterests(
  userId: string,
  options?: { limit?: TopInterestsLimit }
): Promise<ContentCategory[]> {
  const take = options?.limit ?? 3;
  const rows = await prisma.userInterest.findMany({
    where: { userId },
    orderBy: { score: "desc" },
    take,
    select: { category: true },
  });
  return rows.map((r) => r.category);
}

/** Scores por categoría para rankear recomendaciones (mayor = más interés). */
export async function getUserInterestScoreMap(userId: string): Promise<Map<ContentCategory, number>> {
  const rows = await prisma.userInterest.findMany({
    where: { userId },
    select: { category: true, score: true },
  });
  const m = new Map<ContentCategory, number>();
  for (const r of rows) {
    m.set(r.category, r.score);
  }
  return m;
}

/**
 * Suma puntos al interés del usuario en una categoría.
 * Si no existe fila (userId + category), se crea con score = delta.
 */
export async function bumpUserInterestScore(
  tx: Prisma.TransactionClient,
  userId: string,
  category: ContentCategory,
  delta: number
): Promise<void> {
  if (delta <= 0) return;

  await tx.userInterest.upsert({
    where: {
      userId_category: { userId, category },
    },
    create: {
      userId,
      category,
      score: delta,
    },
    update: {
      score: { increment: delta },
    },
  });
}

/** Puntos de interés al completar un juego (ligado al score de la partida). */
export function interestDeltaForGameScore(score: number): number {
  return Math.max(1, Math.min(80, 5 + Math.floor(score / 20)));
}

const ACHIEVEMENT_RARITY_INTEREST: Record<AchievementRarity, number> = {
  COMMON: 12,
  RARE: 18,
  EPIC: 24,
  LEGENDARY: 32,
};

/** Puntos de interés al desbloquear un logro (según rareza). */
export function interestDeltaForAchievement(rarity: AchievementRarity): number {
  return ACHIEVEMENT_RARITY_INTEREST[rarity] ?? 12;
}
