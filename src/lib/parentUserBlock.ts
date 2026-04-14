import { prisma } from "./prisma";

/** True si el tutor de `a` o el de `b` bloqueó la amistad entre ambos menores. */
export async function isFriendshipForbiddenByParentBlock(aId: string, bId: string): Promise<boolean> {
  if (aId === bId) return false;
  const row = await prisma.parentUserBlock.findFirst({
    where: {
      OR: [
        { childId: aId, blockedUserId: bId },
        { childId: bId, blockedUserId: aId },
      ],
    },
    select: { id: true },
  });
  return row != null;
}
