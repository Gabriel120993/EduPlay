import type { ReactionType } from "../services/api";
import type { FeedPost, ReactionsCountByType } from "../types/api";

export function getReactionCounts(p: FeedPost): { like: number; clap: number; star: number } {
  const byType = p.reactionsCountByType;
  if (byType) {
    return { like: byType.LIKE, clap: byType.CLAP, star: byType.STAR };
  }
  return p.reactionCounts ?? { like: 0, clap: 0, star: 0 };
}

function ensureReactionsCountByType(p: FeedPost): ReactionsCountByType {
  if (p.reactionsCountByType) {
    return { ...p.reactionsCountByType };
  }
  const rc = getReactionCounts(p);
  return { LIKE: rc.like, CLAP: rc.clap, STAR: rc.star };
}

function reactionCountsFromByType(
  by: ReactionsCountByType,
): NonNullable<FeedPost["reactionCounts"]> {
  return { like: by.LIKE, clap: by.CLAP, star: by.STAR };
}

/**
 * Actualización optimista: primera reacción (+1 total), cambio de tipo (total igual), mismo tipo (sin cambios).
 * Alineado con POST /reactions (upsert por usuario + post).
 */
export function bumpReactionOptimistic(p: FeedPost, type: ReactionType): FeedPost {
  const prev = p.userReaction ?? null;
  if (prev === type) {
    return p;
  }

  const reactionsCountByType = ensureReactionsCountByType(p);

  if (prev === null) {
    if (type === "LIKE") reactionsCountByType.LIKE += 1;
    else if (type === "CLAP") reactionsCountByType.CLAP += 1;
    else if (type === "STAR") reactionsCountByType.STAR += 1;
    return {
      ...p,
      reactionsTotal: p.reactionsTotal + 1,
      reactionsCountByType,
      userReaction: type,
      reactionCounts: reactionCountsFromByType(reactionsCountByType),
    };
  }

  if (type === "LIKE") reactionsCountByType.LIKE += 1;
  else if (type === "CLAP") reactionsCountByType.CLAP += 1;
  else if (type === "STAR") reactionsCountByType.STAR += 1;

  if (prev === "LIKE") reactionsCountByType.LIKE -= 1;
  else if (prev === "CLAP") reactionsCountByType.CLAP -= 1;
  else if (prev === "STAR") reactionsCountByType.STAR -= 1;

  return {
    ...p,
    reactionsTotal: p.reactionsTotal,
    reactionsCountByType,
    userReaction: type,
    reactionCounts: reactionCountsFromByType(reactionsCountByType),
  };
}
