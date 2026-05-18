import type { SocialGroupChallengeType } from '@prisma/client';
import { areAcceptedFriends } from '../lib/chatFriendship';
import { addQuizCoins } from '../lib/currency';
import { prisma } from '../lib/prisma';
import { createSocialNotification, generateAutoPost } from './socialFeed.service';

export type CreateSocialChallengeInput = {
  type: SocialGroupChallengeType;
  gameId?: string;
  playGameId?: string;
  description: string;
  targetScore?: number;
  targetTime?: number;
  invitedFriends: string[];
  durationHours: number;
  rewardCoins?: number;
  rewardGems?: number;
};

export async function createSocialGroupChallenge(creatorId: string, data: CreateSocialChallengeInput) {
  for (const friendId of data.invitedFriends) {
    const ok = await areAcceptedFriends(creatorId, friendId);
    if (!ok) {
      throw new Error('Solo podés invitar amigos aprobados.');
    }
  }

  const participantIds = [creatorId, ...data.invitedFriends.filter((id) => id !== creatorId)];

  const challenge = await prisma.$transaction(async (tx) => {
    const row = await tx.socialGroupChallenge.create({
      data: {
        type: data.type,
        gameId: data.gameId,
        playGameId: data.playGameId,
        creatorId,
        description: data.description.trim(),
        targetScore: data.targetScore,
        targetTime: data.targetTime,
        expiresAt: new Date(Date.now() + data.durationHours * 3_600_000),
        rewardCoins: data.rewardCoins ?? 0,
        rewardGems: data.rewardGems ?? 0,
        members: {
          create: participantIds.map((userId) => ({ userId })),
        },
      },
      include: { members: true },
    });

    await generateAutoPost(
      {
        type: 'CHALLENGE',
        userId: creatorId,
        challengeId: row.id,
        description: row.description,
      },
      tx,
    );

    return row;
  });

  for (const member of challenge.members) {
    if (member.userId === creatorId) continue;
    await createSocialNotification(
      member.userId,
      'Desafío grupal',
      data.description,
      { challengeId: challenge.id },
    );
  }

  return challenge;
}

export async function acceptSocialGroupChallenge(challengeId: string, userId: string) {
  const member = await prisma.socialGroupChallengeMember.findUnique({
    where: { challengeId_userId: { challengeId, userId } },
  });
  if (!member) throw new Error('No estás invitado a este desafío.');
  return { status: 'ACCEPTED' as const };
}

export async function completeSocialGroupChallenge(
  challengeId: string,
  userId: string,
  score: number,
): Promise<{ completed: boolean; groupReward?: boolean }> {
  const challenge = await prisma.socialGroupChallenge.findUnique({
    where: { id: challengeId },
    include: { members: true },
  });
  if (!challenge || challenge.status !== 'ACTIVE') {
    throw new Error('Desafío no encontrado o no activo.');
  }

  const member = challenge.members.find((m) => m.userId === userId);
  if (!member) throw new Error('No participás en este desafío.');

  const meetsTarget =
    challenge.targetScore != null ? score >= challenge.targetScore : score > 0;

  if (!meetsTarget) {
    return { completed: false };
  }

  await prisma.socialGroupChallengeMember.update({
    where: { id: member.id },
    data: { score, completedAt: new Date() },
  });

  const refreshed = await prisma.socialGroupChallengeMember.findMany({
    where: { challengeId },
  });
  const allDone = refreshed.every((m) => m.completedAt != null);

  if (allDone) {
    await prisma.$transaction(async (tx) => {
      await tx.socialGroupChallenge.update({
        where: { id: challengeId },
        data: { status: 'COMPLETED' },
      });
      for (const m of refreshed) {
        await addQuizCoins(tx, m.userId, challenge.rewardCoins, challenge.rewardGems);
        await generateAutoPost(
          {
            type: 'GROUP_REWARD',
            userId: m.userId,
            challengeId,
            rewardCoins: challenge.rewardCoins,
          },
          tx,
        );
      }
    });
    return { completed: true, groupReward: true };
  }

  return { completed: true, groupReward: false };
}

export async function listSocialGroupChallenges(userId: string) {
  const now = new Date();
  const memberships = await prisma.socialGroupChallengeMember.findMany({
    where: { userId },
    include: {
      challenge: {
        include: {
          creator: { select: { id: true, username: true, avatarUrl: true } },
          members: {
            include: { user: { select: { id: true, username: true, avatarUrl: true } } },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const active: typeof memberships = [];
  const completed: typeof memberships = [];
  const invited: typeof memberships = [];

  for (const m of memberships) {
    const c = m.challenge;
    if (c.status === 'COMPLETED') completed.push(m);
    else if (c.expiresAt < now) invited.push(m);
    else if (!m.completedAt) active.push(m);
    else completed.push(m);
  }

  return { active, completed, invited };
}
