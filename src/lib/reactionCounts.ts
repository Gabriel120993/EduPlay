import { ReactionType } from "@prisma/client";

import { prisma } from "./prisma";

/** Conteos por tipo para la API móvil (camelCase). */
export type ReactionCountsDto = { like: number; clap: number; star: number };

/** Conteos en respuestas JSON con claves igual que el enum (`LIKE`, `CLAP`, …). */
export type ReactionsCountByType = Record<ReactionType, number>;

function emptyCounts(): ReactionCountsDto {
  return { like: 0, clap: 0, star: 0 };
}

/** Valor por defecto cuando un post no está en el mapa agregado. */
export const ZERO_REACTION_COUNTS_DTO: ReactionCountsDto = { like: 0, clap: 0, star: 0 };

export function emptyReactionsCountByType(): ReactionsCountByType {
  return {
    LIKE: 0,
    CLAP: 0,
    STAR: 0,
  };
}

export function reactionCountsDtoToByType(dto: ReactionCountsDto): ReactionsCountByType {
  return {
    LIKE: dto.like,
    CLAP: dto.clap,
    STAR: dto.star,
  };
}

/** Reacción del usuario actual por post (`null` si no reaccionó). */
export async function getUserReactionsByPostIds(
  userId: string,
  postIds: string[]
): Promise<Map<string, ReactionType | null>> {
  const map = new Map<string, ReactionType | null>();
  if (postIds.length === 0) return map;

  const unique = Array.from(new Set(postIds));
  for (const id of unique) {
    map.set(id, null);
  }

  const rows = await prisma.reaction.findMany({
    where: { userId, postId: { in: unique } },
    select: { postId: true, type: true },
  });

  for (const r of rows) {
    map.set(r.postId, r.type);
  }

  return map;
}

/** Agrega `like` / `clap` / `star` por post en una sola consulta agrupada. */
export async function getReactionCountsByPostIds(postIds: string[]): Promise<Map<string, ReactionCountsDto>> {
  const map = new Map<string, ReactionCountsDto>();
  if (postIds.length === 0) return map;

  const unique = Array.from(new Set(postIds));
  for (const id of unique) {
    map.set(id, emptyCounts());
  }

  const groups = await prisma.reaction.groupBy({
    by: ["postId", "type"],
    where: { postId: { in: unique } },
    _count: { _all: true },
  });

  for (const g of groups) {
    const cur = map.get(g.postId) ?? emptyCounts();
    const n = g._count._all;
    if (g.type === ReactionType.LIKE) cur.like = n;
    else if (g.type === ReactionType.CLAP) cur.clap = n;
    else if (g.type === ReactionType.STAR) cur.star = n;
    map.set(g.postId, cur);
  }

  return map;
}
