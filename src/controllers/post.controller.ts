import type { Request, Response } from 'express';
import {
  ContentCategory,
  ContentFilterLevel,
  FriendStatus,
  PostType,
  Prisma,
  Visibility,
} from '@prisma/client';
import { toApiBadge } from '../lib/achievementApi';
import { parseOptionalContentCategory } from '../lib/contentCategory';
import { feedLabelForPostType, interleaveFeedByPostType } from '../lib/feedVariety';
import { assertAllowPosting } from '../lib/parentalRestrictions';
import {
  getReactionCountsByPostIds,
  getUserReactionsByPostIds,
  reactionCountsDtoToByType,
  ZERO_REACTION_COUNTS_DTO,
} from '../lib/reactionCounts';
import {
  moderatePlainTextForLevel,
  textModerationErrorMessage,
} from '../lib/contentModerationText';
import { buildPublicFeedVisibilityWhere } from '../lib/postFeedVisibility';
import { recordAndNotifyParentForModerationFlaggedPost } from '../lib/parentSuspiciousNotify';
import { logError } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { userIdOnlySelect } from '../lib/prismaPublicSelects';

const POST_TYPE_VALUES = Object.values(PostType) as string[];
const VISIBILITY_VALUES = Object.values(Visibility) as string[];

/** Horas tras las cuales el “plus” por recencia cae a la mitad (suaviza el feed). */
const FEED_RECENCY_HALF_LIFE_HOURS = 36;
/** Contribución máxima de recencia al score (post recién creado ≈ este valor). */
const FEED_RECENCY_WEIGHT = 10;

const INTEREST_BOOST_FIRST = 15;
const INTEREST_BOOST_SECOND = 10;
const INTEREST_BOOST_THIRD = 5;

/** recencyScore = FEED_RECENCY_WEIGHT * exp(-hoursAgo / halfLife). Score final = reactions + interestBoost + recencyScore. */
function computeFeedRanking(
  reactionsTotal: number,
  interestBoost: number,
  createdAt: Date,
  now: Date,
): { score: number; recencyScore: number } {
  const msPerHour = 3_600_000;
  const hoursAgo = Math.max(0, (now.getTime() - createdAt.getTime()) / msPerHour);
  const recencyFactor = Math.exp(-hoursAgo / FEED_RECENCY_HALF_LIFE_HOURS);
  const recencyScore = FEED_RECENCY_WEIGHT * recencyFactor;
  const score = reactionsTotal + interestBoost + recencyScore;
  return { score, recencyScore };
}

/** Alinea categoría del post con el top 3 de intereses del viewer (orden score DESC). */
function interestBoostForCategory(
  postCategory: string | null | undefined,
  topCategories: readonly string[],
): number {
  if (!postCategory?.trim()) return 0;
  const c = postCategory.trim();
  const t1 = topCategories[0]?.trim();
  const t2 = topCategories[1]?.trim();
  const t3 = topCategories[2]?.trim();
  if (t1 && c === t1) return INTEREST_BOOST_FIRST;
  if (t2 && c === t2) return INTEREST_BOOST_SECOND;
  if (t3 && c === t3) return INTEREST_BOOST_THIRD;
  return 0;
}

function isPostType(value: string): value is PostType {
  return POST_TYPE_VALUES.includes(value);
}

function isVisibility(value: string): value is Visibility {
  return VISIBILITY_VALUES.includes(value);
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

/** IDs de usuarios con amistad ACCEPTED respecto al viewer (sin incluir al viewer). */
export async function getAcceptedFriendUserIds(viewerId: string): Promise<string[]> {
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

function parseFeedUserId(req: Request): string {
  const raw = req.query.userId;
  if (typeof raw === 'string') return raw.trim();
  if (Array.isArray(raw) && raw[0] != null) return String(raw[0]).trim();
  return '';
}

type CreatePostPayload = {
  userId: string;
  content: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  /** Subida previa vía POST /api/media/upload (moderación persistida en servidor). */
  mediaUploadId: string | null;
  category: ContentCategory | null;
  type: PostType;
  visibility: Visibility;
};

function validateCreatePost(
  body: unknown,
): { ok: true; data: CreatePostPayload } | { ok: false; error: string } {
  if (body === null || typeof body !== 'object') {
    return { ok: false, error: 'El cuerpo debe ser un objeto JSON.' };
  }

  const b = body as Record<string, unknown>;

  if (b.userId === undefined || b.userId === null || String(b.userId).trim() === '') {
    return { ok: false, error: 'userId es obligatorio.' };
  }

  if (
    b.type === undefined ||
    b.type === null ||
    typeof b.type !== 'string' ||
    !isPostType(b.type)
  ) {
    return {
      ok: false,
      error: `type es obligatorio y debe ser uno de: ${POST_TYPE_VALUES.join(', ')}.`,
    };
  }

  if (
    b.visibility === undefined ||
    b.visibility === null ||
    typeof b.visibility !== 'string' ||
    !isVisibility(b.visibility)
  ) {
    return {
      ok: false,
      error: `visibility es obligatorio y debe ser uno de: ${VISIBILITY_VALUES.join(', ')}.`,
    };
  }

  let content: string | null = null;
  if (b.content !== undefined && b.content !== null) {
    if (typeof b.content !== 'string') {
      return { ok: false, error: 'content debe ser texto.' };
    }
    const t = b.content.trim();
    content = t.length > 0 ? t : null;
  }

  let imageUrl: string | null = null;
  if (b.imageUrl !== undefined && b.imageUrl !== null) {
    if (typeof b.imageUrl !== 'string') {
      return { ok: false, error: 'imageUrl debe ser texto.' };
    }
    const u = b.imageUrl.trim();
    imageUrl = u.length > 0 ? u : null;
  }

  let videoUrl: string | null = null;
  if (b.videoUrl !== undefined && b.videoUrl !== null) {
    if (typeof b.videoUrl !== 'string') {
      return { ok: false, error: 'videoUrl debe ser texto.' };
    }
    const u = b.videoUrl.trim();
    videoUrl = u.length > 0 ? u : null;
  }

  let mediaUploadId: string | null = null;
  if (b.mediaUploadId !== undefined && b.mediaUploadId !== null) {
    if (typeof b.mediaUploadId !== 'string') {
      return { ok: false, error: 'mediaUploadId debe ser texto.' };
    }
    const id = b.mediaUploadId.trim();
    mediaUploadId = id.length > 0 ? id : null;
  }

  if (mediaUploadId && (imageUrl || videoUrl)) {
    return {
      ok: false,
      error: 'No uses imageUrl ni videoUrl junto con mediaUploadId (la subida ya define el medio).',
    };
  }

  if (imageUrl && videoUrl) {
    return { ok: false, error: 'Elegí solo imagen o solo video, no ambos.' };
  }

  let category: ContentCategory | null = null;
  if (b.category !== undefined && b.category !== null) {
    const parsed = parseOptionalContentCategory(b.category);
    if (!parsed.ok) {
      return { ok: false, error: parsed.error };
    }
    category = parsed.category;
  }

  const postType = b.type as PostType;
  if (postType !== PostType.POST && category !== null) {
    return {
      ok: false,
      error:
        'category solo aplica a posts de tipo POST; para GAME_RESULT y ACHIEVEMENT usá los endpoints automáticos.',
    };
  }

  return {
    ok: true,
    data: {
      userId: String(b.userId).trim(),
      content,
      imageUrl,
      videoUrl,
      mediaUploadId,
      category,
      type: postType,
      visibility: b.visibility,
    },
  };
}

export async function createPost(req: Request, res: Response): Promise<void> {
  const validation = validateCreatePost(req.body);
  if (!validation.ok) {
    res.status(400).json({ error: validation.error });
    return;
  }

  const { userId, content, imageUrl, videoUrl, mediaUploadId, category, type, visibility } =
    validation.data;

  const autoOnly: PostType[] = [
    PostType.GAME_RESULT,
    PostType.ACHIEVEMENT,
    PostType.CHALLENGE,
    PostType.DAILY_STREAK,
    PostType.CONTENT_COMPLETED,
    PostType.LEVEL_UP,
    PostType.FRIEND_MILESTONE,
    PostType.GROUP_REWARD,
  ];
  if (autoOnly.includes(type)) {
    res.status(400).json({
      error: 'Este tipo de post se genera automáticamente por el sistema.',
    });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: userIdOnlySelect });
    if (!user) {
      res.status(400).json({ error: 'userId no corresponde a un usuario existente.' });
      return;
    }

    if (type === PostType.POST) {
      const parental = await assertAllowPosting(userId);
      if (!parental.ok) {
        res.status(403).json({ error: parental.message });
        return;
      }
    }

    let finalContent = content;
    if (type === PostType.POST && content != null && content.length > 0) {
      const settings = await prisma.parentSettings.findUnique({
        where: { childId: userId },
        select: { contentFilterLevel: true },
      });
      const level = settings?.contentFilterLevel ?? ContentFilterLevel.MEDIUM;
      const mod = moderatePlainTextForLevel(content, level);
      if (!mod.allowed) {
        if (mod.blockReason === 'EMPTY') {
          res.status(400).json({ error: textModerationErrorMessage(mod.blockReason) });
          return;
        }
        res.status(403).json({ error: textModerationErrorMessage(mod.blockReason) });
        return;
      }
      finalContent = mod.deliveredText.length > 0 ? mod.deliveredText : null;
    }

    let finalImageUrl = imageUrl;
    let finalVideoUrl = videoUrl;
    let mediaModerationFlagged = false;
    let mediaModerationNote: string | null = null;
    let linkUploadId: string | null = null;

    if (mediaUploadId) {
      const uploadRow = await prisma.userMediaUpload.findFirst({
        where: { id: mediaUploadId, userId, consumedAt: null },
      });
      if (!uploadRow) {
        res.status(400).json({ error: 'Subida no encontrada, ya usada o no te pertenece.' });
        return;
      }
      linkUploadId = uploadRow.id;
      if (uploadRow.resourceType === 'video') {
        finalVideoUrl = uploadRow.url;
        finalImageUrl = null;
      } else {
        finalImageUrl = uploadRow.url;
        finalVideoUrl = null;
      }
      mediaModerationFlagged = uploadRow.moderationFlagged;
      mediaModerationNote = uploadRow.moderationNote;
    }

    const post = await prisma.$transaction(async (tx) => {
      const created = await tx.post.create({
        data: {
          userId,
          content: finalContent,
          imageUrl: finalImageUrl,
          videoUrl: finalVideoUrl,
          mediaModerationFlagged,
          mediaModerationNote,
          mediaUploadId: linkUploadId,
          category,
          type,
          visibility,
        },
      });
      if (linkUploadId) {
        await tx.userMediaUpload.update({
          where: { id: linkUploadId },
          data: { consumedAt: new Date() },
        });
      }
      return created;
    });

    if (post.mediaModerationFlagged) {
      void recordAndNotifyParentForModerationFlaggedPost(userId, post.id);
    }

    res.status(201).json(post);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
      res.status(400).json({ error: 'Referencia inválida (usuario u otro recurso).' });
      return;
    }
    logError('post', err);
    res.status(500).json({ error: 'Error al crear el post.' });
  }
}

/**
 * Actualizar publicación propia (tipo `POST`). Requiere middleware `requirePostOwner` + `requireManualPostOwner`.
 */
export async function patchPost(req: Request, res: Response): Promise<void> {
  const owned = req.ownedPost;
  if (!owned || owned.type !== PostType.POST) {
    res.status(500).json({ error: 'Estado interno inválido.' });
    return;
  }
  const postId = owned.id;
  const userId = owned.userId;

  const parental = await assertAllowPosting(userId);
  if (!parental.ok) {
    res.status(403).json({ error: parental.message });
    return;
  }

  if (req.body === null || typeof req.body !== 'object') {
    res.status(400).json({ error: 'El cuerpo debe ser un objeto JSON.' });
    return;
  }

  const b = req.body as Record<string, unknown>;
  const data: Prisma.PostUpdateInput = {};

  if (b.content !== undefined) {
    if (b.content !== null && typeof b.content !== 'string') {
      res.status(400).json({ error: 'content debe ser texto o null.' });
      return;
    }
    const raw = b.content === null ? '' : b.content.trim();
    if (raw.length === 0) {
      data.content = null;
    } else {
      const settings = await prisma.parentSettings.findUnique({
        where: { childId: userId },
        select: { contentFilterLevel: true },
      });
      const level = settings?.contentFilterLevel ?? ContentFilterLevel.MEDIUM;
      const mod = moderatePlainTextForLevel(raw, level);
      if (!mod.allowed) {
        if (mod.blockReason === 'EMPTY') {
          res.status(400).json({ error: textModerationErrorMessage(mod.blockReason) });
          return;
        }
        res.status(403).json({ error: textModerationErrorMessage(mod.blockReason) });
        return;
      }
      data.content = mod.deliveredText.length > 0 ? mod.deliveredText : null;
    }
  }

  if (b.visibility !== undefined) {
    if (typeof b.visibility !== 'string' || !isVisibility(b.visibility)) {
      res.status(400).json({
        error: `visibility debe ser uno de: ${VISIBILITY_VALUES.join(', ')}.`,
      });
      return;
    }
    data.visibility = b.visibility;
  }

  if (b.category !== undefined) {
    if (b.category === null) {
      data.category = null;
    } else {
      const parsed = parseOptionalContentCategory(b.category);
      if (!parsed.ok) {
        res.status(400).json({ error: parsed.error });
        return;
      }
      data.category = parsed.category;
    }
  }

  if (Object.keys(data).length === 0) {
    res.status(400).json({ error: 'Enviá al menos un campo: content, visibility o category.' });
    return;
  }

  try {
    const updated = await prisma.post.update({
      where: { id: postId },
      data,
      select: {
        id: true,
        userId: true,
        content: true,
        imageUrl: true,
        videoUrl: true,
        category: true,
        type: true,
        visibility: true,
        createdAt: true,
      },
    });
    res.json(updated);
  } catch (err) {
    logError('post', err);
    res.status(500).json({ error: 'Error al actualizar la publicación.' });
  }
}

/**
 * Eliminar publicación propia (tipo `POST`). Requiere middleware `requirePostOwner` + `requireManualPostOwner`.
 */
export async function deletePost(req: Request, res: Response): Promise<void> {
  const owned = req.ownedPost;
  if (!owned || owned.type !== PostType.POST) {
    res.status(500).json({ error: 'Estado interno inválido.' });
    return;
  }
  const postId = owned.id;

  try {
    await prisma.$transaction([
      prisma.reaction.deleteMany({ where: { postId } }),
      prisma.post.delete({ where: { id: postId } }),
    ]);
    res.status(204).end();
  } catch (err) {
    logError('post', err);
    res.status(500).json({ error: 'Error al eliminar la publicación.' });
  }
}

/**
 * Feed personalizado: ?userId=…
 * Incluye posts PUBLIC (cualquier autor) y posts FRIENDS del propio usuario o de amigos aceptados.
 */
export async function listPosts(req: Request, res: Response): Promise<void> {
  const viewerId = parseFeedUserId(req);
  if (!viewerId) {
    res.status(400).json({ error: 'Query param userId es obligatorio.' });
    return;
  }

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

    let topCategories: string[] = [];
    try {
      const topInterests = await prisma.userInterest.findMany({
        where: { userId: viewerId },
        orderBy: { score: 'desc' },
        take: 3,
        select: { category: true },
      });
      topCategories = topInterests.map((i) => i.category);
    } catch (interestErr) {
      logError('post.listPosts.interests', interestErr);
    }

    const rows = await prisma.post.findMany({
      where: visibilityWhere,
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
      },
    });

    const now = new Date();

    const postIds = rows.map((r) => r.id);
    const [reactionCountMap, userReactionMap] = await Promise.all([
      getReactionCountsByPostIds(postIds),
      getUserReactionsByPostIds(viewerId, postIds),
    ]);

    const posts = rows.map((p) => {
      const reactionsTotal = p._count.reactions;
      const postCategory =
        p.category != null && String(p.category).trim() !== ''
          ? String(p.category).trim()
          : p.type === PostType.ACHIEVEMENT
            ? (p.userAchievement?.achievement?.category ?? null)
            : p.type === PostType.GAME_RESULT
              ? (p.gameResult?.game?.category ?? null)
              : null;
      const interestBoost = interestBoostForCategory(postCategory, topCategories);
      const { score, recencyScore } = computeFeedRanking(
        reactionsTotal,
        interestBoost,
        p.createdAt,
        now,
      );
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
        visibility: p.visibility,
        createdAt: p.createdAt.toISOString(),
        createdAtFormatted: formatCreatedAtLocal(p.createdAt),
        reactionsTotal,
        reactionsCountByType: reactionCountsDtoToByType(
          reactionCountMap.get(p.id) ?? ZERO_REACTION_COUNTS_DTO,
        ),
        userReaction: userReactionMap.get(p.id) ?? null,
        category: postCategory ?? undefined,
        interestBoost,
        recencyScore: Math.round(recencyScore * 1_000) / 1_000,
        score: Math.round(score * 1_000) / 1_000,
        feedLabel: feedLabelForPostType(p.type),
        user: {
          id: p.user.id,
          username: p.user.username,
          avatarUrl: p.user.avatarUrl,
        },
        ...(badge ? { badge } : {}),
      };
    });

    const mixed = interleaveFeedByPostType(posts);
    res.json(mixed);
  } catch (err) {
    logError('post.listPosts', err);
    const detail = err instanceof Error ? err.message : String(err);
    res.status(500).json({
      error: 'Error al listar los posts.',
      hint: 'Si recién actualizaste el proyecto, sincronizá la base: en la carpeta del API ejecutá `npx prisma db push` y `npx prisma generate`, luego reiniciá `npm run dev`.',
      ...(process.env.NODE_ENV !== 'production' ? { detail } : {}),
    });
  }
}
