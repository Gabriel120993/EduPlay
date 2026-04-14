import type { Request, Response } from "express";
import { ContentCategory, Difficulty, PostType, Prisma, Visibility, XpGainSource } from "@prisma/client";
import {
  applyCorrectAnswersMissionProgress,
  applyEarnXpMissionProgress,
  applyPlayGamesMissionProgress,
  maybeGrantDailyChallengeBonus,
} from "../lib/missionProgress";
import { bumpUserInterestScore, interestDeltaForGameScore } from "../lib/userInterest";
import { addExperience } from "../lib/xpLevel";
import { recordXpGain } from "../lib/xpLedger";
import { logError } from "../lib/logger";
import { prisma } from "../lib/prisma";

function mapQuizCategoryToContentCategory(value: string): ContentCategory | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  const byName: Record<string, ContentCategory> = {
    math: ContentCategory.math,
    astronomy: ContentCategory.astronomy,
    science: ContentCategory.science,
    geography: ContentCategory.geography,
    education: ContentCategory.education,
    history: ContentCategory.history,
    puzzle: ContentCategory.puzzle,
    sports: ContentCategory.sports,
    creativity: ContentCategory.creativity,
    /** Quiz con preguntas de varias categorías; interés/post bajo educación general. */
    mixed: ContentCategory.education,
  };
  return byName[normalized] ?? null;
}

const QUIZ_CATEGORY_ES: Record<ContentCategory, string> = {
  [ContentCategory.math]: "matemáticas",
  [ContentCategory.astronomy]: "astronomía",
  [ContentCategory.science]: "ciencias",
  [ContentCategory.geography]: "geografía",
  [ContentCategory.education]: "educación",
  [ContentCategory.history]: "historia",
  [ContentCategory.puzzle]: "rompecabezas",
  [ContentCategory.sports]: "deportes",
  [ContentCategory.creativity]: "creatividad",
};

const QUIZ_CATEGORY_EMOJI: Partial<Record<ContentCategory, string>> = {
  [ContentCategory.astronomy]: "🌌",
  [ContentCategory.math]: "➗",
  [ContentCategory.science]: "🧪",
  [ContentCategory.geography]: "🌍",
  [ContentCategory.history]: "📜",
  [ContentCategory.education]: "📚",
  [ContentCategory.puzzle]: "🧩",
  [ContentCategory.sports]: "⚽",
  [ContentCategory.creativity]: "🎨",
};

const QUIZ_SAMPLE_SIZE = 5;
const QUIZ_ACH_FIRST_TITLE = "Primer quiz completado";
const QUIZ_ACH_PERFECT_TITLE = "Puntaje perfecto (5/5)";
const QUIZ_ACH_TEN_TITLE = "10 quizzes jugados";

type UnlockedAchievement = {
  id: string;
  title: string;
  category: ContentCategory;
  badgeIcon: string | null;
};

async function ensureQuizAchievement(
  tx: Prisma.TransactionClient,
  params: { title: string; description: string; icon: string; color: string }
) {
  const existing = await tx.achievement.findFirst({
    where: { title: params.title },
    select: { id: true, title: true, category: true, badgeIcon: true },
  });
  if (existing) return existing;
  return tx.achievement.create({
    data: {
      title: params.title,
      description: params.description,
      iconUrl: null,
      category: ContentCategory.education,
      badgeIcon: params.icon,
      badgeColor: params.color,
    },
    select: { id: true, title: true, category: true, badgeIcon: true },
  });
}

function parseStringQuery(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim() !== "") return value.trim();
  if (Array.isArray(value) && value[0] != null) {
    const first = String(value[0]).trim();
    if (first !== "") return first;
  }
  return undefined;
}

function parseDifficultyQuery(value: unknown): Difficulty | undefined {
  const raw = parseStringQuery(value);
  if (!raw) return undefined;
  if (raw === Difficulty.EASY || raw === Difficulty.MEDIUM || raw === Difficulty.HARD) {
    return raw;
  }
  return undefined;
}

function shuffleInPlace<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]!;
    a[i] = a[j]!;
    a[j] = t;
  }
  return a;
}

function optionsAsStrings(options: unknown): string[] {
  if (!Array.isArray(options)) return [];
  return options.map((o) => String(o));
}

function parseExcludeIdsQuery(value: unknown): string[] {
  const raw = parseStringQuery(value);
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 200);
}

/**
 * GET /api/quiz?category=astronomy&difficulty=EASY
 * GET /api/quiz?category=mixed&difficulty=EASY — hasta 5 preguntas aleatorias de cualquier categoría (misma dificultad).
 */
export async function getRandomQuiz(req: Request, res: Response): Promise<void> {
  const category = parseStringQuery(req.query.category);
  const difficulty = parseDifficultyQuery(req.query.difficulty);
  const excludeIds = parseExcludeIdsQuery(req.query.excludeIds);

  if (!category) {
    res.status(400).json({ error: "Query param category es obligatorio." });
    return;
  }
  if (req.query.difficulty == null || !difficulty) {
    res.status(400).json({ error: "Query param difficulty es obligatorio (EASY, MEDIUM o HARD)." });
    return;
  }

  try {
    const normalizedCat = category.trim().toLowerCase();
    const isMixed = normalizedCat === "mixed";

    const rows = await prisma.quizQuestion.findMany({
      where: isMixed
        ? {
            difficulty,
            ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
          }
        : {
            category: { equals: category, mode: "insensitive" },
            difficulty,
            ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
          },
    });

    let pool = rows;
    if (pool.length < QUIZ_SAMPLE_SIZE) {
      pool = await prisma.quizQuestion.findMany({
        where: isMixed
          ? { difficulty }
          : {
              category: { equals: category, mode: "insensitive" },
              difficulty,
            },
      });
    }
    const picked = shuffleInPlace(pool).slice(0, QUIZ_SAMPLE_SIZE);

    const questions = picked.map((q) => ({
      id: q.id,
      question: q.question,
      options: optionsAsStrings(q.options),
      correct: q.correct,
      category: q.category,
      difficulty: q.difficulty,
      createdAt: q.createdAt.toISOString(),
    }));

    res.json({ questions });
  } catch (err) {
    logError("quiz.getRandomQuiz", err);
    res.status(500).json({ error: "Error al cargar el cuestionario." });
  }
}

type CompleteQuizBody = {
  userId: string;
  category: string;
  correct: number;
  total: number;
  /** `visual` = juego con imágenes (`VisualQuestion`); mismo XP, GameResult, interés y post. */
  mode: "quiz" | "visual";
};

function validateCompleteQuiz(body: unknown): { ok: true; data: CompleteQuizBody } | { ok: false; error: string } {
  if (body === null || typeof body !== "object") {
    return { ok: false, error: "El cuerpo debe ser un objeto JSON." };
  }
  const b = body as Record<string, unknown>;
  if (!b.userId || String(b.userId).trim() === "") {
    return { ok: false, error: "userId es obligatorio." };
  }
  if (!b.category || String(b.category).trim() === "") {
    return { ok: false, error: "category es obligatorio." };
  }
  const correct = typeof b.correct === "number" ? b.correct : Number(b.correct);
  const total = typeof b.total === "number" ? b.total : Number(b.total);
  if (!Number.isFinite(correct) || !Number.isInteger(correct) || correct < 0) {
    return { ok: false, error: "correct debe ser un entero >= 0." };
  }
  if (!Number.isFinite(total) || !Number.isInteger(total) || total < 1) {
    return { ok: false, error: "total debe ser un entero >= 1." };
  }
  if (correct > total) {
    return { ok: false, error: "correct no puede ser mayor que total." };
  }
  const modeRaw = b.mode;
  const mode: "quiz" | "visual" =
    modeRaw === "visual" || modeRaw === "quiz" ? modeRaw : "quiz";
  return {
    ok: true,
    data: {
      userId: String(b.userId).trim(),
      category: String(b.category).trim(),
      correct,
      total,
      mode,
    },
  };
}

/**
 * POST /api/quiz/complete
 * Registra resultado de quiz o juego visual: GameResult, XP (correct * 10), UserInterest y post.
 * Body opcional: `mode: "quiz" | "visual"` (default `quiz`). Visual usa `Game` con nombre `Visual · …`.
 */
export async function completeQuiz(req: Request, res: Response): Promise<void> {
  const validation = validateCompleteQuiz(req.body);
  if (!validation.ok) {
    res.status(400).json({ error: validation.error });
    return;
  }
  const { userId, category, correct, total, mode } = validation.data;

  if (req.role !== "child" || req.auth?.kind !== "child" || req.auth.userId !== userId) {
    res.status(403).json({ error: "No autorizado para completar el quiz con este userId." });
    return;
  }

  const contentCategory = mapQuizCategoryToContentCategory(category);
  if (!contentCategory) {
    res.status(400).json({ error: "category inválida para el quiz." });
    return;
  }

  const xpGained = correct * 10;
  const interestDelta = interestDeltaForGameScore(Math.max(1, correct * 10));

  const isMixedQuiz = category.trim().toLowerCase() === "mixed";
  const isVisual = mode === "visual";
  const esName = QUIZ_CATEGORY_ES[contentCategory] ?? category;
  const emoji = QUIZ_CATEGORY_EMOJI[contentCategory] ?? "📚";
  const postContent = isMixedQuiz
    ? isVisual
      ? `Completé un juego visual modo desafío 🎯 con ${correct}/${total}`
      : `Completé un quiz de modo desafío 🎯 con ${correct}/${total}`
    : isVisual
      ? `Completé un juego visual de ${esName} ${emoji} con ${correct}/${total}`
      : `Completé un quiz de ${esName} ${emoji} con ${correct}/${total}`;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, level: true, experience: true } });
    if (!user) {
      res.status(404).json({ error: "Usuario no encontrado." });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const gamePrefix = isVisual ? "Visual" : "Quiz";
      let game = await tx.game.findFirst({
        where: {
          category: contentCategory,
          name: { startsWith: gamePrefix },
        },
      });
      if (!game) {
        game = await tx.game.create({
          data: {
            name: `${gamePrefix} · ${contentCategory}`,
            category: contentCategory,
            difficulty: "easy",
          },
        });
      }

      const gameResult = await tx.gameResult.create({
        data: {
          userId,
          gameId: game.id,
          score: correct,
        },
      });

      await bumpUserInterestScore(tx, userId, contentCategory, interestDelta);

      const totalQuizzesPlayed = await tx.gameResult.count({
        where: {
          userId,
          game: {
            OR: [{ name: { startsWith: "Quiz" } }, { name: { startsWith: "Visual" } }],
          },
        },
      });

      const unlockables: Array<{ title: string; description: string; icon: string; color: string }> = [];
      if (totalQuizzesPlayed >= 1) {
        unlockables.push({
          title: QUIZ_ACH_FIRST_TITLE,
          description: "Completaste tu primer quiz.",
          icon: "✅",
          color: "#22c55e",
        });
      }
      if (correct === total) {
        unlockables.push({
          title: QUIZ_ACH_PERFECT_TITLE,
          description: "Respondiste todas las preguntas correctamente en un quiz.",
          icon: "🏅",
          color: "#eab308",
        });
      }
      if (totalQuizzesPlayed >= 10) {
        unlockables.push({
          title: QUIZ_ACH_TEN_TITLE,
          description: "Jugaste 10 quizzes.",
          icon: "🎯",
          color: "#3b82f6",
        });
      }

      const unlockedAchievements: UnlockedAchievement[] = [];
      for (const achDef of unlockables) {
        const ach = await ensureQuizAchievement(tx, achDef);
        const already = await tx.userAchievement.findUnique({
          where: { userId_achievementId: { userId, achievementId: ach.id } },
          select: { id: true },
        });
        if (!already) {
          await tx.userAchievement.create({
            data: { userId, achievementId: ach.id },
          });
          unlockedAchievements.push(ach);
        }
      }

      const post = await tx.post.create({
        data: {
          userId,
          category: contentCategory,
          type: PostType.GAME_RESULT,
          visibility: Visibility.PUBLIC,
          content: postContent,
          gameResultId: gameResult.id,
        },
      });

      const next = addExperience(user.level, user.experience, xpGained);
      let userProgress = await tx.user.update({
        where: { id: userId },
        data: { level: next.level, experience: next.experience },
        select: { id: true, level: true, experience: true },
      });
      await recordXpGain(tx, userId, xpGained, XpGainSource.GAME_RESULT);

      const missionRewards = [
        ...(await applyPlayGamesMissionProgress(tx, userId, contentCategory)),
        ...(await applyEarnXpMissionProgress(tx, userId, xpGained)),
        ...(await applyCorrectAnswersMissionProgress(tx, userId, correct)),
      ];
      const dailyChallengeBonus = await maybeGrantDailyChallengeBonus(tx, userId);

      if (missionRewards.length > 0 || dailyChallengeBonus) {
        userProgress = await tx.user.findUniqueOrThrow({
          where: { id: userId },
          select: { id: true, level: true, experience: true },
        });
      }

      return {
        gameResult,
        post,
        userProgress: { ...userProgress, xpGained },
        missionRewards,
        dailyChallengeBonus,
        unlockedAchievements,
        score: correct,
        total,
        xpGained,
      };
    });

    res.status(201).json({
      ...result,
      levelUp: result.userProgress.level > user.level,
      newLevel: result.userProgress.level,
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        res.status(409).json({
          error: "Conflicto de unicidad al registrar el resultado del quiz.",
        });
        return;
      }
      if (err.code === "P2003") {
        res.status(400).json({ error: "Referencia inválida." });
        return;
      }
    }
    logError("quiz.completeQuiz", err);
    res.status(500).json({ error: "Error al registrar el resultado del quiz." });
  }
}
