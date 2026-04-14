import { ContentCategory } from "@prisma/client";

import { CONTENT_CATEGORY_VALUES, educationalCategoryToContentCategory, parseContentCategory } from "./contentCategory";
import { pickDiverseByCategory } from "./recommendationDiversity";
import { prisma } from "./prisma";
import { getTopUserInterests, getUserInterestScoreMap } from "./userInterest";

/** Límite por defecto de ítems por lista (entre 5 y 10). */
export const DEFAULT_RECOMMENDATION_LIMIT = 8;
export const MIN_RECOMMENDATION_LIMIT = 5;
export const MAX_RECOMMENDATION_LIMIT = 10;

/** Cuota “alineada a intereses” vs “descubrimiento” (evita monotonía y favorece nuevas categorías). */
const INTEREST_SHARE = 0.7;

/** Buffer al leer de BD antes de filtrar por categoría (evita scans enormes). */
const FETCH_BUFFER = 180;

function clampLimit(n: number | undefined): number {
  if (n == null || !Number.isFinite(n)) return DEFAULT_RECOMMENDATION_LIMIT;
  return Math.min(MAX_RECOMMENDATION_LIMIT, Math.max(MIN_RECOMMENDATION_LIMIT, Math.floor(n)));
}

/** Query `?limit=` entre 5 y 10; si falta o es inválido → default 8. */
export function parseRecommendationLimitFromQuery(raw: unknown): number {
  const q = typeof raw === "string" ? raw : Array.isArray(raw) && raw[0] != null ? String(raw[0]) : "";
  const n = q.trim() ? Number.parseInt(q.trim(), 10) : NaN;
  if (!Number.isFinite(n)) return DEFAULT_RECOMMENDATION_LIMIT;
  return clampLimit(n);
}

/** ~70% ítems desde intereses, ~30% desde otras categorías (suma = limit). */
export function splitInterestDiscovery(limit: number): { interest: number; discovery: number } {
  const interest = Math.round(limit * INTEREST_SHARE);
  const discovery = limit - interest;
  return { interest: Math.max(0, interest), discovery: Math.max(0, discovery) };
}

function interestScoreForCategory(scoreMap: Map<ContentCategory, number>, rawCategory: string): number {
  const cc = categoryStringToEnum(rawCategory);
  if (!cc) return 0;
  return scoreMap.get(cc) ?? 0;
}

/**
 * Orden: 1) mayor score de interés en la categoría, 2) más reciente (`createdAt`), 3) aleatorio (desempate).
 */
function sortByInterestRecencyRandom<T>(
  items: T[],
  scoreMap: Map<ContentCategory, number>,
  getCategoryRaw: (t: T) => string,
  getCreatedAt: (t: T) => Date
): T[] {
  const decorated = items.map((t) => ({
    t,
    interest: interestScoreForCategory(scoreMap, getCategoryRaw(t)),
    time: getCreatedAt(t).getTime(),
    rnd: Math.random(),
  }));
  decorated.sort((a, b) => {
    if (b.interest !== a.interest) return b.interest - a.interest;
    if (b.time !== a.time) return b.time - a.time;
    return b.rnd - a.rnd;
  });
  return decorated.map((d) => d.t);
}

/** Normaliza strings de categoría (EducationalContent "Math", quiz "math", etc.) al enum. */
export function categoryStringToEnum(raw: string): ContentCategory | null {
  const t = raw.trim();
  if (!t) return null;
  const fromEdu = educationalCategoryToContentCategory(t);
  if (fromEdu) return fromEdu;
  return parseContentCategory(t);
}

function matchesCategorySet(raw: string, allowed: ContentCategory[]): boolean {
  const cc = categoryStringToEnum(raw);
  return cc !== null && allowed.includes(cc);
}

/**
 * Categorías para rankear recomendaciones y si el usuario ya tiene perfil de intereses.
 * Sin filas en `UserInterest`: se considera usuario nuevo → estrategia “popular + mix” (no 70/30).
 */
export async function getRecommendationCategoriesContext(userId: string): Promise<{
  topCategories: ContentCategory[];
  hasInterestProfile: boolean;
}> {
  const top = await getTopUserInterests(userId, { limit: 3 });
  const hasInterestProfile = top.length > 0;
  return {
    topCategories: hasInterestProfile ? top : [...CONTENT_CATEGORY_VALUES],
    hasInterestProfile,
  };
}

/**
 * Top 2–3 categorías por score; si no hay intereses, todas las canónicas (compatibilidad).
 */
export async function getTopCategoriesForRecommendations(userId: string): Promise<ContentCategory[]> {
  const ctx = await getRecommendationCategoriesContext(userId);
  return ctx.topCategories;
}

/** Categorías para el tramo de descubrimiento (las que no están en los intereses top). */
export function discoveryCategories(topCategories: ContentCategory[]): ContentCategory[] {
  return CONTENT_CATEGORY_VALUES.filter((c) => !topCategories.includes(c));
}

export type RecommendedEducationalDto = {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: import("@prisma/client").Difficulty;
  imageUrl: string | null;
  createdAt: string;
};

type EduRow = {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: import("@prisma/client").Difficulty;
  imageUrl: string | null;
  createdAt: Date;
};

function mapEducationalRow(row: EduRow): RecommendedEducationalDto {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    difficulty: row.difficulty,
    imageUrl: row.imageUrl,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Contenido educativo:
 * - Con intereses: ~70% top / ~30% descubrimiento; orden final por interés → recencia → aleatorio.
 * - Sin intereses (usuario nuevo): “popular” = reciente + **rotación por categoría** (categorías mixtas).
 */
export async function fetchRecommendedEducationalContent(
  userId: string,
  topCategories: ContentCategory[],
  limit: number,
  hasInterestProfile: boolean
): Promise<RecommendedEducationalDto[]> {
  const take = clampLimit(limit);
  const scoreMap = await getUserInterestScoreMap(userId);

  const pool = await prisma.educationalContent.findMany({
    orderBy: { createdAt: "desc" },
    take: FETCH_BUFFER,
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      difficulty: true,
      imageUrl: true,
      createdAt: true,
    },
  });

  if (!hasInterestProfile) {
    const catKey = (row: EduRow) =>
      (categoryStringToEnum(row.category)?.toString() ?? row.category.trim().toLowerCase()) || "__none__";
    const picked = pickDiverseByCategory(pool, take, catKey, (row) => row.createdAt.getTime());
    const sorted = sortByInterestRecencyRandom(picked, scoreMap, (r) => r.category, (r) => r.createdAt);
    return sorted.map(mapEducationalRow);
  }

  const { interest: nInterest, discovery: nDiscovery } = splitInterestDiscovery(take);
  const others = discoveryCategories(topCategories);

  const byRecent = (a: EduRow, b: EduRow) => b.createdAt.getTime() - a.createdAt.getTime();

  let interestPool = pool.filter((row) => matchesCategorySet(row.category, topCategories)).sort(byRecent);
  let discoveryPool =
    others.length > 0
      ? pool.filter((row) => matchesCategorySet(row.category, others)).sort(byRecent)
      : [];

  let pickedInterest = interestPool.slice(0, nInterest);
  const interestIds = new Set(pickedInterest.map((r) => r.id));

  /** Sin “otras” categorías: descubrimiento = otros ítems recientes fuera del tramo de interés. */
  if (others.length === 0) {
    discoveryPool = pool.filter((row) => !interestIds.has(row.id)).sort(byRecent);
  }

  let pickedDiscovery = discoveryPool.slice(0, nDiscovery);

  let combined: EduRow[] = [...pickedInterest, ...pickedDiscovery];
  const seen = new Set(combined.map((r) => r.id));

  /** Completar hasta `take` sin duplicar. */
  if (combined.length < take) {
    for (const row of pool.sort(byRecent)) {
      if (combined.length >= take) break;
      if (seen.has(row.id)) continue;
      combined.push(row);
      seen.add(row.id);
    }
  }

  combined = combined.slice(0, take);
  const sorted = sortByInterestRecencyRandom(combined, scoreMap, (r) => r.category, (r) => r.createdAt);
  return sorted.map(mapEducationalRow);
}

export type RecommendedQuizItem = {
  kind: "quiz";
  id: string;
  category: string;
  difficulty: string;
  question: string;
  createdAt: string;
};

export type RecommendedVisualItem = {
  kind: "visual";
  id: string;
  category: string;
  difficulty: string;
  question: string;
  imageUrl: string;
  createdAt: string;
};

export type RecommendedGameMixItem = RecommendedQuizItem | RecommendedVisualItem;

function quizToMix(q: {
  id: string;
  category: string;
  difficulty: import("@prisma/client").Difficulty;
  question: string;
  createdAt: Date;
}): RecommendedQuizItem {
  return {
    kind: "quiz",
    id: q.id,
    category: q.category,
    difficulty: String(q.difficulty),
    question: q.question,
    createdAt: q.createdAt.toISOString(),
  };
}

function visualToMix(v: {
  id: string;
  category: string;
  difficulty: import("@prisma/client").Difficulty;
  question: string;
  imageUrl: string;
  createdAt: Date;
}): RecommendedVisualItem {
  return {
    kind: "visual",
    id: v.id,
    category: v.category,
    difficulty: String(v.difficulty),
    question: v.question,
    imageUrl: v.imageUrl,
    createdAt: v.createdAt.toISOString(),
  };
}

function buildGameMixFromPools(
  quizPool: { id: string; category: string; difficulty: import("@prisma/client").Difficulty; question: string; createdAt: Date }[],
  visualPool: {
    id: string;
    category: string;
    difficulty: import("@prisma/client").Difficulty;
    question: string;
    imageUrl: string;
    createdAt: Date;
  }[],
  allowed: ContentCategory[]
): RecommendedGameMixItem[] {
  const mixed: RecommendedGameMixItem[] = [];
  for (const q of quizPool) {
    if (!matchesCategorySet(q.category, allowed)) continue;
    mixed.push(quizToMix(q));
  }
  for (const v of visualPool) {
    if (!matchesCategorySet(v.category, allowed)) continue;
    mixed.push(visualToMix(v));
  }
  return mixed;
}

type GameCand =
  | ({ kind: "quiz" } & {
      id: string;
      category: string;
      difficulty: import("@prisma/client").Difficulty;
      question: string;
      createdAt: Date;
    })
  | ({ kind: "visual" } & {
      id: string;
      category: string;
      difficulty: import("@prisma/client").Difficulty;
      question: string;
      imageUrl: string;
      createdAt: Date;
    });

/**
 * Quiz + visual:
 * - Con intereses: ~70% top / ~30% descubrimiento; orden final por interés → recencia → aleatorio.
 * - Sin intereses: candidatos recientes mezclados con **diversidad por categoría** (popular + categorías mixtas).
 */
export async function fetchRecommendedQuizAndVisual(
  userId: string,
  topCategories: ContentCategory[],
  limit: number,
  hasInterestProfile: boolean
): Promise<RecommendedGameMixItem[]> {
  const take = clampLimit(limit);
  const scoreMap = await getUserInterestScoreMap(userId);

  const [quizPool, visualPool] = await Promise.all([
    prisma.quizQuestion.findMany({
      orderBy: { createdAt: "desc" },
      take: FETCH_BUFFER,
      select: {
        id: true,
        category: true,
        difficulty: true,
        question: true,
        createdAt: true,
      },
    }),
    prisma.visualQuestion.findMany({
      orderBy: { createdAt: "desc" },
      take: FETCH_BUFFER,
      select: {
        id: true,
        category: true,
        difficulty: true,
        question: true,
        imageUrl: true,
        createdAt: true,
      },
    }),
  ]);

  if (!hasInterestProfile) {
    const candidates: GameCand[] = [
      ...quizPool.map((q) => ({ kind: "quiz" as const, ...q })),
      ...visualPool.map((v) => ({ kind: "visual" as const, ...v })),
    ];
    const catKey = (c: GameCand) =>
      (categoryStringToEnum(c.category)?.toString() ?? c.category.trim().toLowerCase()) || "__none__";
    const picked = pickDiverseByCategory(candidates, take, catKey, (c) => c.createdAt.getTime());
    const sorted = sortByInterestRecencyRandom(picked, scoreMap, (c) => c.category, (c) => c.createdAt);
    return sorted.map((c) => (c.kind === "quiz" ? quizToMix(c) : visualToMix(c)));
  }

  const { interest: nInterest, discovery: nDiscovery } = splitInterestDiscovery(take);
  const others = discoveryCategories(topCategories);

  let interestMix = buildGameMixFromPools(quizPool, visualPool, topCategories);
  let pickedInterest = interestMix.slice(0, nInterest);
  const interestKeys = new Set(pickedInterest.map((x) => `${x.kind}:${x.id}`));

  let discoveryMix =
    others.length > 0
      ? buildGameMixFromPools(quizPool, visualPool, others)
      : [];

  let pickedDiscovery = discoveryMix.filter((x) => !interestKeys.has(`${x.kind}:${x.id}`)).slice(0, nDiscovery);

  if (others.length === 0) {
    const allMix = buildGameMixFromPools(quizPool, visualPool, CONTENT_CATEGORY_VALUES);
    discoveryMix = allMix.filter((x) => !interestKeys.has(`${x.kind}:${x.id}`));
    pickedDiscovery = discoveryMix.slice(0, nDiscovery);
  }

  let combined: RecommendedGameMixItem[] = [...pickedInterest, ...pickedDiscovery];
  const seen = new Set(combined.map((x) => `${x.kind}:${x.id}`));

  if (combined.length < take) {
    const fallback = buildGameMixFromPools(quizPool, visualPool, CONTENT_CATEGORY_VALUES).filter(
      (x) => !seen.has(`${x.kind}:${x.id}`)
    );
    for (const x of fallback) {
      if (combined.length >= take) break;
      if (seen.has(`${x.kind}:${x.id}`)) continue;
      combined.push(x);
      seen.add(`${x.kind}:${x.id}`);
    }
  }

  combined = combined.slice(0, take);
  return sortByInterestRecencyRandom(
    combined,
    scoreMap,
    (x) => x.category,
    (x) => new Date(x.createdAt)
  );
}
