import { ContentCategory } from "@prisma/client";

import { CONTENT_CATEGORY_VALUES } from "./contentCategory";

/** Cuota de ítems alineados con intereses del usuario vs exploración. */
export const INTEREST_QUOTA = 0.7;
export const EXPLORE_QUOTA = 0.3;

export function quotaSplit(total: number): { interestSlots: number; exploreSlots: number } {
  if (total <= 0) return { interestSlots: 0, exploreSlots: 0 };
  const interestSlots = Math.max(1, Math.round(total * INTEREST_QUOTA));
  const exploreSlots = Math.max(0, total - interestSlots);
  return { interestSlots, exploreSlots };
}

/** Categorías para exploración: las que el usuario no tiene en su top (o todas mezcladas si hace falta). */
export function pickExplorationCategories(
  topInterestCategories: readonly ContentCategory[],
  maxDistinct: number
): ContentCategory[] {
  const top = new Set(topInterestCategories);
  let pool = CONTENT_CATEGORY_VALUES.filter((c) => !top.has(c));
  if (pool.length === 0) {
    pool = [...CONTENT_CATEGORY_VALUES];
  }
  shuffleInPlace(pool);
  return pool.slice(0, Math.min(maxDistinct, pool.length));
}

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
}

/**
 * Ordena por `sortKey` desc y elige hasta `limit` ítems rotando por categoría
 * para no repetir siempre la misma categoría.
 */
export function pickDiverseByCategory<T>(
  items: T[],
  limit: number,
  getCategory: (t: T) => string,
  getSortKey: (t: T) => number
): T[] {
  if (items.length === 0 || limit <= 0) return [];

  const sorted = [...items].sort((a, b) => getSortKey(b) - getSortKey(a));

  const byCat = new Map<string, T[]>();
  for (const it of sorted) {
    const key = getCategory(it).trim() || "__none__";
    if (!byCat.has(key)) byCat.set(key, []);
    byCat.get(key)!.push(it);
  }

  const categoryOrder = Array.from(byCat.keys());
  shuffleInPlace(categoryOrder);

  const result: T[] = [];
  let round = 0;
  while (result.length < limit) {
    let addedThisRound = false;
    for (const cat of categoryOrder) {
      const bucket = byCat.get(cat);
      if (bucket && bucket.length > round) {
        result.push(bucket[round]!);
        addedThisRound = true;
        if (result.length >= limit) break;
      }
    }
    if (!addedThisRound) break;
    round++;
  }

  return result;
}
