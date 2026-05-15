import { FriendStatus } from '@prisma/client';
import { prisma } from './prisma';

/** True si existe amistad ACCEPTED en cualquier dirección entre a y b. */
export async function areAcceptedFriends(a: string, b: string): Promise<boolean> {
  if (a === b) return false;
  const row = await prisma.friend.findFirst({
    where: {
      status: FriendStatus.ACCEPTED,
      OR: [
        { userId: a, friendId: b },
        { userId: b, friendId: a },
      ],
    },
    select: { id: true },
  });
  return row != null;
}
