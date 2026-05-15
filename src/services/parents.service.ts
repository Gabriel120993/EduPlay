import { ActivityApprovalStatus } from '@prisma/client';
import { prisma } from '../lib/prisma';

export async function resolveParentUserId(parentId: string): Promise<string | null> {
  const u = await prisma.user.findFirst({
    where: { parentId, type: 'parent' },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });
  return u?.id ?? null;
}

export async function listPendingApprovalsForParent(parentUserId: string) {
  return prisma.activityApproval.findMany({
    where: { parentId: parentUserId, status: ActivityApprovalStatus.pending },
    orderBy: { requestedAt: 'desc' },
    take: 100,
    include: {
      minor: { select: { id: true, username: true, realName: true, age: true } },
    },
  });
}
