import type { PrismaClient } from "@prisma/client";

type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$extends" | "$use"
>;

/**
 * Elimina un menor y datos vinculados: publicaciones, reacciones, partidas, misiones, XP, amistades, chat, etc.
 * Orden respetando FKs con ON DELETE RESTRICT hacia `User` / `Post`.
 */
export async function deleteChildUserAccount(db: PrismaClient, userId: string): Promise<void> {
  await db.$transaction(
    async (tx: Tx) => {
      const posts = await tx.post.findMany({
        where: { userId },
        select: { id: true },
      });
      const postIds = posts.map((p) => p.id);

      await tx.reaction.deleteMany({
        where:
          postIds.length > 0
            ? { OR: [{ userId }, { postId: { in: postIds } }] }
            : { userId },
      });

      await tx.contentReport.deleteMany({
        where: {
          OR: [
            { reporterUserId: userId },
            { reportedUserId: userId },
            { post: { userId } },
            { chatMessage: { OR: [{ senderId: userId }, { recipientId: userId }] } },
          ],
        },
      });

      if (postIds.length > 0) {
        await tx.moderationLog.deleteMany({ where: { postId: { in: postIds } } });
      }

      await tx.post.deleteMany({ where: { userId } });

      await tx.gameResult.deleteMany({ where: { userId } });
      await tx.userAchievement.deleteMany({ where: { userId } });

      await tx.friend.deleteMany({
        where: { OR: [{ userId }, { friendId: userId }] },
      });

      await tx.chatMessage.deleteMany({
        where: { OR: [{ senderId: userId }, { recipientId: userId }] },
      });

      await tx.userMission.deleteMany({ where: { userId } });
      await tx.dailyChallengeBonus.deleteMany({ where: { userId } });
      await tx.xpGainLedger.deleteMany({ where: { userId } });
      await tx.userInterest.deleteMany({ where: { userId } });
      await tx.analyticsEvent.deleteMany({ where: { userId } });

      await tx.userMediaUpload.deleteMany({ where: { userId } });

      await tx.parentUserBlock.deleteMany({
        where: { OR: [{ childId: userId }, { blockedUserId: userId }] },
      });

      await tx.parentFamilyEvent.deleteMany({
        where: { OR: [{ childId: userId }, { peerUserId: userId }] },
      });

      await tx.user.delete({ where: { id: userId } });
    },
    { timeout: 60_000 }
  );
}
