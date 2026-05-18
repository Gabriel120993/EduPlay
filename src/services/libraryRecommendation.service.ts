import type { ContentLibrary, LibraryCategory } from '@prisma/client';
import { FriendStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';

type ScorePrefs = {
  preferredCategories: LibraryCategory[];
  preferredChannelIds: string[];
  friendContentIds: Set<string>;
  userAge: number;
  parentPremium: boolean;
};

function calculateScore(content: ContentLibrary, prefs: ScorePrefs): number {
  let score = 0;
  if (prefs.preferredCategories.includes(content.category)) score += 10;
  if (content.channelId && prefs.preferredChannelIds.includes(content.channelId)) score += 8;
  if (prefs.friendContentIds.has(content.id)) score += 12;
  if (content.viewCount > 100) score += 5;
  if (content.isPremium && !prefs.parentPremium) score -= 20;
  const midAge = (content.ageRangeMin + content.ageRangeMax) / 2;
  score += Math.max(0, 8 - Math.abs(prefs.userAge - midAge));
  return score;
}

async function getFriendIds(userId: string): Promise<string[]> {
  const rows = await prisma.friend.findMany({
    where: {
      status: FriendStatus.ACCEPTED,
      OR: [{ userId }, { friendId: userId }],
    },
    select: { userId: true, friendId: true },
  });
  return rows.map((r) => (r.userId === userId ? r.friendId : r.userId));
}

export async function getRecommendedLibraryContent(
  userId: string,
  limit = 10,
): Promise<ContentLibrary[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      age: true,
      parent: { select: { isPremium: true, premiumUntil: true } },
    },
  });
  if (!user) return [];

  const parentPremium =
    user.parent.isPremium ||
    (user.parent.premiumUntil != null && user.parent.premiumUntil > new Date());

  const ageMatch = await prisma.contentLibrary.findMany({
    where: {
      isActive: true,
      ageRangeMin: { lte: user.age },
      ageRangeMax: { gte: user.age },
      ...(parentPremium ? {} : { isPremium: false }),
    },
    take: 80,
  });

  const watched = await prisma.userLibraryProgress.findMany({
    where: { userId },
    include: { content: true },
    orderBy: { lastWatchedAt: 'desc' },
    take: 10,
  });

  const preferredCategories = [...new Set(watched.map((w) => w.content.category))];
  const preferredChannelIds = [
    ...new Set(watched.map((w) => w.content.channelId).filter(Boolean) as string[]),
  ];

  const friends = await getFriendIds(userId);
  const friendWatched = await prisma.userLibraryProgress.findMany({
    where: { userId: { in: friends } },
    select: { contentId: true },
    take: 30,
  });
  const friendContentIds = new Set(friendWatched.map((f) => f.contentId));

  const prefs: ScorePrefs = {
    preferredCategories,
    preferredChannelIds,
    friendContentIds,
    userAge: user.age,
    parentPremium,
  };

  return ageMatch
    .map((content) => ({ content, score: calculateScore(content, prefs) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.content);
}
