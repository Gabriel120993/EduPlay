import type { LibraryCategory, LibraryMediaType, Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { addExperience } from '../lib/xpLevel';
import { recordXpGain } from '../lib/xpLedger';
import { generateAutoPost } from './socialFeed.service';
import { getRecommendedLibraryContent } from './libraryRecommendation.service';

const LIBRARY_XP_COMPLETE = 15;

export type LibraryListFilters = {
  type?: LibraryMediaType;
  category?: LibraryCategory;
  ageMin?: number;
  ageMax?: number;
  search?: string;
  channelId?: string;
  isPremium?: boolean;
  page?: number;
  limit?: number;
  userId?: string;
};

function contentSelect() {
  return {
    id: true,
    slug: true,
    title: true,
    description: true,
    type: true,
    category: true,
    ageRangeMin: true,
    ageRangeMax: true,
    durationSec: true,
    thumbnailUrl: true,
    mediaUrl: true,
    transcript: true,
    isPremium: true,
    isActive: true,
    viewCount: true,
    likeCount: true,
    author: true,
    channelId: true,
    tags: true,
    channel: { select: { id: true, slug: true, name: true, color: true, iconUrl: true } },
  } satisfies Prisma.ContentLibrarySelect;
}

export async function listLibraryContent(filters: LibraryListFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(30, Math.max(5, filters.limit ?? 15));
  const skip = (page - 1) * limit;

  const where: Prisma.ContentLibraryWhereInput = {
    isActive: true,
    ...(filters.type ? { type: filters.type } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.channelId ? { channelId: filters.channelId } : {}),
    ...(filters.isPremium !== undefined ? { isPremium: filters.isPremium } : {}),
  };

  if (filters.ageMin != null) {
    where.ageRangeMax = { gte: filters.ageMin };
  }
  if (filters.ageMax != null) {
    where.ageRangeMin = { lte: filters.ageMax };
  }
  if (filters.search?.trim()) {
    const q = filters.search.trim();
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
      { tags: { has: q.toLowerCase() } },
    ];
  }

  if (filters.userId) {
    const user = await prisma.user.findUnique({
      where: { id: filters.userId },
      select: { age: true, parent: { select: { isPremium: true, premiumUntil: true } } },
    });
    if (user) {
      where.ageRangeMin = { lte: user.age };
      where.ageRangeMax = { gte: user.age };
      const premium =
        user.parent.isPremium ||
        (user.parent.premiumUntil != null && user.parent.premiumUntil > new Date());
      if (!premium) where.isPremium = false;
    }
  }

  const [contents, total] = await Promise.all([
    prisma.contentLibrary.findMany({
      where,
      select: contentSelect(),
      orderBy: [{ viewCount: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
    }),
    prisma.contentLibrary.count({ where }),
  ]);

  const [categoryGroups, typeGroups] = await Promise.all([
    prisma.contentLibrary.groupBy({ by: ['category'], where: { isActive: true } }),
    prisma.contentLibrary.groupBy({ by: ['type'], where: { isActive: true } }),
  ]);

  return {
    contents,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    filters: {
      categories: categoryGroups.map((g) => g.category),
      types: typeGroups.map((g) => g.type),
    },
  };
}

export async function getLibraryContentBySlug(slug: string, userId?: string) {
  const content = await prisma.contentLibrary.findUnique({
    where: { slug },
    select: {
      ...contentSelect(),
      transcript: true,
    },
  });
  if (!content?.isActive) return null;

  await prisma.contentLibrary.update({
    where: { id: content.id },
    data: { viewCount: { increment: 1 } },
  });

  let isBookmarked = false;
  let userProgress = null;
  let averageRating = 0;
  let totalRatings = 0;

  if (userId) {
    const [bookmark, progress, agg] = await Promise.all([
      prisma.userLibraryBookmark.findUnique({
        where: { userId_contentId: { userId, contentId: content.id } },
      }),
      prisma.userLibraryProgress.findUnique({
        where: { userId_contentId: { userId, contentId: content.id } },
      }),
      prisma.libraryContentRating.aggregate({
        where: { contentId: content.id },
        _avg: { rating: true },
        _count: true,
      }),
    ]);
    isBookmarked = bookmark != null;
    userProgress = progress;
    averageRating = agg._avg.rating ?? 0;
    totalRatings = agg._count;
  }

  const related = await prisma.contentLibrary.findMany({
    where: {
      isActive: true,
      id: { not: content.id },
      OR: [{ category: content.category }, { channelId: content.channelId ?? undefined }],
    },
    select: contentSelect(),
    take: 6,
  });

  return { content, related, isBookmarked, userProgress, averageRating, totalRatings };
}

export async function upsertLibraryProgress(
  userId: string,
  slug: string,
  data: { progressSec: number; isCompleted?: boolean },
) {
  const content = await prisma.contentLibrary.findUnique({ where: { slug } });
  if (!content) throw new Error('Contenido no encontrado.');

  const wasCompleted = await prisma.userLibraryProgress.findUnique({
    where: { userId_contentId: { userId, contentId: content.id } },
    select: { isCompleted: true },
  });

  const progress = await prisma.userLibraryProgress.upsert({
    where: { userId_contentId: { userId, contentId: content.id } },
    create: {
      userId,
      contentId: content.id,
      progressSec: data.progressSec,
      isCompleted: Boolean(data.isCompleted),
    },
    update: {
      progressSec: data.progressSec,
      isCompleted: data.isCompleted ?? undefined,
      lastWatchedAt: new Date(),
    },
  });

  let xpEarned = 0;
  if (data.isCompleted && !wasCompleted?.isCompleted) {
    xpEarned = LIBRARY_XP_COMPLETE;
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { level: true, experience: true },
      });
      if (!user) return;
      const next = addExperience(user.level, user.experience, xpEarned);
      await tx.user.update({
        where: { id: userId },
        data: { level: next.level, experience: next.experience },
      });
      await recordXpGain(tx, userId, xpEarned, 'CONTENT');
      await generateAutoPost(
        {
          type: 'CONTENT_COMPLETED',
          userId,
          contentTitle: content.title,
        },
        tx,
      );
    });
  }

  return { progress, xpEarned };
}

export async function toggleLibraryBookmark(userId: string, slug: string) {
  const content = await prisma.contentLibrary.findUnique({ where: { slug } });
  if (!content) throw new Error('Contenido no encontrado.');

  const existing = await prisma.userLibraryBookmark.findUnique({
    where: { userId_contentId: { userId, contentId: content.id } },
  });
  if (existing) {
    await prisma.userLibraryBookmark.delete({ where: { id: existing.id } });
    return { bookmarked: false };
  }
  await prisma.userLibraryBookmark.create({ data: { userId, contentId: content.id } });
  return { bookmarked: true };
}

export async function rateLibraryContent(userId: string, slug: string, rating: number) {
  if (rating < 1 || rating > 5) throw new Error('La calificación debe ser entre 1 y 5.');
  const content = await prisma.contentLibrary.findUnique({ where: { slug } });
  if (!content) throw new Error('Contenido no encontrado.');

  await prisma.libraryContentRating.upsert({
    where: { userId_contentId: { userId, contentId: content.id } },
    create: { userId, contentId: content.id, rating },
    update: { rating },
  });

  const agg = await prisma.libraryContentRating.aggregate({
    where: { contentId: content.id },
    _avg: { rating: true },
    _count: true,
  });

  return {
    averageRating: agg._avg.rating ?? rating,
    totalRatings: agg._count,
  };
}

export async function listLibraryBookmarks(userId: string) {
  const rows = await prisma.userLibraryBookmark.findMany({
    where: { userId },
    include: { content: { select: contentSelect() } },
    orderBy: { createdAt: 'desc' },
  });
  return { contents: rows.map((r) => r.content) };
}

export async function listLibraryHistory(userId: string) {
  const rows = await prisma.userLibraryProgress.findMany({
    where: { userId },
    include: { content: { select: contentSelect() } },
    orderBy: { lastWatchedAt: 'desc' },
    take: 40,
  });
  const totalWatchTime = rows.reduce((sum, r) => sum + r.progressSec, 0);
  return { contents: rows.map((r) => ({ ...r.content, progressSec: r.progressSec, isCompleted: r.isCompleted })), totalWatchTime };
}

export async function listChannels() {
  return prisma.contentChannel.findMany({
    where: { isActive: true },
    orderBy: { subscriberCount: 'desc' },
    include: { _count: { select: { contents: true } } },
  });
}

export async function getChannelBySlug(slug: string, userId?: string) {
  const channel = await prisma.contentChannel.findUnique({
    where: { slug },
    include: {
      contents: {
        where: { isActive: true },
        select: contentSelect(),
        orderBy: { createdAt: 'desc' },
      },
    },
  });
  if (!channel?.isActive) return null;

  let isSubscribed = false;
  if (userId) {
    const sub = await prisma.userChannelSubscription.findUnique({
      where: { userId_channelId: { userId, channelId: channel.id } },
    });
    isSubscribed = sub != null;
  }

  return { channel, contents: channel.contents, isSubscribed };
}

export async function toggleChannelSubscription(userId: string, slug: string) {
  const channel = await prisma.contentChannel.findUnique({ where: { slug } });
  if (!channel) throw new Error('Canal no encontrado.');

  const existing = await prisma.userChannelSubscription.findUnique({
    where: { userId_channelId: { userId, channelId: channel.id } },
  });

  if (existing) {
    await prisma.$transaction([
      prisma.userChannelSubscription.delete({ where: { id: existing.id } }),
      prisma.contentChannel.update({
        where: { id: channel.id },
        data: { subscriberCount: { decrement: 1 } },
      }),
    ]);
    return { subscribed: false };
  }

  await prisma.$transaction([
    prisma.userChannelSubscription.create({ data: { userId, channelId: channel.id } }),
    prisma.contentChannel.update({
      where: { id: channel.id },
      data: { subscriberCount: { increment: 1 } },
    }),
  ]);
  return { subscribed: true };
}

export async function listSubscribedChannels(userId: string) {
  const subs = await prisma.userChannelSubscription.findMany({
    where: { userId },
    include: {
      channel: {
        include: {
          contents: {
            where: { isActive: true },
            select: contentSelect(),
            orderBy: { createdAt: 'desc' },
            take: 3,
          },
        },
      },
    },
  });
  return {
    channels: subs.map((s) => s.channel),
    newContent: subs.flatMap((s) => s.channel.contents),
  };
}

export { getRecommendedLibraryContent };
