import type { Request, Response } from 'express';
import {
  ContentCategory,
  Difficulty,
  EducationalContentType,
  PostType,
  Visibility,
  XpGainSource,
  type EducationalAsset,
  type EducationalContent,
  type Prisma,
} from '@prisma/client';
import { educationalCategoryToContentCategory } from '../lib/contentCategory';
import {
  applyReadContentMissionProgress,
  maybeGrantDailyChallengeBonus,
} from '../lib/missionProgress';
import { assertAllowPosting } from '../lib/parentalRestrictions';
import { bumpUserInterestScore } from '../lib/userInterest';
import { addExperience } from '../lib/xpLevel';
import { recordXpGain } from '../lib/xpLedger';
import { logError } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { parsePaginationQuery } from '../lib/pagination';
import { findEducationalContentsForList } from '../services/contentList.service';

const EMPTY_CONTENT_MESSAGE = '¡Pronto tendremos nuevo contenido para vos!';
const EMPTY_CONTENT_SUGGESTION =
  'Probá explorar otras categorías mientras preparamos nuevas actividades.';

const CATEGORY_META: Record<string, { icon: string; color: string; description: string }> = {
  math: {
    icon: '🔢',
    color: '#4F46E5',
    description: 'Números, operaciones, geometría y desafíos matemáticos.',
  },
  science: {
    icon: '🧪',
    color: '#059669',
    description: 'Cuerpo humano, naturaleza, experimentos y sistema solar.',
  },
  geography: {
    icon: '🌍',
    color: '#D97706',
    description: 'Mapas, países, culturas, historia y mundo social.',
  },
  education: {
    icon: '📖',
    color: '#DC2626',
    description: 'Lectura, gramática, vocabulario y comprensión.',
  },
  creativity: {
    icon: '🎨',
    color: '#DB2777',
    description: 'Arte, música, teatro, expresión y cultura.',
  },
  puzzle: {
    icon: '🧩',
    color: '#7C3AED',
    description: 'Acertijos, patrones, lógica y razonamiento espacial.',
  },
  astronomy: {
    icon: '🚀',
    color: '#2563EB',
    description: 'Planetas, estrellas, exploración espacial y universo.',
  },
  history: {
    icon: '🏺',
    color: '#B45309',
    description: 'Civilizaciones, fuentes, líneas de tiempo y patrimonio.',
  },
  sports: {
    icon: '⚽',
    color: '#16A34A',
    description: 'Movimiento, coordinación, hábitos saludables y juego.',
  },
};

const FALLBACK_CATEGORY_META = {
  icon: '📚',
  color: '#6366F1',
  description: 'Contenido educativo para seguir aprendiendo.',
};

type ProgressInfo = {
  percentage: number;
  timeSpentSeconds: number;
  completed: boolean;
  lastSeenAt: string | null;
};

type ContentCard = {
  id: string;
  kind: 'content';
  title: string;
  description: string;
  type: EducationalContentType;
  badge: 'APRENDER' | 'CUESTIONARIO' | 'JUEGO' | 'MISIÓN';
  difficulty: Difficulty;
  category: string;
  icon: string;
  color: string;
  createdAt: string;
  progress: ProgressInfo | null;
};

type ProgressEventMetadata = {
  contentId?: unknown;
  percentage?: unknown;
  progressPercent?: unknown;
  timeSpentSeconds?: unknown;
  timeViewedSeconds?: unknown;
  completed?: unknown;
};

function getChildUserId(req: Request): string | null {
  return req.auth?.kind === 'child' ? req.auth.userId : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function metadataOf(value: Prisma.JsonValue): ProgressEventMetadata {
  return isRecord(value) ? value : {};
}

function numericMetadataValue(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(n) ? n : fallback;
}

function isPlaceholderContent(item: Pick<EducationalContent, 'title' | 'description'>): boolean {
  const text = `${item.title} ${item.description}`.toLowerCase();
  return (
    text.includes('demo de recurso') ||
    text.includes('demostración de recurso') ||
    text.includes('demostracion de recurso') ||
    text.includes('recurso demo')
  );
}

type ContentWithHero = EducationalContent & { heroImageAsset?: EducationalAsset | null };

function resolveContentImageUrl(row: ContentWithHero): string | null {
  if (row.heroImageAsset?.id) {
    return `/api/image-proxy/${row.heroImageAsset.id}-medium`;
  }
  const legacy = row.imageUrl?.trim();
  return legacy && legacy.length > 0 ? legacy : null;
}

function emptyContentPayload(extra: Record<string, unknown> = {}) {
  return {
    message: EMPTY_CONTENT_MESSAGE,
    suggestion: EMPTY_CONTENT_SUGGESTION,
    ...extra,
  };
}

function categoryMeta(category: string) {
  return CATEGORY_META[category] ?? FALLBACK_CATEGORY_META;
}

function badgeForContent(type: EducationalContentType): ContentCard['badge'] {
  if (type === EducationalContentType.INTERACTIVE) return 'JUEGO';
  return 'APRENDER';
}

function serializeContent(
  item: EducationalContent,
  progress: ProgressInfo | null = null,
): ContentCard {
  const meta = categoryMeta(item.category);
  return {
    id: item.id,
    kind: 'content',
    title: item.title,
    description: item.description,
    type: item.contentType,
    badge: badgeForContent(item.contentType),
    difficulty: item.difficulty,
    category: item.category,
    icon: meta.icon,
    color: meta.color,
    createdAt: item.createdAt.toISOString(),
    progress,
  };
}

function ageToDifficulty(age?: number): Difficulty | null {
  if (!age) return null;
  if (age <= 8) return Difficulty.EASY;
  if (age <= 11) return Difficulty.MEDIUM;
  return Difficulty.HARD;
}

function parseStringListQuery(value: unknown): string[] {
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);
  }
  if (Array.isArray(value)) {
    return value.flatMap((v) => parseStringListQuery(v));
  }
  return [];
}

function parseContentTypeQuery(value: unknown): EducationalContentType | undefined {
  const raw = parseStringQuery(value)?.toUpperCase();
  if (!raw) return undefined;
  return Object.values(EducationalContentType).includes(raw as EducationalContentType)
    ? (raw as EducationalContentType)
    : undefined;
}

async function loadProgressByContentId(userId: string | null): Promise<Map<string, ProgressInfo>> {
  if (!userId) return new Map();
  const events = await prisma.analyticsEvent.findMany({
    where: { userId, eventName: { in: ['content_view', 'content_progress'] } },
    orderBy: { createdAt: 'desc' },
    take: 300,
  });

  const map = new Map<string, ProgressInfo>();
  for (const event of events) {
    const metadata = metadataOf(event.metadata);
    const contentId = typeof metadata.contentId === 'string' ? metadata.contentId : null;
    if (!contentId || map.has(contentId)) continue;
    const percentage = Math.max(
      0,
      Math.min(100, numericMetadataValue(metadata.percentage ?? metadata.progressPercent)),
    );
    const timeSpentSeconds = Math.max(
      0,
      numericMetadataValue(metadata.timeSpentSeconds ?? metadata.timeViewedSeconds),
    );
    map.set(contentId, {
      percentage,
      timeSpentSeconds,
      completed: metadata.completed === true || percentage >= 100,
      lastSeenAt: event.createdAt.toISOString(),
    });
  }
  return map;
}

async function loadPublishedContent(limit = 200): Promise<ContentWithHero[]> {
  const rows = await prisma.educationalContent.findMany({
    where: { published: true },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { heroImageAsset: true },
  });
  return rows.filter((row) => !isPlaceholderContent(row));
}

function scoreContent(
  item: ContentWithHero,
  input: {
    interests: string[];
    preferredDifficulty: Difficulty | null;
    startedIds: Set<string>;
    popularCategories: Set<string>;
  },
): number {
  let score = 0;
  if (input.interests.includes(item.category)) score += 40;
  if (input.preferredDifficulty && item.difficulty === input.preferredDifficulty) score += 30;
  if (!input.startedIds.has(item.id)) score += 20;
  if (input.popularCategories.has(item.category)) score += 10;
  return score;
}

async function recommendedContent(input: {
  userId: string | null;
  age?: number;
  interests: string[];
  difficulty?: Difficulty;
  category?: string;
  type?: EducationalContentType;
  limit?: number;
}): Promise<{ items: ContentCard[]; progressById: Map<string, ProgressInfo> }> {
  const [content, progressById, popularRows] = await Promise.all([
    loadPublishedContent(240),
    loadProgressByContentId(input.userId),
    prisma.analyticsEvent.findMany({
      where: { eventName: { in: ['content_view', 'content_progress'] } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
  ]);
  const startedIds = new Set(progressById.keys());
  const popularCategories = new Set<string>();
  for (const event of popularRows) {
    const contentId = metadataOf(event.metadata).contentId;
    if (typeof contentId !== 'string') continue;
    const match = content.find((item) => item.id === contentId);
    if (match) popularCategories.add(match.category);
  }

  const preferredDifficulty = input.difficulty ?? ageToDifficulty(input.age) ?? null;
  const filtered = content.filter((item) => {
    if (input.category && item.category !== input.category) return false;
    if (input.type && item.contentType !== input.type) return false;
    return true;
  });
  const items = filtered
    .map((item) => ({
      item,
      score: scoreContent(item, {
        interests: input.interests,
        preferredDifficulty,
        startedIds,
        popularCategories,
      }),
    }))
    .sort((a, b) => b.score - a.score || b.item.createdAt.getTime() - a.item.createdAt.getTime())
    .slice(0, input.limit ?? 20)
    .map(({ item }) => serializeContent(item, progressById.get(item.id) ?? null));
  return { items, progressById };
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

function mapEducationalCategoryToContentCategory(value: string): ContentCategory | null {
  return educationalCategoryToContentCategory(value);
}

function mapEducationalSlugToLegacyCategory(slug: string): string {
  const map: Record<string, string> = {
    matematicas: 'math',
    'ciencias-naturales': 'science',
    'ciencias-sociales': 'geography',
    lenguaje: 'education',
    'arte-y-cultura': 'creativity',
    arte: 'creativity',
    'pensamiento-logico': 'puzzle',
  };
  return map[slug] ?? slug;
}

export async function getContentFeed(req: Request, res: Response): Promise<void> {
  const userId = getChildUserId(req);
  const age = Number(req.query.age);
  const interests = parseStringListQuery(req.query.interests);

  try {
    const [recommendationsResult, missions, challenges] = await Promise.all([
      recommendedContent({
        userId,
        age: Number.isFinite(age) ? age : undefined,
        interests,
        limit: 18,
      }),
      prisma.thematicMission.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      userId
        ? prisma.userGamifiedChallenge.findMany({
            where: { userId, bucket: 'DAILY' },
            orderBy: { createdAt: 'desc' },
            take: 7,
          })
        : Promise.resolve([]),
    ]);

    const recommendations = recommendationsResult.items;
    if (recommendations.length === 0) {
      res.json(
        emptyContentPayload({
          continue: null,
          recommendations: [],
          newContent: [],
          missions: [],
          dailyChallenges: challenges,
          feed: [],
        }),
      );
      return;
    }

    const started = recommendations
      .filter((item) => item.progress && !item.progress.completed)
      .sort(
        (a, b) =>
          Date.parse(b.progress?.lastSeenAt ?? '') - Date.parse(a.progress?.lastSeenAt ?? ''),
      );
    const continueWatching = started[0] ?? null;
    const newContent = recommendations.filter((item) => !item.progress).slice(0, 8);
    const feed = [
      ...(continueWatching ? [{ section: 'continue', ...continueWatching }] : []),
      ...recommendations.map((item) => ({ section: 'recommended', ...item })),
      ...newContent.map((item) => ({ section: 'new', ...item })),
    ];

    res.json({
      title: 'Feed educativo',
      continue: continueWatching,
      recommendations,
      newContent,
      missions: missions.map((mission) => ({
        id: mission.id,
        kind: 'mission',
        badge: 'MISIÓN',
        title: mission.title,
        theme: mission.theme,
        description: mission.narrative,
        reward: mission.reward,
        stepCount: mission.stepCount,
      })),
      dailyChallenges: challenges,
      feed,
      order: ['continue', 'recommended', 'new'],
    });
  } catch (err) {
    logError('content.feed', err);
    res.status(500).json({ error: 'Error al cargar el feed educativo.' });
  }
}

export async function getContentExplore(req: Request, res: Response): Promise<void> {
  const userId = getChildUserId(req);
  try {
    const [recommendationsResult, quizzes, games, visualGames, learn] = await Promise.all([
      recommendedContent({
        userId,
        interests: parseStringListQuery(req.query.interests),
        limit: 12,
      }),
      prisma.quiz.findMany({
        where: { published: true },
        include: { topic: true },
        orderBy: { createdAt: 'desc' },
        take: 12,
      }),
      prisma.miniGame.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        take: 12,
      }),
      prisma.visualQuestion.findMany({
        orderBy: { createdAt: 'desc' },
        take: 12,
        include: { imageAsset: { select: { id: true, urlMedium: true } } },
      }),
      loadPublishedContent(60),
    ]);

    const sections = [
      {
        key: 'recommended',
        title: 'Recomendado',
        description: 'Contenido elegido según tu actividad e intereses.',
        count: recommendationsResult.items.length,
        items: recommendationsResult.items,
      },
      {
        key: 'games',
        title: 'Juegos',
        description: 'Minijuegos para practicar mientras jugás.',
        count: games.length,
        items: games.map((game) => ({
          id: game.id,
          kind: 'game',
          badge: 'JUEGO',
          title: game.name,
          description: game.description,
          difficulty: game.difficulty,
          category: game.category,
          config: game.config,
        })),
      },
      {
        key: 'quizzes',
        title: 'Quizzes por área',
        description: 'Cuestionarios organizados por tema y dificultad.',
        count: quizzes.length,
        items: quizzes.map((quiz) => ({
          id: quiz.id,
          kind: 'quiz',
          badge: 'CUESTIONARIO',
          title: quiz.title,
          description: quiz.description,
          difficulty: quiz.difficulty,
          questionCount: quiz.questionCount,
          topic: quiz.topic?.name ?? null,
        })),
      },
      {
        key: 'visualGames',
        title: 'Juegos visuales',
        description: 'Preguntas con imágenes para observar y decidir.',
        count: visualGames.length,
        items: visualGames.map((item) => ({
          id: item.id,
          kind: 'visual-question',
          badge: 'JUEGO',
          title: item.question,
          imageUrl: item.imageAsset?.id
            ? `/api/image-proxy/${item.imageAsset.id}-medium`
            : item.imageUrl.trim(),
          category: item.category,
          difficulty: item.difficulty,
        })),
      },
      {
        key: 'learn',
        title: 'Aprender',
        description: 'Lecturas, videos y experimentos educativos.',
        count: learn.length,
        items: learn.slice(0, 20).map((item) => serializeContent(item)),
      },
    ];

    const totalItems = sections.reduce((sum, section) => sum + section.count, 0);
    if (totalItems === 0) {
      res.json(emptyContentPayload({ sections }));
      return;
    }
    res.json({ sections });
  } catch (err) {
    logError('content.explore', err);
    res.status(500).json({ error: 'Error al cargar Explorar.' });
  }
}

export async function getRecommendedContent(req: Request, res: Response): Promise<void> {
  const ageRaw = Number(req.query.age);
  const difficulty = parseDifficultyQuery(req.query.difficulty);
  const type = parseContentTypeQuery(req.query.type);
  const category = parseStringQuery(req.query.category);

  if (req.query.difficulty != null && !difficulty) {
    res.status(400).json({ error: 'difficulty debe ser EASY, MEDIUM o HARD.' });
    return;
  }
  if (req.query.type != null && !type) {
    res
      .status(400)
      .json({ error: 'type debe ser VIDEO, READING, EXPERIMENT, INTERACTIVE, WORKSHEET o AUDIO.' });
    return;
  }

  try {
    const result = await recommendedContent({
      userId: getChildUserId(req),
      age: Number.isFinite(ageRaw) ? ageRaw : undefined,
      interests: parseStringListQuery(req.query.interests),
      difficulty,
      category,
      type,
      limit: 30,
    });
    if (result.items.length === 0) {
      res.json(emptyContentPayload({ contents: [] }));
      return;
    }
    res.json({
      algorithm: {
        interests: '40%',
        adequateDifficulty: '30%',
        newContent: '20%',
        popularAmongPeers: '10%',
      },
      contents: result.items,
    });
  } catch (err) {
    logError('content.recommended', err);
    res.status(500).json({ error: 'Error al obtener recomendaciones.' });
  }
}

export async function listContentCategories(req: Request, res: Response): Promise<void> {
  try {
    const categories = await prisma.educationalCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        subjects: {
          include: {
            topics: {
              include: {
                _count: { select: { contents: true } },
              },
            },
          },
        },
      },
    });
    const rows = categories.map((category) => {
      const contentCount = category.subjects.reduce(
        (sum, subject) =>
          sum + subject.topics.reduce((topicSum, topic) => topicSum + topic._count.contents, 0),
        0,
      );
      const legacyCategory = mapEducationalSlugToLegacyCategory(category.slug);
      const meta = categoryMeta(legacyCategory);
      return {
        id: category.id,
        slug: category.slug,
        name: category.name,
        icon: category.icon ?? meta.icon,
        color: meta.color,
        description: meta.description,
        contentCount,
      };
    });

    if (rows.length === 0) {
      res.json(emptyContentPayload({ categories: [] }));
      return;
    }
    res.json({ categories: rows });
  } catch (err) {
    logError('content.categories', err);
    res.status(500).json({ error: 'Error al listar categorías.' });
  }
}

export async function searchEducationalContent(req: Request, res: Response): Promise<void> {
  const q = parseStringQuery(req.query.q);
  if (!q) {
    res.status(400).json({ error: 'q es obligatorio.' });
    return;
  }

  try {
    const [content, quizzes, games, missions] = await Promise.all([
      prisma.educationalContent.findMany({
        where: {
          published: true,
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
            { category: { contains: q, mode: 'insensitive' } },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
        include: { heroImageAsset: true },
      }),
      prisma.quiz.findMany({
        where: {
          published: true,
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 20,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.miniGame.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 20,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.thematicMission.findMany({
        where: {
          isActive: true,
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { theme: { contains: q, mode: 'insensitive' } },
            { narrative: { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 20,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const safeContent = content.filter((item) => !isPlaceholderContent(item));
    const grouped = {
      aprender: safeContent.map((item) => serializeContent(item)),
      cuestionarios: quizzes.map((quiz) => ({
        id: quiz.id,
        kind: 'quiz',
        badge: 'CUESTIONARIO',
        title: quiz.title,
        description: quiz.description,
        difficulty: quiz.difficulty,
        questionCount: quiz.questionCount,
      })),
      juegos: games.map((game) => ({
        id: game.id,
        kind: 'game',
        badge: 'JUEGO',
        title: game.name,
        description: game.description,
        difficulty: game.difficulty,
        category: game.category,
      })),
      misiones: missions.map((mission) => ({
        id: mission.id,
        kind: 'mission',
        badge: 'MISIÓN',
        title: mission.title,
        description: mission.narrative,
        theme: mission.theme,
        stepCount: mission.stepCount,
      })),
    };
    const total = Object.values(grouped).reduce((sum, rows) => sum + rows.length, 0);
    if (total === 0) {
      res.json(emptyContentPayload({ q, results: grouped }));
      return;
    }
    res.json({ q, results: grouped, total });
  } catch (err) {
    logError('content.search', err);
    res.status(500).json({ error: 'Error en la búsqueda.' });
  }
}

export async function getContentDetailWithProgress(req: Request, res: Response): Promise<void> {
  const contentId = req.params.contentId?.trim() ?? req.params.id?.trim();
  if (!contentId) {
    res.status(400).json({ error: 'contentId inválido.' });
    return;
  }

  try {
    const item = await prisma.educationalContent.findUnique({
      where: { id: contentId },
      include: {
        topic: { include: { subject: { include: { category: true } } } },
        heroImageAsset: true,
      },
    });
    if (!item || isPlaceholderContent(item)) {
      res.status(404).json(emptyContentPayload({ content: null }));
      return;
    }
    const progressById = await loadProgressByContentId(getChildUserId(req));
    const related = await prisma.educationalContent.findMany({
      where: {
        published: true,
        id: { not: item.id },
        OR: [
          { topicId: item.topicId },
          { category: item.category },
          { difficulty: item.difficulty },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 8,
    });

    res.json({
      content: {
        ...serializeContent(item, progressById.get(item.id) ?? null),
        body: item.content,
        imageUrl: resolveContentImageUrl(item),
        meta: item.meta,
        topic: item.topic
          ? {
              id: item.topic.id,
              slug: item.topic.slug,
              name: item.topic.name,
              subject: item.topic.subject.name,
              category: item.topic.subject.category.name,
            }
          : null,
      },
      progress: progressById.get(item.id) ?? null,
      related: related
        .filter((row) => !isPlaceholderContent(row))
        .map((row) => serializeContent(row, progressById.get(row.id) ?? null)),
    });
  } catch (err) {
    logError('content.detail', err);
    res.status(500).json({ error: 'Error al obtener contenido.' });
  }
}

export async function postContentProgress(req: Request, res: Response): Promise<void> {
  const userId = getChildUserId(req);
  if (!userId) {
    res.status(403).json({ error: 'Solo menores autenticados.' });
    return;
  }
  const contentId = req.params.contentId?.trim() ?? req.params.id?.trim();
  const percentage = numericMetadataValue(req.body?.percentage ?? req.body?.progressPercent, -1);
  const timeSpentSeconds = numericMetadataValue(
    req.body?.timeSpentSeconds ?? req.body?.timeViewedSeconds,
    0,
  );
  const completed = req.body?.completed === true || percentage >= 100;

  if (!contentId) {
    res.status(400).json({ error: 'contentId inválido.' });
    return;
  }
  if (percentage < 0 || percentage > 100) {
    res.status(400).json({ error: 'percentage debe estar entre 0 y 100.' });
    return;
  }

  try {
    const content = await prisma.educationalContent.findUnique({ where: { id: contentId } });
    if (!content || isPlaceholderContent(content)) {
      res.status(404).json(emptyContentPayload({ content: null }));
      return;
    }
    await prisma.analyticsEvent.create({
      data: {
        userId,
        eventName: 'content_progress',
        metadata: {
          contentId,
          percentage,
          timeSpentSeconds,
          completed,
        },
      },
    });
    res.status(201).json({
      ok: true,
      progress: {
        percentage,
        timeSpentSeconds,
        completed,
        lastSeenAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    logError('content.progress', err);
    res.status(500).json({ error: 'Error al registrar progreso.' });
  }
}

/**
 * GET /api/content?category=...&difficulty=EASY
 */
export async function listEducationalContent(req: Request, res: Response): Promise<void> {
  const category = parseStringQuery(req.query.category);
  const difficulty = parseDifficultyQuery(req.query.difficulty);

  if (req.query.difficulty != null && !difficulty) {
    res.status(400).json({ error: 'difficulty debe ser EASY, MEDIUM o HARD.' });
    return;
  }

  try {
    const { page, limit, skip } = parsePaginationQuery(req.query.page, req.query.limit);
    const content = await findEducationalContentsForList(
      {
        ...(category ? { category } : {}),
        ...(difficulty ? { difficulty } : {}),
      },
      { skip, take: limit },
    );
    res.json({
      content: content.map(({ heroImageAsset: _h, ...row }) => ({
        ...row,
        imageUrl: resolveContentImageUrl({ ...row, heroImageAsset: _h }),
      })),
      page,
      limit,
    });
  } catch (err) {
    logError('content.listEducationalContent', err);
    res.status(500).json({ error: 'Error al listar contenido educativo.' });
  }
}

/**
 * GET /api/content/:id
 */
export async function getEducationalContentById(req: Request, res: Response): Promise<void> {
  const id = req.params.id?.trim();
  if (!id) {
    res.status(400).json({ error: 'ID de contenido inválido.' });
    return;
  }

  try {
    const item = await prisma.educationalContent.findUnique({
      where: { id },
      include: { heroImageAsset: true },
    });
    if (!item) {
      res.status(404).json({ error: 'Contenido no encontrado.' });
      return;
    }
    const { heroImageAsset: _hero, ...rest } = item;
    res.json({
      content: {
        ...rest,
        imageUrl: resolveContentImageUrl(item),
      },
    });
  } catch (err) {
    logError('content.getEducationalContentById', err);
    res.status(500).json({ error: 'Error al obtener contenido educativo.' });
  }
}

/**
 * POST /api/content/:id/complete
 * body: { userId: string, createPost?: boolean }
 */
export async function completeEducationalContent(req: Request, res: Response): Promise<void> {
  const contentId = req.params.id?.trim();
  const userId = typeof req.body?.userId === 'string' ? req.body.userId.trim() : '';
  const createPost = req.body?.createPost === true;

  if (!contentId) {
    res.status(400).json({ error: 'ID de contenido inválido.' });
    return;
  }
  if (!userId) {
    res.status(400).json({ error: 'userId es obligatorio.' });
    return;
  }
  if (req.role !== 'child' || req.auth?.kind !== 'child' || req.auth.userId !== userId) {
    res.status(403).json({ error: 'No autorizado para completar contenido con este userId.' });
    return;
  }

  const XP_REWARD = 10;
  const INTEREST_DELTA = 4;

  try {
    const [user, content] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, level: true, experience: true },
      }),
      prisma.educationalContent.findUnique({ where: { id: contentId } }),
    ]);
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado.' });
      return;
    }
    if (!content) {
      res.status(404).json({ error: 'Contenido no encontrado.' });
      return;
    }

    const mappedCategory = mapEducationalCategoryToContentCategory(content.category);
    const next = addExperience(user.level, user.experience, XP_REWARD);

    const result = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { level: next.level, experience: next.experience },
        select: { id: true, level: true, experience: true },
      });

      await recordXpGain(tx, userId, XP_REWARD, XpGainSource.MISSION);

      if (mappedCategory) {
        await bumpUserInterestScore(tx, userId, mappedCategory, INTEREST_DELTA);
      }

      let postId: string | null = null;
      if (createPost && mappedCategory) {
        const parental = await assertAllowPosting(userId);
        if (parental.ok) {
          const post = await tx.post.create({
            data: {
              userId,
              type: PostType.POST,
              visibility: Visibility.PUBLIC,
              category: mappedCategory,
              content: `Aprendí sobre ${content.title.toLowerCase()} 🌌`,
            },
            select: { id: true },
          });
          postId = post.id;
        }
      }

      const missionRewards = await applyReadContentMissionProgress(tx, userId);
      const dailyChallengeBonus = await maybeGrantDailyChallengeBonus(tx, userId);

      return { updatedUser, postId, mappedCategory, missionRewards, dailyChallengeBonus };
    });

    res.status(200).json({
      ok: true,
      xpGained: XP_REWARD,
      interestIncreased: Boolean(result.mappedCategory),
      createdPost: Boolean(result.postId),
      postId: result.postId,
      user: result.updatedUser,
      levelUp: result.updatedUser.level > user.level,
      newLevel: result.updatedUser.level,
      missionRewards: result.missionRewards,
      dailyChallengeBonus: result.dailyChallengeBonus,
    });
  } catch (err) {
    logError('content.completeEducationalContent', err);
    res.status(500).json({ error: 'Error al completar contenido educativo.' });
  }
}
