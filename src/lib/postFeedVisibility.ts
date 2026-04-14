import { Visibility } from "@prisma/client";

/**
 * Posts visibles en feed (público + amigos) excluyendo medios marcados por moderación,
 * salvo los publicados por el propio viewer.
 */
export function buildPublicFeedVisibilityWhere(viewerId: string, friendAuthorIds: readonly string[]) {
  const authorsForFriendsPosts = Array.from(new Set([viewerId, ...friendAuthorIds]));
  return {
    AND: [
      {
        OR: [
          { visibility: Visibility.PUBLIC },
          {
            AND: [
              { visibility: Visibility.FRIENDS },
              { userId: { in: authorsForFriendsPosts } },
            ],
          },
        ],
      },
      {
        OR: [
          { mediaModerationFlagged: false },
          { userId: viewerId },
          { parentModerationVisibleAt: { not: null } },
        ],
      },
    ],
  };
}
