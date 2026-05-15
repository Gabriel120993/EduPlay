import type { Achievement, AchievementRarity } from '@prisma/client';

export type BadgeApi = {
  icon: string;
  color: string;
  rarity: AchievementRarity;
  label: string;
};

type BadgeSource = {
  badgeIcon: string;
  badgeColor: string;
  rarity: AchievementRarity;
  title: string;
};

export function toApiBadge(input: BadgeSource): BadgeApi {
  return {
    icon: input.badgeIcon,
    color: input.badgeColor,
    rarity: input.rarity,
    label: input.title,
  };
}

/**
 * Perfil: logros destacados / lista (incluye `badge` canónico).
 * Campos planos `title`, `icon`, `color`, `rarity` se mantienen para clientes que aún no leen `badge`.
 */
export function toApiProfileAchievementItem(input: BadgeSource) {
  const badge = toApiBadge(input);
  return {
    title: input.title,
    icon: badge.icon,
    color: badge.color,
    rarity: badge.rarity,
    badge,
  };
}

/**
 * Entidad Achievement en API: `badge` canónico; `icon`/`color` en raíz como alias legado (mismo valor que en `badge`).
 */
export function toApiAchievementEntity(a: Achievement) {
  const { badgeIcon, badgeColor, ...rest } = a;
  const badge = toApiBadge({
    badgeIcon,
    badgeColor,
    rarity: a.rarity,
    title: a.title,
  });
  return {
    ...rest,
    badge,
    icon: badge.icon,
    color: badge.color,
  };
}
