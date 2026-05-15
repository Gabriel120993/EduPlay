import { prisma } from '../lib/prisma';
import { buildAchievementSystemCatalog } from '../lib/achievementSystemCatalog';

let ensured = false;

/** Upsert idempotente del catálogo extendido (progreso, habilidad, social, ocultos, colecciones). */
export async function ensureAchievementSystemCatalog(): Promise<void> {
  if (ensured) return;
  const rows = buildAchievementSystemCatalog();
  await prisma.$transaction(
    rows.map((row) =>
      prisma.achievement.upsert({
        where: { id: row.id },
        create: {
          id: row.id,
          title: row.title,
          description: row.description,
          category: row.category,
          badgeColor: row.badgeColor,
          badgeIcon: row.badgeIcon,
          rarity: row.rarity,
          systemKind: row.systemKind,
          hidden: row.hidden,
          collectionKey: row.collectionKey,
          slug: row.slug,
          sortOrder: row.sortOrder,
        },
        update: {
          title: row.title,
          description: row.description,
          category: row.category,
          badgeColor: row.badgeColor,
          badgeIcon: row.badgeIcon,
          rarity: row.rarity,
          systemKind: row.systemKind,
          hidden: row.hidden,
          collectionKey: row.collectionKey,
          slug: row.slug,
          sortOrder: row.sortOrder,
        },
      }),
    ),
  );
  ensured = true;
}
