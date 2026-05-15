import { FriendStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';

export async function ensureBothUsersExist(userId: string, friendId: string): Promise<boolean> {
  const [a, b] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
    prisma.user.findUnique({ where: { id: friendId }, select: { id: true } }),
  ]);
  return Boolean(a && b);
}

export function completeAcceptedFriendshipTx(rowId: string, userId: string, friendId: string) {
  return prisma.$transaction([
    prisma.friend.update({
      where: { id: rowId },
      data: { status: FriendStatus.ACCEPTED, parentApproved: true },
    }),
    prisma.friend.upsert({
      where: {
        userId_friendId: { userId: friendId, friendId: userId },
      },
      create: {
        userId: friendId,
        friendId: userId,
        status: FriendStatus.ACCEPTED,
        requiresParentApproval: false,
        parentApproved: true,
      },
      update: {
        status: FriendStatus.ACCEPTED,
        parentApproved: true,
        requiresParentApproval: false,
      },
    }),
  ]);
}

export function isActiveIncomingBlock(status: FriendStatus): boolean {
  return status === FriendStatus.PENDING || status === FriendStatus.AWAITING_PARENT;
}
