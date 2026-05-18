import type { Request, Response } from 'express';
import { PostType, ReactionType, Visibility } from '@prisma/client';
import { z } from 'zod';
import { getAcceptedFriendUserIds } from './post.controller';
import { buildPublicFeedVisibilityWhere } from '../lib/postFeedVisibility';
import { feedLabelForPostType } from '../lib/feedVariety';
import {
  getReactionCountsByPostIds,
  getUserReactionsByPostIds,
  reactionCountsDtoToByType,
  ZERO_REACTION_COUNTS_DTO,
} from '../lib/reactionCounts';
import { logError } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { formatZodError } from '../lib/validation/schemas';
import { createPost, deletePost } from './post.controller';

function requireChild(req: Request, res: Response): string | null {
  const auth = req.auth;
  if (!auth || auth.kind !== 'child') {
    res.status(403).json({ error: 'Solo menores autenticados.' });
    return null;
  }
  return auth.userId;
}

const createPostSchema = z.object({
  content: z.string().min(1).max(500),
  visibility: z.enum(['PUBLIC', 'FRIENDS', 'PRIVATE']).default('FRIENDS'),
});

const commentSchema = z.object({
  content: z.string().min(1).max(300),
});

/** GET /api/feed */
export async function getFeed(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(30, Math.max(5, Number(req.query.limit) || 15));
  const skip = (page - 1) * limit;

  try {
    const friendIds = await getAcceptedFriendUserIds(userId);
    const where = buildPublicFeedVisibilityWhere(userId, friendIds);

    const [rows, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, username: true, avatarUrl: true } },
          _count: { select: { reactions: true, comments: true } },
        },
      }),
      prisma.post.count({ where }),
    ]);

    const postIds = rows.map((p) => p.id);
    const [reactionCountMap, userReactionMap] = await Promise.all([
      getReactionCountsByPostIds(postIds),
      getUserReactionsByPostIds(userId, postIds),
    ]);

    const posts = rows.map((p) => ({
      id: p.id,
      type: p.type,
      content: p.content,
      imageUrl: p.imageUrl,
      videoUrl: p.videoUrl,
      visibility: p.visibility,
      isPinned: p.isPinned,
      createdAt: p.createdAt.toISOString(),
      feedLabel: feedLabelForPostType(p.type),
      user: p.user,
      likes: p._count.reactions,
      comments: p._count.comments,
      reactionsCountByType: reactionCountsDtoToByType(
        reactionCountMap.get(p.id) ?? ZERO_REACTION_COUNTS_DTO,
      ),
      userReaction: userReactionMap.get(p.id) ?? null,
    }));

    res.json({ posts, page, limit, total });
  } catch (e) {
    logError('feed.list', e);
    res.status(500).json({ error: 'Error al cargar el feed.' });
  }
}

/** POST /api/feed/posts */
export async function postFeedPost(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;
  const parsed = createPostSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }
  req.body = {
    userId,
    content: parsed.data.content,
    type: PostType.POST,
    visibility: parsed.data.visibility as Visibility,
  };
  return createPost(req, res);
}

/** POST /api/feed/posts/:id/like — toggle LIKE */
export async function toggleFeedPostLike(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;
  const postId = req.params.id?.trim();
  if (!postId) {
    res.status(400).json({ error: 'id inválido.' });
    return;
  }

  try {
    const existing = await prisma.reaction.findUnique({
      where: { userId_postId: { userId, postId } },
    });
    if (existing?.type === ReactionType.LIKE) {
      await prisma.reaction.delete({ where: { id: existing.id } });
      res.json({ liked: false });
      return;
    }
    if (existing) {
      await prisma.reaction.update({
        where: { id: existing.id },
        data: { type: ReactionType.LIKE },
      });
    } else {
      await prisma.reaction.create({
        data: { userId, postId, type: ReactionType.LIKE },
      });
    }
    res.json({ liked: true });
  } catch (e) {
    logError('feed.like', e);
    res.status(500).json({ error: 'Error al reaccionar.' });
  }
}

/** POST /api/feed/posts/:id/comment */
export async function postFeedComment(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;
  const postId = req.params.id?.trim();
  if (!postId) {
    res.status(400).json({ error: 'id inválido.' });
    return;
  }
  const parsed = commentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }

  try {
    const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
    if (!post) {
      res.status(404).json({ error: 'Post no encontrado.' });
      return;
    }
    const comment = await prisma.postComment.create({
      data: { postId, userId, content: parsed.data.content.trim() },
      include: { user: { select: { id: true, username: true, avatarUrl: true } } },
    });
    res.status(201).json({ comment });
  } catch (e) {
    logError('feed.comment', e);
    res.status(500).json({ error: 'Error al comentar.' });
  }
}

/** GET /api/feed/posts/:id — detalle con comentarios */
export async function getFeedPostDetail(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;
  const postId = req.params.id?.trim();
  if (!postId) {
    res.status(400).json({ error: 'id inválido.' });
    return;
  }

  try {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        user: { select: { id: true, username: true, avatarUrl: true } },
        comments: {
          orderBy: { createdAt: 'asc' },
          take: 50,
          include: { user: { select: { id: true, username: true, avatarUrl: true } } },
        },
        _count: { select: { reactions: true } },
      },
    });
    if (!post) {
      res.status(404).json({ error: 'Post no encontrado.' });
      return;
    }
    res.json({
      post: {
        id: post.id,
        type: post.type,
        content: post.content,
        imageUrl: post.imageUrl,
        videoUrl: post.videoUrl,
        createdAt: post.createdAt.toISOString(),
        feedLabel: feedLabelForPostType(post.type),
        user: post.user,
        likes: post._count.reactions,
      },
      comments: post.comments,
    });
  } catch (e) {
    logError('feed.detail', e);
    res.status(500).json({ error: 'Error al obtener el post.' });
  }
}

/** DELETE /api/feed/posts/:id */
export async function removeFeedPost(req: Request, res: Response): Promise<void> {
  return deletePost(req, res);
}

/** GET /api/feed/notifications */
export async function getFeedNotifications(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;

  try {
    const notifications = await prisma.appNotification.findMany({
      where: {
        userId,
        type: { in: ['SOCIAL', 'ACHIEVEMENT', 'FRIEND_ACCEPTED'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    res.json({
      notifications: notifications.map((n) => ({
        id: n.id,
        type: n.type,
        message: n.body,
        title: n.title,
        read: n.readAt != null,
        createdAt: n.createdAt.toISOString(),
      })),
    });
  } catch (e) {
    logError('feed.notifications', e);
    res.status(500).json({ error: 'Error al cargar notificaciones.' });
  }
}
