import type { Request, Response } from 'express';
import { PostType, Visibility } from '@prisma/client';
import { toApiBadge } from '../lib/achievementApi';
import {
  getReactionCountsByPostIds,
  getUserReactionsByPostIds,
  reactionCountsDtoToByType,
  ZERO_REACTION_COUNTS_DTO,
} from '../lib/reactionCounts';
import { feedLabelForPostType } from '../lib/feedVariety';
import { interestBoostForTopCategories } from '../lib/recommendationBoost';
import { buildPublicFeedVisibilityWhere } from '../lib/postFeedVisibility';
import { getAcceptedFriendUserIds } from './post.controller';
import { logError } from '../lib/logger';
import { prisma } from '../lib/prisma';

const DEFAULT_PAGE_SIZE = 15;
const MIN_PAGE_SIZE = 5;
const MAX_PAGE_SIZE = 30;
const MAX_EXCLUDE_IDS = 400;

/** Cuotas del feed explore: intereses / trending / exploración por categorías. */
const SHARE_INTEREST = 0.5;
const SHARE_TRENDING = 0.3;
/** SHARE_RANDOM = 0.2 implícito */

const RECENT_POOL = 500;
const TRENDING_POOL = 200;

function parseUserId(req: Request): string {
  const raw = req.query.userId;
  if (typeof raw === 'string') return raw.trim();
  if (Array.isArray(raw) && raw[0] != null) return String(raw[0]).trim();
  return '';
}

function parsePageSize(req: Request): number {
  const raw = req.query.limit;
  const n =
    typeof raw === 'string'
      ? Number.parseInt(raw, 10)
      : Array.isArray(raw)
        ? Number.parseInt(String(raw[0]), 10)
        : NaN;
  if (!Number.isFinite(n) || n < MIN_PAGE_SIZE) return DEFAULT_PAGE_SIZE;
  return Math.min(MAX_PAGE_SIZE, Math.max(MIN_PAGE_SIZE, Math.floor(n)));
}

/** IDs ya mostrados (scroll infinito): `exclude=id1,id2,...`). */
function parseExcludeIds(req: Request): Set<string> {
  const raw = req.query.exclude;
  if (typeof raw !== 'string' || !raw.trim()) return new Set();
  const parts = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_EXCLUDE_IDS);
  return new Set(parts);
}

function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = items[i]!;
    items[i] = items[j]!;
    items[j] = t;
  }
  return items;
}

function formatCreatedAtLocal(date: Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
}

const postExploreSelect = {
  id: true,
  userId: true,
  content: true,
  imageUrl: true,
  videoUrl: true,
  mediaModerationFlagged: true,
  mediaModerationNote: true,
  parentModerationVisibleAt: true,
  parentModerationVisibleById: true,
  category: true,
  type: true,
  visibility: true,
  createdAt: true,
  user: {
    select: {
      id: true,
      username: true,
      avatarUrl: true,
    },
  },
  userAchievement: {
    select: {
      achievement: {
        select: {
          title: true,
          category: true,
          badgeIcon: true,
          badgeColor: true,
          rarity: true,
        },
      },
    },
  },
  gameResult: {
    select: {
      game: {
        select: { category: true },
      },
    },
  },
  _count: {
    select: { reactions: true },
  },
} as const;

type ExploreRow = {
  id: string;
  userId: string;
  content: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  mediaModerationFlagged: boolean;
  mediaModerationNote: string | null;
  parentModerationVisibleAt: Date | null;
  parentModerationVisibleById: string | null;
  category: import('@prisma/client').ContentCategory | null;
  type: PostType;
  visibility: Visibility;
  createdAt: Date;
  user: { id: string; username: string; avatarUrl: string | null };
  userAchievement: {
    achievement: {
      title: string;
      category: import('@prisma/client').ContentCategory;
      badgeIcon: string;
      badgeColor: string;
      rarity: import('@prisma/client').AchievementRarity;
    };
  } | null;
  gameResult: { game: { category: import('@prisma/client').ContentCategory } } | null;
  _count: { reactions: number };
};

function resolvePostCategory(p: ExploreRow): string | null {
  if (p.category != null && String(p.category).trim() !== '') {
    return String(p.category).trim();
  }
  if (p.type === PostType.ACHIEVEMENT) {
    return p.userAchievement?.achievement?.category?.trim() ?? null;
  }
  if (p.type === PostType.GAME_RESULT) {
    return p.gameResult?.game?.category?.trim() ?? null;
  }
  return null;
}

function mapExplorePost(p: ExploreRow) {
  const reactionsTotal = p._count.reactions;
  const postCategory = resolvePostCategory(p);
  const ach = p.userAchievement?.achievement;
  const badge = p.type === PostType.ACHIEVEMENT && ach ? toApiBadge(ach) : undefined;

  return {
    id: p.id,
    userId: p.userId,
    content: p.content,
    imageUrl: p.imageUrl,
    videoUrl: p.videoUrl,
    mediaModerationFlagged: p.mediaModerationFlagged,
    mediaModerationNote: p.mediaModerationNote,
    parentModerationVisibleAt: p.parentModerationVisibleAt?.toISOString() ?? null,
    parentModerationVisibleById: p.parentModerationVisibleById,
    type: p.type,
    feedLabel: feedLabelForPostType(p.type),
    visibility: p.visibility,
    createdAt: p.createdAt.toISOString(),
    createdAtFormatted: formatCreatedAtLocal(p.createdAt),
    reactionsTotal,
    ...(postCategory ? { category: postCategory } : {}),
    user: {
      id: p.user.id,
      username: p.user.username,
      avatarUrl: p.user.avatarUrl,
    },
    ...(badge ? { badge } : {}),
  };
}

/**
 * GET /api/explore?userId=…&limit=15&exclude=id1,id2,…
 * Mezcla: ~50% intereses, ~30% trending, ~20% exploración.
 * Paginación: pasá `exclude` con los ids ya devueltos para la siguiente página.
 * Respuesta: `{ posts, hasMore }`.
 */
export async function getExploreFeed(req: Request, res: Response): Promise<void> {
  const viewerId = parseUserId(req);
  if (!viewerId) {
    res.status(400).json({ error: 'Query param userId es obligatorio.' });
    return;
  }

  const pageSize = parsePageSize(req);
  const excludeIds = parseExcludeIds(req);
  const nInterest = Math.floor(pageSize * SHARE_INTEREST);
  const nTrending = Math.floor(pageSize * SHARE_TRENDING);
  const nRandom = pageSize - nInterest - nTrending;

  try {
    const viewer = await prisma.user.findUnique({
      where: { id: viewerId },
      select: { id: true },
    });
    if (!viewer) {
      res.status(404).json({ error: 'Usuario no encontrado.' });
      return;
    }

    const friendIds = await getAcceptedFriendUserIds(viewerId);
    const visibilityWhere = buildPublicFeedVisibilityWhere(viewerId, friendIds);

    const interestRows = await prisma.userInterest.findMany({
      where: { userId: viewerId },
      orderBy: { score: 'desc' },
      select: { category: true },
    });
    const interestOrder = interestRows.map((r) => r.category);
    const interestSet = new Set(interestOrder);

    const [recentRows, trendingRows] = await Promise.all([
      prisma.post.findMany({
        where: visibilityWhere,
        orderBy: { createdAt: 'desc' },
        take: RECENT_POOL,
        select: postExploreSelect,
      }),
      prisma.post.findMany({
        where: visibilityWhere,
        orderBy: { reactions: { _count: 'desc' } },
        take: TRENDING_POOL,
        select: postExploreSelect,
      }),
    ]);

    const recentMapped = recentRows.map((r) => mapExplorePost(r as unknown as ExploreRow));
    const trendingMapped = trendingRows.map((r) => mapExplorePost(r as unknown as ExploreRow));

    const byId = new Map<string, ReturnType<typeof mapExplorePost>>();
    for (const p of [...recentMapped, ...trendingMapped]) {
      if (!byId.has(p.id)) byId.set(p.id, p);
    }

    const matchesInterest = (p: { category?: string }) =>
      Boolean(
        p.category && interestSet.has(p.category as import('@prisma/client').ContentCategory),
      );

    const interestRankScore = (p: { category?: string; reactionsTotal: number }): number => {
      const boost = interestBoostForTopCategories(p.category, interestOrder);
      return boost * 100_000 + p.reactionsTotal;
    };

    let interestSource = recentMapped.filter(matchesInterest);
    if (interestSet.size === 0) {
      interestSource = [...recentMapped];
    } else {
      interestSource.sort((a, b) => interestRankScore(b) - interestRankScore(a));
    }

    const exploreSource =
      interestSet.size > 0 ? recentMapped.filter((p) => !matchesInterest(p)) : [...recentMapped];

    const interestCandidates = shuffleInPlace([...interestSource]);
    const exploreCandidates = shuffleInPlace([...exploreSource]);
    const trendingOrdered = [...trendingMapped].sort((a, b) => b.reactionsTotal - a.reactionsTotal);

    const seen = new Set<string>(excludeIds);
    const out: ReturnType<typeof mapExplorePost>[] = [];

    const take = (candidates: ReturnType<typeof mapExplorePost>[], max: number) => {
      let n = 0;
      for (const p of candidates) {
        if (n >= max) break;
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        out.push(p);
        n++;
      }
    };

    take(interestCandidates, nInterest);
    take(trendingOrdered, nTrending);
    take(exploreCandidates, nRandom);

    if (out.length < pageSize) {
      const fallback = shuffleInPlace([...byId.values()]);
      for (const p of fallback) {
        if (out.length >= pageSize) break;
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        out.push(p);
      }
    }

    const trimmed = out.slice(0, pageSize);
    shuffleInPlace(trimmed);

    const hasMore = trimmed.length === pageSize;

    const explorePostIds = trimmed.map((p) => p.id);
    const [reactionCountMap, userReactionMap] = await Promise.all([
      getReactionCountsByPostIds(explorePostIds),
      getUserReactionsByPostIds(viewerId, explorePostIds),
    ]);
    const postsWithCounts = trimmed.map((p) => ({
      ...p,
      reactionsCountByType: reactionCountsDtoToByType(
        reactionCountMap.get(p.id) ?? ZERO_REACTION_COUNTS_DTO,
      ),
      userReaction: userReactionMap.get(p.id) ?? null,
    }));

    res.json({
      posts: postsWithCounts,
      hasMore,
    });
  } catch (err) {
    logError('explore.getExploreFeed', err);
    const detail = err instanceof Error ? err.message : String(err);
    res.status(500).json({
      error: 'Error al cargar el feed de exploración.',
      ...(process.env.NODE_ENV !== 'production' ? { detail } : {}),
    });
  }
}
