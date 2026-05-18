import { addQuizCoins } from '../lib/currency';
import { prisma } from '../lib/prisma';

const MS_PER_DAY = 86_400_000;

export async function recordSocialFriendActivity(
  userId: string,
  friendId: string,
): Promise<{ streakDays: number }> {
  if (userId === friendId) return { streakDays: 0 };

  const existing = await prisma.socialFriendStreak.findUnique({
    where: { userId_friendId: { userId, friendId } },
  });

  if (!existing) {
    await prisma.socialFriendStreak.create({
      data: { userId, friendId, streakDays: 1, lastActivity: new Date() },
    });
    await prisma.socialFriendStreak.upsert({
      where: { userId_friendId: { userId: friendId, friendId: userId } },
      create: { userId: friendId, friendId: userId, streakDays: 1 },
      update: { streakDays: 1, lastActivity: new Date() },
    });
    return { streakDays: 1 };
  }

  const daysSince = Math.floor(
    (Date.now() - existing.lastActivity.getTime()) / MS_PER_DAY,
  );

  let nextDays = existing.streakDays;
  if (daysSince === 1) {
    nextDays = existing.streakDays + 1;
  } else if (daysSince > 1) {
    nextDays = 1;
  } else {
    return { streakDays: existing.streakDays };
  }

  await prisma.$transaction(async (tx) => {
    await tx.socialFriendStreak.update({
      where: { id: existing.id },
      data: { streakDays: nextDays, lastActivity: new Date() },
    });
    await tx.socialFriendStreak.upsert({
      where: { userId_friendId: { userId: friendId, friendId: userId } },
      create: { userId: friendId, friendId: userId, streakDays: nextDays },
      update: { streakDays: nextDays, lastActivity: new Date() },
    });

    if (nextDays === 7) {
      await addQuizCoins(tx, userId, 50);
      await addQuizCoins(tx, friendId, 50);
    }
    if (nextDays === 30) {
      await addQuizCoins(tx, userId, 10, 10);
      await addQuizCoins(tx, friendId, 10, 10);
    }
  });

  return { streakDays: nextDays };
}

export async function listSocialFriendStreaks(userId: string) {
  const rows = await prisma.socialFriendStreak.findMany({
    where: { userId },
    include: {
      friend: { select: { id: true, username: true, avatarUrl: true } },
    },
    orderBy: { streakDays: 'desc' },
  });
  return rows.map((r) => ({
    friend: r.friend,
    days: r.streakDays,
    lastActivity: r.lastActivity,
  }));
}
