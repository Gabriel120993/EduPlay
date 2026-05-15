import { prisma } from './prisma';

/** Elimina filas de amistad en ambas direcciones entre dos usuarios. */
export async function removeFriendshipPair(userIdA: string, userIdB: string): Promise<void> {
  await prisma.friend.deleteMany({
    where: {
      OR: [
        { userId: userIdA, friendId: userIdB },
        { userId: userIdB, friendId: userIdA },
      ],
    },
  });
}
