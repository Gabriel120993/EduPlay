import {
  ContentCategory,
  Difficulty,
  FriendStatus,
  Prisma,
  QuizKnowledgeArea,
  QuizQuestionType,
} from "@prisma/client";
import { prisma } from "../lib/prisma";
import { utcWeekRange } from "../lib/xpWeek";

export const QUIZ_SAMPLE_DEFAULT = 5;

const AREA_TO_LEGACY_CATEGORY: Record<QuizKnowledgeArea, string> = {
  mathematics: "math",
  natural_sciences: "science",
  social_sciences: "geography",
  language: "education",
  art_culture: "creativity",
  logic_thinking: "puzzle",
  emotions_values: "education",
};

export function mapKnowledgeAreaToLegacyCategory(area: QuizKnowledgeArea): string {
  return AREA_TO_LEGACY_CATEGORY[area];
}

export function mapLegacyCategoryToKnowledgeArea(category: string): QuizKnowledgeArea | null {
  const k = category.trim().toLowerCase();
  const m: Record<string, QuizKnowledgeArea> = {
    math: QuizKnowledgeArea.mathematics,
    science: QuizKnowledgeArea.natural_sciences,
    astronomy: QuizKnowledgeArea.natural_sciences,
    geography: QuizKnowledgeArea.social_sciences,
    history: QuizKnowledgeArea.social_sciences,
    education: QuizKnowledgeArea.language,
    creativity: QuizKnowledgeArea.art_culture,
    puzzle: QuizKnowledgeArea.logic_thinking,
  };
  return m[k] ?? null;
}

export function quizLevelToDifficulty(level: number): Difficulty {
  if (level <= 2) return Difficulty.EASY;
  if (level === 3) return Difficulty.MEDIUM;
  return Difficulty.HARD;
}

export function difficultyToQuizLevels(difficulty: Difficulty): number[] {
  if (difficulty === Difficulty.EASY) return [1, 2];
  if (difficulty === Difficulty.MEDIUM) return [3];
  return [4, 5];
}

export type QuizQuestionClientDto = {
  id: string;
  question: string;
  options: string[];
  correct: number;
  category: string;
  difficulty: Difficulty;
  quizLevel: number;
  knowledgeArea: QuizKnowledgeArea;
  topicSlug: string;
  questionType: QuizQuestionType;
  explanation: string;
  hintCost: number;
  readingPassage: string | null;
  orderTapSequence: number[] | null;
  createdAt: string;
};

function optionsAsStrings(options: unknown): string[] {
  if (!Array.isArray(options)) return [];
  return options.map((o) => String(o));
}

function asOrderSeq(raw: unknown): number[] | null {
  if (!Array.isArray(raw)) return null;
  const nums = raw.map((x) => Number(x)).filter((n) => Number.isInteger(n) && n >= 0);
  return nums.length > 0 ? nums : null;
}

export function shuffleInPlace<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]!;
    a[i] = a[j]!;
    a[j] = t;
  }
  return a;
}

function toDto(q: {
  id: string;
  question: string;
  options: unknown;
  correct: number;
  category: string;
  difficulty: Difficulty;
  quizLevel: number;
  knowledgeArea: QuizKnowledgeArea;
  topicSlug: string;
  questionType: QuizQuestionType;
  explanation: string;
  hintCost: number;
  readingPassage: string | null;
  orderTapSequence: unknown;
  createdAt: Date;
}): QuizQuestionClientDto {
  return {
    id: q.id,
    question: q.question,
    options: optionsAsStrings(q.options),
    correct: q.correct,
    category: q.category,
    difficulty: q.difficulty,
    quizLevel: q.quizLevel,
    knowledgeArea: q.knowledgeArea,
    topicSlug: q.topicSlug,
    questionType: q.questionType,
    explanation: q.explanation,
    hintCost: q.hintCost,
    readingPassage: q.readingPassage,
    orderTapSequence: asOrderSeq(q.orderTapSequence),
    createdAt: q.createdAt.toISOString(),
  };
}

export type FetchRandomQuizParams = {
  category?: string;
  difficulty?: Difficulty;
  excludeIds: string[];
  knowledgeArea?: QuizKnowledgeArea;
  topicSlug?: string;
  quizLevel?: number;
  questionType?: QuizQuestionType;
  sampleSize: number;
  userId?: string;
  adaptive?: boolean;
};

export async function fetchRandomQuizQuestions(params: FetchRandomQuizParams): Promise<QuizQuestionClientDto[]> {
  const {
    category,
    difficulty,
    excludeIds,
    knowledgeArea,
    topicSlug,
    quizLevel,
    questionType,
    sampleSize,
    userId,
    adaptive,
  } = params;

  let areaFilter: QuizKnowledgeArea | undefined = knowledgeArea;
  let levelFilter: number | undefined = quizLevel;
  if (!areaFilter && category) {
    const mapped = mapLegacyCategoryToKnowledgeArea(category);
    if (mapped) areaFilter = mapped;
  }
  if (adaptive && userId && areaFilter) {
    const skill = await prisma.userQuizAreaSkill.findUnique({
      where: { userId_area: { userId, area: areaFilter } },
      select: { adaptiveLevel: true },
    });
    if (skill) {
      levelFilter = skill.adaptiveLevel;
    }
  }

  const isMixed = category?.trim().toLowerCase() === "mixed";
  const levels =
    levelFilter != null && levelFilter >= 1 && levelFilter <= 5
      ? [levelFilter]
      : difficulty
        ? difficultyToQuizLevels(difficulty)
        : [1, 2, 3, 4, 5];

  const baseWhere: Prisma.QuizQuestionWhereInput = {
    ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
    ...(questionType ? { questionType } : {}),
    ...(topicSlug ? { topicSlug: { equals: topicSlug, mode: "insensitive" } } : {}),
  };

  const where: Prisma.QuizQuestionWhereInput = isMixed
    ? {
        ...baseWhere,
        ...(difficulty ? { difficulty } : {}),
      }
    : areaFilter
      ? {
          ...baseWhere,
          knowledgeArea: areaFilter,
          quizLevel: levels.length === 1 ? levels[0]! : { in: levels },
          ...(difficulty ? { difficulty } : {}),
        }
      : {
          ...baseWhere,
          category: { equals: category ?? "", mode: "insensitive" },
          ...(difficulty ? { difficulty } : {}),
          quizLevel: levels.length === 1 ? levels[0]! : { in: levels },
        };

  let rows = await prisma.quizQuestion.findMany({ where });
  if (rows.length < sampleSize && !isMixed && areaFilter) {
    rows = await prisma.quizQuestion.findMany({
      where: {
        knowledgeArea: areaFilter,
        ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
        ...(questionType ? { questionType } : {}),
      },
    });
  }
  if (rows.length < sampleSize && !isMixed && category && !areaFilter) {
    rows = await prisma.quizQuestion.findMany({
      where: {
        category: { equals: category, mode: "insensitive" },
        ...(difficulty ? { difficulty } : {}),
        ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
      },
    });
  }
  if (rows.length < sampleSize && isMixed && difficulty) {
    rows = await prisma.quizQuestion.findMany({
      where: { difficulty, ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}) },
    });
  }

  const picked = shuffleInPlace(rows).slice(0, sampleSize);
  return picked.map((q) => toDto(q));
}

export async function getQuizCatalogSummary(): Promise<{
  areas: Array<{ area: QuizKnowledgeArea; topics: string[]; count: number }>;
  total: number;
}> {
  const grouped = await prisma.quizQuestion.groupBy({
    by: ["knowledgeArea"],
    _count: { _all: true },
  });
  const topicsByArea = await prisma.quizQuestion.groupBy({
    by: ["knowledgeArea", "topicSlug"],
    _count: { _all: true },
  });
  const topicMap = new Map<QuizKnowledgeArea, Set<string>>();
  for (const row of topicsByArea) {
    if (!topicMap.has(row.knowledgeArea)) topicMap.set(row.knowledgeArea, new Set());
    topicMap.get(row.knowledgeArea)!.add(row.topicSlug);
  }
  const areas = grouped.map((g) => ({
    area: g.knowledgeArea,
    topics: [...(topicMap.get(g.knowledgeArea) ?? [])].sort(),
    count: g._count._all,
  }));
  const total = areas.reduce((s, a) => s + a.count, 0);
  return { areas: areas.sort((a, b) => a.area.localeCompare(b.area)), total };
}

export async function unlockQuizHint(params: {
  userId: string;
  questionId: string;
}): Promise<{ hintText: string; coinsRemaining: number } | { error: string }> {
  const q = await prisma.quizQuestion.findUnique({
    where: { id: params.questionId },
    select: { hintText: true, hintCost: true },
  });
  if (!q?.hintText) {
    return { error: "No hay pista disponible para esta pregunta." };
  }
  const hintText = q.hintText;
  const cost = Math.max(0, q.hintCost);
  try {
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: params.userId },
        select: { quizCoins: true },
      });
      if (!user) return { error: "Usuario no encontrado." };
      if (user.quizCoins < cost) {
        return { error: "No tenés monedas suficientes para esta pista." };
      }
      const updated = await tx.user.update({
        where: { id: params.userId },
        data: { quizCoins: { decrement: cost } },
        select: { quizCoins: true },
      });
      return { coinsRemaining: updated.quizCoins };
    });
    if ("coinsRemaining" in result && typeof result.coinsRemaining === "number") {
      return { hintText, coinsRemaining: result.coinsRemaining };
    }
    return { error: typeof result.error === "string" ? result.error : "Error al desbloquear la pista." };
  } catch {
    return { error: "No se pudo desbloquear la pista." };
  }
}

export async function getQuizWallet(userId: string): Promise<{ coins: number } | null> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { quizCoins: true } });
  if (!u) return null;
  return { coins: u.quizCoins };
}

/** Ajuste simple según porcentaje de aciertos de la sesión. */
export async function updateAdaptiveAfterSessionSimple(params: {
  userId: string;
  area: QuizKnowledgeArea;
  correct: number;
  total: number;
}): Promise<void> {
  const ratio = params.total > 0 ? params.correct / params.total : 0;
  const nextLevel = ratio >= 0.8 ? 5 : ratio >= 0.6 ? 4 : ratio >= 0.4 ? 3 : ratio >= 0.2 ? 2 : 1;
  await prisma.userQuizAreaSkill.upsert({
    where: { userId_area: { userId: params.userId, area: params.area } },
    create: {
      userId: params.userId,
      area: params.area,
      adaptiveLevel: nextLevel,
      lastCorrect: params.correct,
      lastWrong: params.total - params.correct,
    },
    update: {
      adaptiveLevel: nextLevel,
      lastCorrect: params.correct,
      lastWrong: params.total - params.correct,
    },
  });
}

export async function pickDailyChallengeQuestions(userId: string): Promise<{
  questions: QuizQuestionClientDto[];
  streakDays: number;
  dayUtc: string;
  alreadyBest: number;
}> {
  const day = new Date();
  day.setUTCHours(0, 0, 0, 0);
  const progress = await prisma.quizDailyProgress.findUnique({
    where: { userId_day: { userId, day } },
  });
  const streakRow = await prisma.userQuizStreak.findUnique({ where: { userId } });
  const pool = await prisma.quizQuestion.findMany({
    take: 200,
    orderBy: { createdAt: "desc" },
  });
  const picked = shuffleInPlace(pool).slice(0, QUIZ_SAMPLE_DEFAULT);
  return {
    questions: picked.map((q) => toDto(q)),
    streakDays: streakRow?.streakDays ?? 0,
    dayUtc: day.toISOString(),
    alreadyBest: progress?.bestScore ?? 0,
  };
}

export async function recordDailyChallengeResult(params: {
  userId: string;
  correct: number;
  total: number;
}): Promise<{ streakDays: number; qualified: boolean; coinsAwarded: number }> {
  const day = new Date();
  day.setUTCHours(0, 0, 0, 0);
  const qualified = params.correct >= 3;
  const coinsAwarded = params.correct * 2 + (qualified ? 10 : 0);

  const streak = await prisma.$transaction(async (tx) => {
    const existing = await tx.quizDailyProgress.findUnique({
      where: { userId_day: { userId: params.userId, day } },
    });
    await tx.quizDailyProgress.upsert({
      where: { userId_day: { userId: params.userId, day } },
      create: {
        userId: params.userId,
        day,
        bestScore: params.correct,
        attempts: 1,
      },
      update: {
        bestScore: Math.max(params.correct, existing?.bestScore ?? 0),
        attempts: { increment: 1 },
      },
    });

    const prev = await tx.userQuizStreak.findUnique({ where: { userId: params.userId } });
    let streakDays = prev?.streakDays ?? 0;
    const lastQ = prev?.lastQualifyingDayUtc;
    if (qualified) {
      const yesterday = new Date(day);
      yesterday.setUTCDate(yesterday.getUTCDate() - 1);
      if (!lastQ) {
        streakDays = 1;
      } else if (lastQ.getTime() === yesterday.getTime()) {
        streakDays += 1;
      } else if (lastQ.getTime() === day.getTime()) {
        // mismo día: mantenemos racha
      } else {
        streakDays = 1;
      }
      await tx.userQuizStreak.upsert({
        where: { userId: params.userId },
        create: { userId: params.userId, streakDays, lastQualifyingDayUtc: day },
        update: { streakDays, lastQualifyingDayUtc: day },
      });
    }

    await tx.user.update({
      where: { id: params.userId },
      data: { quizCoins: { increment: coinsAwarded } },
    });

    return { streakDays, qualified };
  });

  return { ...streak, coinsAwarded };
}

export async function addFlashcardsForWrong(params: { userId: string; questionIds: string[] }): Promise<number> {
  const unique = [...new Set(params.questionIds)].slice(0, 40);
  const when = new Date();
  let n = 0;
  for (const qid of unique) {
    const exists = await prisma.userQuizFlashcard.findUnique({
      where: { userId_questionId: { userId: params.userId, questionId: qid } },
    });
    if (exists) continue;
    await prisma.userQuizFlashcard.create({
      data: {
        userId: params.userId,
        questionId: qid,
        nextReviewAt: when,
        intervalDays: 0,
        easeFactor: 2.5,
        repetitions: 0,
      },
    });
    n += 1;
  }
  return n;
}

export async function listDueFlashcards(userId: string, limit: number): Promise<QuizQuestionClientDto[]> {
  const now = new Date();
  const cards = await prisma.userQuizFlashcard.findMany({
    where: { userId, nextReviewAt: { lte: now } },
    take: limit,
    orderBy: { nextReviewAt: "asc" },
    include: { question: true },
  });
  return cards.map((c) => toDto(c.question));
}

export async function reviewFlashcard(params: {
  userId: string;
  questionId: string;
  /** 0 difícil … 3 fácil */
  quality: number;
}): Promise<{ nextReviewAt: string } | { error: string }> {
  const card = await prisma.userQuizFlashcard.findUnique({
    where: { userId_questionId: { userId: params.userId, questionId: params.questionId } },
  });
  if (!card) return { error: "Tarjeta no encontrada." };
  const q = Math.max(0, Math.min(3, params.quality));
  let ease = card.easeFactor;
  let rep = card.repetitions;
  let interval = card.intervalDays;
  if (q < 2) {
    rep = 0;
    interval = 0;
    ease = Math.max(1.3, ease - 0.2);
  } else {
    rep += 1;
    if (rep === 1) interval = 1;
    else if (rep === 2) interval = 3;
    else interval = Math.round(interval * ease);
    ease = ease + (0.1 - (3 - q) * (0.08 + (3 - q) * 0.02));
  }
  const next = new Date();
  next.setUTCDate(next.getUTCDate() + Math.max(0, interval));
  const updated = await prisma.userQuizFlashcard.update({
    where: { id: card.id },
    data: { easeFactor: ease, repetitions: rep, intervalDays: interval, nextReviewAt: next },
  });
  return { nextReviewAt: updated.nextReviewAt.toISOString() };
}

export async function friendsWeeklyXpRanking(userId: string, limit: number) {
  const { weekStartUtc, weekEndExclusiveUtc } = utcWeekRange();
  const friends = await prisma.friend.findMany({
    where: {
      userId,
      status: FriendStatus.ACCEPTED,
    },
    select: { friendId: true },
  });
  const ids = friends.map((f) => f.friendId);
  if (ids.length === 0) return { weekStartUtc: weekStartUtc.toISOString(), users: [] as const };

  const grouped = await prisma.xpGainLedger.groupBy({
    by: ["userId"],
    where: {
      userId: { in: ids },
      createdAt: { gte: weekStartUtc, lt: weekEndExclusiveUtc },
    },
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
    take: limit,
  });
  const userRows = await prisma.user.findMany({
    where: { id: { in: grouped.map((g) => g.userId) } },
    select: { id: true, username: true, realName: true, avatarUrl: true },
  });
  const byId = new Map(userRows.map((u) => [u.id, u]));
  return {
    weekStartUtc: weekStartUtc.toISOString(),
    users: grouped.map((g, i) => {
      const u = byId.get(g.userId);
      return {
        rank: i + 1,
        userId: g.userId,
        username: u?.username ?? "",
        realName: u?.realName ?? "",
        avatarUrl: u?.avatarUrl ?? null,
        xpThisWeek: g._sum.amount ?? 0,
      };
    }),
  };
}

export function mapQuizKnowledgeAreaToContentCategory(area: QuizKnowledgeArea): ContentCategory {
  const m: Record<QuizKnowledgeArea, ContentCategory> = {
    mathematics: ContentCategory.math,
    natural_sciences: ContentCategory.science,
    social_sciences: ContentCategory.geography,
    language: ContentCategory.education,
    art_culture: ContentCategory.creativity,
    logic_thinking: ContentCategory.puzzle,
    emotions_values: ContentCategory.education,
  };
  return m[area];
}
