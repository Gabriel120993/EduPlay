/** Pesos por posición en `UserInterest` (score desc., hasta 8 categorías). */
const BOOST_BY_RANK = [22, 17, 13, 10, 7, 5, 4, 3] as const;

/**
 * Puntos extra si la categoría del ítem coincide con una de las categorías favoritas (ordenadas por score).
 */
export function interestBoostForTopCategories(
  itemCategory: string | null | undefined,
  topCategoriesOrdered: readonly string[],
): number {
  if (!itemCategory?.trim()) return 0;
  const c = itemCategory.trim();
  for (let i = 0; i < topCategoriesOrdered.length && i < BOOST_BY_RANK.length; i++) {
    if (topCategoriesOrdered[i]?.trim() === c) {
      return BOOST_BY_RANK[i]!;
    }
  }
  return 0;
}
