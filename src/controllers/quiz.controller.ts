import type { Request, Response } from 'express';
import {
  ContentCategory,
  Difficulty,
  PostType,
  Prisma,
  QuizKnowledgeArea,
  QuizQuestionType,
  Visibility,
  XpGainSource,
} from '@prisma/client';
import {
  applyCorrectAnswersMissionProgress,
  applyEarnXpMissionProgress,
  applyPlayGamesMissionProgress,
  maybeGrantDailyChallengeBonus,
} from '../lib/missionProgress';
import { bumpUserInterestScore, interestDeltaForGameScore } from '../lib/userInterest';
import { addExperience } from '../lib/xpLevel';
import { recordXpGain } from '../lib/xpLedger';
import { logError } from '../lib/logger';
import { prisma } from '../lib/prisma';
import {
  QUIZ_SAMPLE_DEFAULT,
  addFlashcardsForWrong,
  fetchRandomQuizQuestions,
  getQuizCatalogSummary,
  getQuizWallet,
  listDueFlashcards,
  mapQuizCategoryToContentCategory,
  pickDailyChallengeQuestions,
  recordDailyChallengeResult,
  reviewFlashcard,
  unlockQuizHint,
  updateAdaptiveAfterSessionSimple,
  friendsWeeklyXpRanking,
} from '../services/quiz.service';

const QUIZ_CATEGORY_ES: Record<ContentCategory, string> = {
  [ContentCategory.math]: 'matemáticas',
  [ContentCategory.astronomy]: 'astronomía',
  [ContentCategory.science]: 'ciencias',
  [ContentCategory.geography]: 'geografía',
  [ContentCategory.education]: 'educación',
  [ContentCategory.history]: 'historia',
  [ContentCategory.puzzle]: 'rompecabezas',
  [ContentCategory.sports]: 'deportes',
  [ContentCategory.creativity]: 'creatividad',
};

const QUIZ_CATEGORY_EMOJI: Partial<Record<ContentCategory, string>> = {
  [ContentCategory.astronomy]: '🌌',
  [ContentCategory.math]: '➗',
  [ContentCategory.science]: '🧪',
  [ContentCategory.geography]: '🌍',
  [ContentCategory.history]: '📜',
  [ContentCategory.education]: '📚',
  [ContentCategory.puzzle]: '🧩',
  [ContentCategory.sports]: '⚽',
  [ContentCategory.creativity]: '🎨',
};

const QUIZ_ACH_FIRST_TITLE = 'Primer quiz completado';
const QUIZ_ACH_PERFECT_TITLE = 'Puntaje perfecto (5/5)';
const QUIZ_ACH_TEN_TITLE = '10 quizzes jugados';

type UnlockedAchievement = {
  id: string;
  title: string;
  category: ContentCategory;
  badgeIcon: string | null;
};

async function ensureQuizAchievement(
  tx: Prisma.TransactionClient,
  params: { title: string; description: string; icon: string; color: string },
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
  if (typeof value === 'string' && value.trim() !== '') return value.trim();
  if (Array.isArray(value) && value[0] != null) {
    const first = String(value[0]).trim();
    if (first !== '') return first;
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

function parseExcludeIdsQuery(value: unknown): string[] {
  const raw = parseStringQuery(value);
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 200);
}

function parseKnowledgeAreaQuery(value: unknown): QuizKnowledgeArea | undefined {
  const raw = parseStringQuery(value);
  if (!raw) return undefined;
  const k = raw.trim().toLowerCase();
  const allowed = Object.values(QuizKnowledgeArea) as string[];
  return allowed.includes(k) ? (k as QuizKnowledgeArea) : undefined;
}

function parseQuizLevelQuery(value: unknown): number | undefined {
  const raw = parseStringQuery(value);
  if (!raw) return undefined;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 5) return undefined;
  return n;
}

function parseQuestionTypeQuery(value: unknown): QuizQuestionType | undefined {
  const raw = parseStringQuery(value);
  if (!raw) return undefined;
  const k = raw.trim().toUpperCase();
  const allowed = Object.values(QuizQuestionType) as string[];
  return allowed.includes(k) ? (k as QuizQuestionType) : undefined;
}

function parseLimitQuery(value: unknown, fallback: number): number {
  const raw = parseStringQuery(value);
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 20) return fallback;
  return n;
}

function parseBoolQuery(value: unknown): boolean {
  const raw = parseStringQuery(value);
  if (!raw) return false;
  return raw === '1' || raw.toLowerCase() === 'true' || raw.toLowerCase() === 'yes';
}

/**
 * GET /api/quiz?category=astronomy&difficulty=EASY
 * GET /api/quiz?category=mixed&difficulty=EASY
 * GET /api/quiz?area=mathematics&difficulty=MEDIUM&topicSlug=arithmetic&quizLevel=3&limit=5&adaptive=1
 */
export async function getRandomQuiz(req: Request, res: Response): Promise<void> {
  const category = parseStringQuery(req.query.category);
  const area = parseKnowledgeAreaQuery(req.query.area);
  let difficulty = parseDifficultyQuery(req.query.difficulty);
  const excludeIds = parseExcludeIdsQuery(req.query.excludeIds);
  const topicSlug = parseStringQuery(req.query.topicSlug);
  const quizLevel = parseQuizLevelQuery(req.query.quizLevel);
  const questionType = parseQuestionTypeQuery(req.query.questionType);
  const sampleSize = parseLimitQuery(req.query.limit, QUIZ_SAMPLE_DEFAULT);
  const adaptive = parseBoolQuery(req.query.adaptive);

  if (!category && !area) {
    res.status(400).json({ error: 'Indicá category o area (área de conocimiento).' });
    return;
  }
  if (!area && (req.query.difficulty == null || !difficulty)) {
    res.status(400).json({ error: 'Query param difficulty es obligatorio salvo que uses area=…' });
    return;
  }
  if (area && !difficulty && !quizLevel) {
    difficulty = Difficulty.MEDIUM;
  }

  try {
    const userId = req.auth?.kind === 'child' ? req.auth.userId : undefined;
    const questions = await fetchRandomQuizQuestions({
      category,
      difficulty,
      excludeIds,
      knowledgeArea: area,
      topicSlug,
      quizLevel,
      questionType,
      sampleSize,
      userId,
      adaptive,
    });
    res.json({ questions });
  } catch (err) {
    logError('quiz.getRandomQuiz', err);
    res.status(500).json({ error: 'Error al cargar el cuestionario.' });
  }
}

type CompleteQuizBody = {
  userId: string;
  category: string;
  correct: number;
  total: number;
  /** `visual` = juego con imágenes (`VisualQuestion`); mismo XP, GameResult, interés y post. */
  mode: 'quiz' | 'visual';
  knowledgeArea?: QuizKnowledgeArea;
  wrongQuestionIds?: string[];
};

function validateCompleteQuiz(
  body: unknown,
): { ok: true; data: CompleteQuizBody } | { ok: false; error: string } {
  if (body === null || typeof body !== 'object') {
    return { ok: false, error: 'El cuerpo debe ser un objeto JSON.' };
  }
  const b = body as Record<string, unknown>;
  if (!b.userId || String(b.userId).trim() === '') {
    return { ok: false, error: 'userId es obligatorio.' };
  }
  if (!b.category || String(b.category).trim() === '') {
    return { ok: false, error: 'category es obligatorio.' };
  }
  const correct = typeof b.correct === 'number' ? b.correct : Number(b.correct);
  const total = typeof b.total === 'number' ? b.total : Number(b.total);
  if (!Number.isFinite(correct) || !Number.isInteger(correct) || correct < 0) {
    return { ok: false, error: 'correct debe ser un entero >= 0.' };
  }
  if (!Number.isFinite(total) || !Number.isInteger(total) || total < 1) {
    return { ok: false, error: 'total debe ser un entero >= 1.' };
  }
  if (correct > total) {
    return { ok: false, error: 'correct no puede ser mayor que total.' };
  }
  const modeRaw = b.mode;
  const mode: 'quiz' | 'visual' = modeRaw === 'visual' || modeRaw === 'quiz' ? modeRaw : 'quiz';
  let knowledgeArea: QuizKnowledgeArea | undefined;
  if (b.knowledgeArea != null) {
    const raw = String(b.knowledgeArea).trim();
    const allowed = Object.values(QuizKnowledgeArea) as string[];
    if (!allowed.includes(raw)) {
      return { ok: false, error: 'knowledgeArea inválido.' };
    }
    knowledgeArea = raw as QuizKnowledgeArea;
  }
  let wrongQuestionIds: string[] | undefined;
  if (Array.isArray(b.wrongQuestionIds)) {
    wrongQuestionIds = b.wrongQuestionIds
      .map((x) => String(x).trim())
      .filter(Boolean)
      .slice(0, 40);
  }
  return {
    ok: true,
    data: {
      userId: String(b.userId).trim(),
      category: String(b.category).trim(),
      correct,
      total,
      mode,
      knowledgeArea,
      wrongQuestionIds,
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
  const { userId, category, correct, total, mode, knowledgeArea, wrongQuestionIds } =
    validation.data;

  if (req.role !== 'child' || req.auth?.kind !== 'child' || req.auth.userId !== userId) {
    res.status(403).json({ error: 'No autorizado para completar el quiz con este userId.' });
    return;
  }

  const contentCategory =
    knowledgeArea != null
      ? mapQuizCategoryToContentCategory(String(knowledgeArea))
      : mapQuizCategoryToContentCategory(category);
  if (!contentCategory) {
    res.status(400).json({ error: 'category inválida para el quiz.' });
    return;
  }

  const xpGained = correct * 10;
  const interestDelta = interestDeltaForGameScore(Math.max(1, correct * 10));

  const isMixedQuiz = category.trim().toLowerCase() === 'mixed';
  const isVisual = mode === 'visual';
  const esName = QUIZ_CATEGORY_ES[contentCategory] ?? category;
  const emoji = QUIZ_CATEGORY_EMOJI[contentCategory] ?? '📚';
  const postContent = isMixedQuiz
    ? isVisual
      ? `Completé un juego visual modo desafío 🎯 con ${correct}/${total}`
      : `Completé un quiz de modo desafío 🎯 con ${correct}/${total}`
    : isVisual
      ? `Completé un juego visual de ${esName} ${emoji} con ${correct}/${total}`
      : `Completé un quiz de ${esName} ${emoji} con ${correct}/${total}`;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, level: true, experience: true },
    });
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado.' });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      const gamePrefix = isVisual ? 'Visual' : 'Quiz';
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
            difficulty: 'easy',
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
            OR: [{ name: { startsWith: 'Quiz' } }, { name: { startsWith: 'Visual' } }],
          },
        },
      });

      const unlockables: Array<{
        title: string;
        description: string;
        icon: string;
        color: string;
      }> = [];
      if (totalQuizzesPlayed >= 1) {
        unlockables.push({
          title: QUIZ_ACH_FIRST_TITLE,
          description: 'Completaste tu primer quiz.',
          icon: '✅',
          color: '#22c55e',
        });
      }
      if (correct === total) {
        unlockables.push({
          title: QUIZ_ACH_PERFECT_TITLE,
          description: 'Respondiste todas las preguntas correctamente en un quiz.',
          icon: '🏅',
          color: '#eab308',
        });
      }
      if (totalQuizzesPlayed >= 10) {
        unlockables.push({
          title: QUIZ_ACH_TEN_TITLE,
          description: 'Jugaste 10 quizzes.',
          icon: '🎯',
          color: '#3b82f6',
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
      const coinsEarned = mode === 'quiz' ? correct * 2 : 0;
      let userProgress = await tx.user.update({
        where: { id: userId },
        data: {
          level: next.level,
          experience: next.experience,
          ...(coinsEarned > 0 ? { quizCoins: { increment: coinsEarned } } : {}),
        },
        select: { id: true, level: true, experience: true, quizCoins: true },
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
          select: { id: true, level: true, experience: true, quizCoins: true },
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
        coinsEarned,
      };
    });

    if (mode === 'quiz' && wrongQuestionIds && wrongQuestionIds.length > 0) {
      try {
        await addFlashcardsForWrong({ userId, questionIds: wrongQuestionIds });
      } catch (e) {
        logError('quiz.flashcards_wrong', e);
      }
    }
    if (mode === 'quiz' && knowledgeArea) {
      try {
        await updateAdaptiveAfterSessionSimple({
          userId,
          area: knowledgeArea,
          correct,
          total,
        });
      } catch (e) {
        logError('quiz.adaptive', e);
      }
    }

    res.status(201).json({
      ...result,
      levelUp: result.userProgress.level > user.level,
      newLevel: result.userProgress.level,
      quizCoins: result.userProgress.quizCoins,
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') {
        res.status(409).json({
          error: 'Conflicto de unicidad al registrar el resultado del quiz.',
        });
        return;
      }
      if (err.code === 'P2003') {
        res.status(400).json({ error: 'Referencia inválida.' });
        return;
      }
    }
    logError('quiz.completeQuiz', err);
    res.status(500).json({ error: 'Error al registrar el resultado del quiz.' });
  }
}

export async function getQuizCatalog(_req: Request, res: Response): Promise<void> {
  try {
    const data = await getQuizCatalogSummary();
    res.json(data);
  } catch (err) {
    logError('quiz.catalog', err);
    res.status(500).json({ error: 'Error al obtener el catálogo de quizzes.' });
  }
}

export async function getQuizWalletHandler(req: Request, res: Response): Promise<void> {
  if (req.auth?.kind !== 'child') {
    res.status(403).json({ error: 'Solo menores autenticados.' });
    return;
  }
  const w = await getQuizWallet(req.auth.userId);
  if (!w) {
    res.status(404).json({ error: 'Usuario no encontrado.' });
    return;
  }
  res.json(w);
}

export async function postQuizHintUnlock(req: Request, res: Response): Promise<void> {
  if (req.auth?.kind !== 'child') {
    res.status(403).json({ error: 'Solo menores autenticados.' });
    return;
  }
  const b = req.body as Record<string, unknown>;
  const questionId = typeof b?.questionId === 'string' ? b.questionId.trim() : '';
  if (!questionId) {
    res.status(400).json({ error: 'questionId es obligatorio.' });
    return;
  }
  const r = await unlockQuizHint({ userId: req.auth.userId, questionId });
  if ('error' in r) {
    res.status(400).json({ error: r.error });
    return;
  }
  res.json(r);
}

export async function getQuizDailyChallenge(req: Request, res: Response): Promise<void> {
  if (req.auth?.kind !== 'child') {
    res.status(403).json({ error: 'Solo menores autenticados.' });
    return;
  }
  try {
    const data = await pickDailyChallengeQuestions(req.auth.userId);
    res.json(data);
  } catch (err) {
    logError('quiz.daily', err);
    res.status(500).json({ error: 'Error al armar el desafío del día.' });
  }
}

export async function postQuizDailyRecord(req: Request, res: Response): Promise<void> {
  if (req.auth?.kind !== 'child') {
    res.status(403).json({ error: 'Solo menores autenticados.' });
    return;
  }
  const b = req.body as Record<string, unknown>;
  const correct = typeof b.correct === 'number' ? b.correct : Number(b.correct);
  const total = typeof b.total === 'number' ? b.total : Number(b.total);
  if (
    !Number.isInteger(correct) ||
    correct < 0 ||
    !Number.isInteger(total) ||
    total < 1 ||
    correct > total
  ) {
    res.status(400).json({ error: 'correct y total inválidos.' });
    return;
  }
  try {
    const data = await recordDailyChallengeResult({
      userId: req.auth.userId,
      correct,
      total,
    });
    res.status(201).json(data);
  } catch (err) {
    logError('quiz.daily_record', err);
    res.status(500).json({ error: 'Error al registrar el desafío del día.' });
  }
}

export async function getQuizFlashcardsDue(req: Request, res: Response): Promise<void> {
  if (req.auth?.kind !== 'child') {
    res.status(403).json({ error: 'Solo menores autenticados.' });
    return;
  }
  const limit = parseLimitQuery(req.query.limit, 15);
  try {
    const questions = await listDueFlashcards(req.auth.userId, limit);
    res.json({ questions });
  } catch (err) {
    logError('quiz.flashcards_list', err);
    res.status(500).json({ error: 'Error al listar repasos.' });
  }
}

export async function postQuizFlashcardReview(req: Request, res: Response): Promise<void> {
  if (req.auth?.kind !== 'child') {
    res.status(403).json({ error: 'Solo menores autenticados.' });
    return;
  }
  const b = req.body as Record<string, unknown>;
  const questionId = typeof b?.questionId === 'string' ? b.questionId.trim() : '';
  const quality = typeof b.quality === 'number' ? b.quality : Number(b.quality);
  if (!questionId || !Number.isInteger(quality) || quality < 0 || quality > 3) {
    res.status(400).json({ error: 'questionId y quality (0–3) son obligatorios.' });
    return;
  }
  const r = await reviewFlashcard({ userId: req.auth.userId, questionId, quality });
  if ('error' in r) {
    res.status(404).json({ error: r.error });
    return;
  }
  res.json(r);
}

export async function postQuizFlashcardsFromWrong(req: Request, res: Response): Promise<void> {
  if (req.auth?.kind !== 'child') {
    res.status(403).json({ error: 'Solo menores autenticados.' });
    return;
  }
  const b = req.body as Record<string, unknown>;
  if (!Array.isArray(b.questionIds)) {
    res.status(400).json({ error: 'questionIds debe ser un array.' });
    return;
  }
  const questionIds = b.questionIds
    .map((x) => String(x).trim())
    .filter(Boolean)
    .slice(0, 40);
  try {
    const added = await addFlashcardsForWrong({ userId: req.auth.userId, questionIds });
    res.status(201).json({ added });
  } catch (err) {
    logError('quiz.flashcards_add', err);
    res.status(500).json({ error: 'Error al crear tarjetas de repaso.' });
  }
}

export async function getQuizFriendsWeekRanking(req: Request, res: Response): Promise<void> {
  if (req.auth?.kind !== 'child') {
    res.status(403).json({ error: 'Solo menores autenticados.' });
    return;
  }
  const limit = parseLimitQuery(req.query.limit, 15);
  try {
    const data = await friendsWeeklyXpRanking(req.auth.userId, limit);
    res.json(data);
  } catch (err) {
    logError('quiz.friends_week', err);
    res.status(500).json({ error: 'Error al obtener el ranking semanal de amigos.' });
  }
}
