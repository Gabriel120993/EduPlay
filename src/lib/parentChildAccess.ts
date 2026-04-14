import { prisma } from "./prisma";

/** Comprueba que el usuario menor pertenezca al tutor indicado. */
export async function userBelongsToParent(userId: string, parentId: string): Promise<boolean> {
  const row = await prisma.user.findFirst({
    where: { id: userId, parentId },
    select: { id: true },
  });
  return Boolean(row);
}
