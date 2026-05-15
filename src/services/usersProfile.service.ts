import { prisma } from '../lib/prisma';

export type AuthProfileSubject =
  | { kind: 'parent'; parentId: string }
  | { kind: 'child'; userId: string };

export async function fetchMyFullProfile(auth: AuthProfileSubject) {
  if (auth.kind === 'parent') {
    const [parent, parentUser] = await Promise.all([
      prisma.parent.findUnique({
        where: { id: auth.parentId },
        select: {
          id: true,
          email: true,
          isPremium: true,
          premiumUntil: true,
          createdAt: true,
          expoPushToken: true,
        },
      }),
      prisma.user.findFirst({
        where: { parentId: auth.parentId, type: 'parent' },
        select: {
          id: true,
          username: true,
          realName: true,
          avatarUrl: true,
          profileImageUrl: true,
          status: true,
          notificationsEnabled: true,
          notificationSoundsEnabled: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    return { role: 'parent' as const, parent, user: parentUser };
  }

  const user = await prisma.user.findUnique({
    where: { id: auth.userId },
    include: {
      minorProfile: true,
      parent: { select: { id: true, email: true } },
    },
  });
  if (!user) return null;

  return {
    role: 'child' as const,
    user: {
      id: user.id,
      username: user.username,
      realName: user.realName,
      age: user.age,
      avatarUrl: user.avatarUrl,
      profileImageUrl: user.profileImageUrl,
      level: user.level,
      experience: user.experience,
      quizCoins: user.quizCoins,
      status: user.status,
      parentAccountApprovedAt: user.parentAccountApprovedAt,
      notificationsEnabled: user.notificationsEnabled,
      notificationSoundsEnabled: user.notificationSoundsEnabled,
      achievementsPublicOnProfile: user.achievementsPublicOnProfile,
      onboardingCompletedAt: user.onboardingCompletedAt,
      createdAt: user.createdAt,
      parent: user.parent,
      minorProfile: user.minorProfile,
    },
  };
}
