import type { Request, Response } from "express";
import { AchievementRarity, ContentCategory, FriendStatus, PostType, Visibility } from "@prisma/client";
import { CONTENT_CATEGORY_VALUES, educationalCategoryToContentCategory } from "../lib/contentCategory";
import { feedLabelForPostType } from "../lib/feedVariety";
import { pickExplorationCategories, pickDiverseByCategory, quotaSplit } from "../lib/recommendationDiversity";
import { toApiBadge } from "../lib/achievementApi";
import { interestBoostForTopCategories } from "../lib/recommendationBoost";
import {
  getReactionCountsByPostIds,
  getUserReactionsByPostIds,
  reactionCountsDtoToByType,
  ZERO_REACTION_COUNTS_DTO,
} from "../lib/reactionCounts";
import {
  fetchRecommendedEducationalContent,
  fetchRecommendedQuizAndVisual,
  getRecommendationCategoriesContext,
  parseRecommendationLimitFromQuery,
} from "../lib/recommendationByInterests";
import { buildPublicFeedVisibilityWhere } from "../lib/postFeedVisibility";
import { logError } from "../lib/logger";
import { prisma } from "../lib/prisma";

const FEED_RECENCY_HALF_LIFE_HOURS = 36;
const FEED_RECENCY_WEIGHT = 10;

/** Intereses del usuario considerados para la parte “alineada a intereses” (ampliado). */
const TOP_INTERESTS = 8;
const MAX_GAMES = 12;
const MAX_POSTS = 15;
const MAX_MISSIONS = 12;
const MAX_EDUCATIONAL = 12;
const POST_CANDIDATE_POOL = 150;

function computeFeedRanking(
  reactionsTotal: number,
  interestBoost: number,
  createdAt: Date,
  now: Date
): { score: number; recencyScore: number } {
  const msPerHour = 3_600_000;
  const hoursAgo = Math.max(0, (now.getTime() - createdAt.getTime()) / msPerHour);
  const recencyFactor = Math.exp(-hoursAgo / FEED_RECENCY_HALF_LIFE_HOURS);
  const recencyScore = FEED_RECENCY_WEIGHT * recencyFactor;
  const score = reactionsTotal + interestBoost + recencyScore;
  return { score, recencyScore };
}

async function getAcceptedFriendUserIds(viewerId: string): Promise<string[]> {
  const rows = await prisma.friend.findMany({
    where: {
      status: FriendStatus.ACCEPTED,
      OR: [{ userId: viewerId }, { friendId: viewerId }],
    },
    select: { userId: true, friendId: true },
  });
  const ids = new Set<string>();
  for (const r of rows) {
    ids.add(r.userId === viewerId ? r.friendId : r.userId);
  }
  return Array.from(ids);
}

type PostRow = {
  id: string;
  userId: string;
  content: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  mediaModerationFlagged: boolean;
  mediaModerationNote: string | null;
  parentModerationVisibleAt: Date | null;
  parentModerationVisibleById: string | null;
  category: string | null;
  type: PostType;
  visibility: Visibility;
  createdAt: Date;
  user: { id: string; username: string; avatarUrl: string | null };
  userAchievement: {
    achievement: {
      title: string;
      category: string;
      badgeIcon: string;
      badgeColor: string;
      rarity: AchievementRarity;
    };
  } | null;
  gameResult: { game: { category: string } } | null;
  _count: { reactions: number };
};

function resolvePostCategory(p: PostRow): string | null {
  if (p.category != null && String(p.category).trim() !== "") {
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

function formatCreatedAtLocal(date: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

type ScoredPost = {
  postCategory: string | null;
  sortScore: number;
  payload: Record<string, unknown>;
};

async function buildRecommendedGames(topCategories: ContentCategory[]): Promise<
  { id: string; name: string; category: ContentCategory; difficulty: string }[]
> {
  const { interestSlots, exploreSlots } = quotaSplit(MAX_GAMES);
  const exploreCats = pickExplorationCategories(topCategories, CONTENT_CATEGORY_VALUES.length);

  if (topCategories.length === 0) {
    const pool = await prisma.game.findMany({
      where: { category: { in: exploreCats.length ? exploreCats : CONTENT_CATEGORY_VALUES } },
      orderBy: { name: "asc" },
      take: 48,
      select: { id: true, name: true, category: true, difficulty: true },
    });
    const wrapped = pool.map((g, i) => ({ g, i }));
    return pickDiverseByCategory(
      wrapped,
      MAX_GAMES,
      (x) => x.g.category,
      (x) => 1000 - x.i
    ).map((x) => x.g);
  }

  const [interestPool, explorePool] = await Promise.all([
    prisma.game.findMany({
      where: { category: { in: topCategories } },
      orderBy: { name: "asc" },
      take: 48,
      select: { id: true, name: true, category: true, difficulty: true },
    }),
    prisma.game.findMany({
      where: { category: { in: exploreCats } },
      orderBy: { name: "asc" },
      take: 48,
      select: { id: true, name: true, category: true, difficulty: true },
    }),
  ]);

  const interestWrapped = interestPool.map((g, i) => ({ g, i }));
  const exploreWrapped = explorePool.map((g, i) => ({ g, i }));

  const interestPick = pickDiverseByCategory(
    interestWrapped,
    interestSlots,
    (x) => x.g.category,
    (x) => 1000 - x.i
  ).map((x) => x.g);
  const explorePick = pickDiverseByCategory(
    exploreWrapped,
    exploreSlots,
    (x) => x.g.category,
    (x) => 1000 - x.i
  ).map((x) => x.g);

  const seen = new Set<string>();
  const merged: { id: string; name: string; category: ContentCategory; difficulty: string }[] = [];
  for (const g of [...interestPick, ...explorePick]) {
    if (!seen.has(g.id)) {
      seen.add(g.id);
      merged.push(g);
    }
  }

  if (merged.length < MAX_GAMES) {
    const rest = await prisma.game.findMany({
      where: { id: { notIn: [...seen] } },
      orderBy: { name: "asc" },
      take: MAX_GAMES - merged.length + 8,
      select: { id: true, name: true, category: true, difficulty: true },
    });
    const restFiltered = rest.filter((g) => !seen.has(g.id));
    const restW = restFiltered.map((g, i) => ({ g, i }));
    const filler = pickDiverseByCategory(
      restW,
      MAX_GAMES - merged.length,
      (x) => x.g.category,
      (x) => 1000 - x.i
    ).map((x) => x.g);
    for (const g of filler) {
      if (merged.length >= MAX_GAMES) break;
      merged.push(g);
    }
  }

  return merged.slice(0, MAX_GAMES);
}

async function buildRecommendedMissions(topCategories: ContentCategory[]): Promise<
  {
    id: string;
    title: string;
    description: string;
    category: ContentCategory | null;
    targetValue: number;
    type: string;
  }[]
> {
  const { interestSlots, exploreSlots } = quotaSplit(MAX_MISSIONS);
  const exploreCats = pickExplorationCategories(topCategories, CONTENT_CATEGORY_VALUES.length);

  if (topCategories.length === 0) {
    const pool = await prisma.mission.findMany({
      where: {
        OR: [{ category: { in: exploreCats } }, { category: null }],
      },
      orderBy: { title: "asc" },
      take: 48,
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        targetValue: true,
        type: true,
      },
    });
    const wrapped = pool.map((m, i) => ({ m, i }));
    return pickDiverseByCategory(
      wrapped,
      MAX_MISSIONS,
      (x) => x.m.category ?? "__general__",
      (x) => 1000 - x.i
    ).map((x) => ({ ...x.m, type: String(x.m.type) }));
  }

  const [interestPool, explorePool] = await Promise.all([
    prisma.mission.findMany({
      where: {
        OR: [{ category: { in: topCategories } }, { category: null }],
      },
      orderBy: { title: "asc" },
      take: 48,
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        targetValue: true,
        type: true,
      },
    }),
    prisma.mission.findMany({
      where: { category: { in: exploreCats } },
      orderBy: { title: "asc" },
      take: 48,
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        targetValue: true,
        type: true,
      },
    }),
  ]);

  const interestMW = interestPool.map((m, i) => ({ m, i }));
  const exploreMW = explorePool.map((m, i) => ({ m, i }));

  const interestPick = pickDiverseByCategory(
    interestMW,
    interestSlots,
    (x) => x.m.category ?? "__general__",
    (x) => 1000 - x.i
  ).map((x) => x.m);
  const explorePick = pickDiverseByCategory(
    exploreMW,
    exploreSlots,
    (x) => x.m.category ?? "__general__",
    (x) => 1000 - x.i
  ).map((x) => x.m);

  const seen = new Set<string>();
  const merged: {
    id: string;
    title: string;
    description: string;
    category: ContentCategory | null;
    targetValue: number;
    type: string;
  }[] = [];
  for (const m of [...interestPick, ...explorePick]) {
    if (!seen.has(m.id)) {
      seen.add(m.id);
      merged.push({ ...m, type: String(m.type) });
    }
  }

  if (merged.length < MAX_MISSIONS) {
    const rest = await prisma.mission.findMany({
      where: { id: { notIn: [...seen] } },
      orderBy: { title: "asc" },
      take: MAX_MISSIONS - merged.length + 8,
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        targetValue: true,
        type: true,
      },
    });
    const restF = rest.filter((m) => !seen.has(m.id));
    const restW = restF.map((m, i) => ({ m, i }));
    const filler = pickDiverseByCategory(
      restW,
      MAX_MISSIONS - merged.length,
      (x) => x.m.category ?? "__general__",
      (x) => 1000 - x.i
    ).map((x) => x.m);
    for (const m of filler) {
      if (merged.length >= MAX_MISSIONS) break;
      merged.push({ ...m, type: String(m.type) });
    }
  }

  return merged.slice(0, MAX_MISSIONS);
}

async function buildRecommendedEducationalContent(topCategories: ContentCategory[]): Promise<
  {
    id: string;
    title: string;
    description: string;
    category: string;
    difficulty: import("@prisma/client").Difficulty;
    imageUrl: string | null;
    createdAt: string;
  }[]
> {
  const pool = await prisma.educationalContent.findMany({
    orderBy: { createdAt: "desc" },
    take: 48,
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

  type W = {
    row: (typeof pool)[0];
    sortKey: number;
    catKey: string;
  };

  const wrapped: W[] = pool.map((row, index) => {
    const cc = educationalCategoryToContentCategory(row.category);
    const boost = cc ? interestBoostForTopCategories(cc, topCategories) : 0;
    const sk = boost * 20_000 + (pool.length - index);
    return { row, sortKey: sk, catKey: cc ?? "__other__" };
  });

  if (topCategories.length === 0) {
    const picked = pickDiverseByCategory(
      wrapped,
      MAX_EDUCATIONAL,
      (x) => x.catKey,
      (x) => x.sortKey
    );
    return picked.map((x) => ({
      id: x.row.id,
      title: x.row.title,
      description: x.row.description,
      category: x.row.category,
      difficulty: x.row.difficulty,
      imageUrl: x.row.imageUrl,
      createdAt: x.row.createdAt.toISOString(),
    }));
  }

  const { interestSlots, exploreSlots } = quotaSplit(MAX_EDUCATIONAL);

  const interestW = wrapped.filter((w) => {
    const cc = educationalCategoryToContentCategory(w.row.category);
    return Boolean(cc && topCategories.includes(cc));
  });
  const exploreW = wrapped.filter((w) => {
    const cc = educationalCategoryToContentCategory(w.row.category);
    return !cc || !topCategories.includes(cc);
  });

  const interestPick = pickDiverseByCategory(
    interestW,
    interestSlots,
    (x) => x.catKey,
    (x) => x.sortKey
  );
  const explorePick = pickDiverseByCategory(
    exploreW,
    exploreSlots,
    (x) => x.catKey,
    (x) => x.sortKey
  );

  const seen = new Set<string>();
  const merged: W[] = [];
  for (const x of [...interestPick, ...explorePick]) {
    if (!seen.has(x.row.id)) {
      seen.add(x.row.id);
      merged.push(x);
    }
  }

  if (merged.length < MAX_EDUCATIONAL) {
    const rest = wrapped.filter((w) => !seen.has(w.row.id)).sort((a, b) => b.sortKey - a.sortKey);
    const filler = pickDiverseByCategory(
      rest,
      MAX_EDUCATIONAL - merged.length,
      (x) => x.catKey,
      (x) => x.sortKey
    );
    for (const x of filler) {
      if (merged.length >= MAX_EDUCATIONAL) break;
      if (!seen.has(x.row.id)) {
        seen.add(x.row.id);
        merged.push(x);
      }
    }
  }

  return merged.slice(0, MAX_EDUCATIONAL).map((x) => ({
    id: x.row.id,
    title: x.row.title,
    description: x.row.description,
    category: x.row.category,
    difficulty: x.row.difficulty,
    imageUrl: x.row.imageUrl,
    createdAt: x.row.createdAt.toISOString(),
  }));
}

export async function getUserRecommendations(req: Request, res: Response): Promise<void> {
  const userId = req.params.id?.trim();
  if (!userId) {
    res.status(400).json({ error: "id de usuario es obligatorio." });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) {
      res.status(404).json({ error: "Usuario no encontrado." });
      return;
    }

    const interestRows = await prisma.userInterest.findMany({
      where: { userId },
      orderBy: { score: "desc" },
      take: TOP_INTERESTS,
      select: { category: true, score: true },
    });
    const topCategories: ContentCategory[] = interestRows.map((r) => r.category);
    const topCategoriesSet = new Set<string>(topCategories);

    const [recommendedGames, recommendedMissions, recommendedEducationalContent] = await Promise.all([
      buildRecommendedGames(topCategories),
      buildRecommendedMissions(topCategories),
      buildRecommendedEducationalContent(topCategories),
    ]);

    const friendIds = await getAcceptedFriendUserIds(userId);
    const feedWhere = buildPublicFeedVisibilityWhere(userId, friendIds);

    const postRows = (await prisma.post.findMany({
      where: feedWhere,
      orderBy: { createdAt: "desc" },
      take: POST_CANDIDATE_POOL,
      select: {
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
          select: { id: true, username: true, avatarUrl: true },
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
            game: { select: { category: true } },
          },
        },
        _count: { select: { reactions: true } },
      },
    })) as PostRow[];

    const now = new Date();

    const scored: ScoredPost[] = postRows.map((p) => {
      const postCategory = resolvePostCategory(p);
      const boost = interestBoostForTopCategories(postCategory, topCategories);
      const reactionsTotal = p._count.reactions;
      const { score, recencyScore } = computeFeedRanking(reactionsTotal, boost, p.createdAt, now);
      const ach = p.userAchievement?.achievement;
      const badge = p.type === PostType.ACHIEVEMENT && ach ? toApiBadge(ach) : undefined;

      return {
        postCategory,
        sortScore: score,
        payload: {
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
          interestBoost: boost,
          recencyScore: Math.round(recencyScore * 1_000) / 1_000,
          score: Math.round(score * 1_000) / 1_000,
          user: {
            id: p.user.id,
            username: p.user.username,
            avatarUrl: p.user.avatarUrl,
          },
          ...(badge ? { badge } : {}),
        },
      };
    });

    const { interestSlots, exploreSlots } = quotaSplit(MAX_POSTS);

    const matchesInterest = (s: ScoredPost): boolean => {
      const c = s.postCategory?.trim();
      return Boolean(c && topCategoriesSet.has(c));
    };

    const interestScored = scored.filter(matchesInterest);
    const exploreScored = scored.filter((s) => !matchesInterest(s));

    let interestPicked = pickDiverseByCategory(
      interestScored,
      interestSlots,
      (s) => s.postCategory ?? "__none__",
      (s) => s.sortScore
    );
    let explorePicked = pickDiverseByCategory(
      exploreScored,
      exploreSlots,
      (s) => s.postCategory ?? "__none__",
      (s) => s.sortScore
    );

    if (interestPicked.length < interestSlots && exploreScored.length > explorePicked.length) {
      const seen = new Set(interestPicked.map((s) => (s.payload as { id: string }).id));
      const extraFromExplore = exploreScored
        .filter((s) => !seen.has((s.payload as { id: string }).id))
        .sort((a, b) => b.sortScore - a.sortScore);
      const need = interestSlots - interestPicked.length;
      const more = pickDiverseByCategory(
        extraFromExplore,
        need,
        (s) => s.postCategory ?? "__none__",
        (s) => s.sortScore
      );
      interestPicked = [...interestPicked, ...more];
    }

    if (explorePicked.length < exploreSlots && interestScored.length > interestPicked.length) {
      const seen = new Set(explorePicked.map((s) => (s.payload as { id: string }).id));
      const extraFromInterest = interestScored
        .filter((s) => !seen.has((s.payload as { id: string }).id))
        .sort((a, b) => b.sortScore - a.sortScore);
      const need = exploreSlots - explorePicked.length;
      const more = pickDiverseByCategory(
        extraFromInterest,
        need,
        (s) => s.postCategory ?? "__none__",
        (s) => s.sortScore
      );
      explorePicked = [...explorePicked, ...more];
    }

    const seenIds = new Set<string>();
    const merged: ScoredPost[] = [];
    for (const s of [...interestPicked, ...explorePicked]) {
      const id = (s.payload as { id: string }).id;
      if (!seenIds.has(id)) {
        seenIds.add(id);
        merged.push(s);
      }
    }

    if (merged.length < MAX_POSTS) {
      const rest = scored
        .filter((s) => !seenIds.has((s.payload as { id: string }).id))
        .sort((a, b) => b.sortScore - a.sortScore);
      const filler = pickDiverseByCategory(
        rest,
        MAX_POSTS - merged.length,
        (s) => s.postCategory ?? "__none__",
        (s) => s.sortScore
      );
      for (const s of filler) {
        if (merged.length >= MAX_POSTS) break;
        merged.push(s);
      }
    }

    const recommendedPostsRaw = merged.slice(0, MAX_POSTS).map((s) => s.payload) as {
      id: string;
      reactionsTotal: number;
      [key: string]: unknown;
    }[];
    const recPostIds = recommendedPostsRaw.map((p) => p.id);
    const [reactionCountMap, userReactionMap] = await Promise.all([
      getReactionCountsByPostIds(recPostIds),
      getUserReactionsByPostIds(userId, recPostIds),
    ]);
    const recommendedPosts = recommendedPostsRaw.map((p) => ({
      ...p,
      reactionsCountByType: reactionCountsDtoToByType(reactionCountMap.get(p.id) ?? ZERO_REACTION_COUNTS_DTO),
      userReaction: userReactionMap.get(p.id) ?? null,
    }));

    res.json({
      recommendedGames,
      recommendedPosts,
      recommendedMissions,
      recommendedEducationalContent,
      topInterestCategories: topCategories,
      acceptedFriendCount: friendIds.length,
    });
  } catch (err) {
    logError("recommendations", err);
    res.status(500).json({ error: "Error al obtener recomendaciones." });
  }
}

/**
 * GET /recommendations?userId=…&limit=8
 * - Con intereses: ~70% top / ~30% descubrimiento; sin intereses: contenido “popular” (reciente) con categorías mixtas.
 * - `content`: `EducationalContent`; `games`: quiz + visual con la misma lógica.
 */
export async function getRecommendationsQuery(req: Request, res: Response): Promise<void> {
  const raw = req.query.userId;
  const userId = typeof raw === "string" ? raw.trim() : Array.isArray(raw) && raw[0] != null ? String(raw[0]).trim() : "";
  if (!userId) {
    res.status(400).json({ error: "Query param userId es obligatorio." });
    return;
  }

  const limit = parseRecommendationLimitFromQuery(req.query.limit);

  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) {
      res.status(404).json({ error: "Usuario no encontrado." });
      return;
    }

    const { topCategories, hasInterestProfile } = await getRecommendationCategoriesContext(userId);

    const [content, games] = await Promise.all([
      fetchRecommendedEducationalContent(userId, topCategories, limit, hasInterestProfile),
      fetchRecommendedQuizAndVisual(userId, topCategories, limit, hasInterestProfile),
    ]);

    res.json({ content, games });
  } catch (err) {
    logError("recommendations.getRecommendationsQuery", err);
    res.status(500).json({ error: "Error al obtener recomendaciones." });
  }
}
