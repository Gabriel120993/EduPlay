import type { AchievementRarity } from '@prisma/client';

/** Ej.: "Unlocked 🌌 Explorador del espacio (EPIC)" — `badgeIcon` suele ser un emoji en BD. */
export function formatAchievementUnlockPostContent(
  title: string,
  badgeIcon: string,
  rarity: AchievementRarity,
): string {
  return `Unlocked ${badgeIcon} ${title} (${rarity})`;
}
