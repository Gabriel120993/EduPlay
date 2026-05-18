import { PostType } from '@prisma/client';

/** Etiquetas del feed (posts manuales, resultados de juego, logros). */
export const FEED_TYPE_LABEL_ES: Record<PostType, string> = {
  [PostType.POST]: '📚 Aprendizaje',
  [PostType.GAME_RESULT]: '🎮 Juego',
  [PostType.ACHIEVEMENT]: '🏆 Logro',
  [PostType.CHALLENGE]: '🎯 Desafío',
  [PostType.DAILY_STREAK]: '🔥 Racha',
  [PostType.CONTENT_COMPLETED]: '📖 Biblioteca',
  [PostType.LEVEL_UP]: '🆙 Nivel',
  [PostType.FRIEND_MILESTONE]: '🤝 Amigos',
  [PostType.GROUP_REWARD]: '🎁 Recompensa grupal',
};

export function feedLabelForPostType(type: PostType): string {
  return FEED_TYPE_LABEL_ES[type] ?? String(type);
}

/** Orden del round-robin: alterna juego → aprendizaje → logro. */
export const FEED_MIX_ORDER: readonly PostType[] = [
  PostType.GAME_RESULT,
  PostType.POST,
  PostType.ACHIEVEMENT,
];

export type FeedPostForMix = {
  type: PostType;
  score: number;
  createdAt: string;
};

/**
 * Mezcla posts por tipo manteniendo el orden por score dentro de cada bucket
 * (mejor juego, mejor post manual, mejor logro, segundo juego…).
 *
 * Usado en `listPosts`; el cliente no debe repetir la misma mezcla sobre la lista completa.
 */
export function interleaveFeedByPostType<T extends FeedPostForMix>(items: T[]): T[] {
  const buckets = new Map<PostType, T[]>();
  for (const t of FEED_MIX_ORDER) {
    buckets.set(t, []);
  }
  for (const item of items) {
    const b = buckets.get(item.type);
    if (b) b.push(item);
  }
  for (const typ of FEED_MIX_ORDER) {
    const bucket = buckets.get(typ)!;
    bucket.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }
  const result: T[] = [];
  let round = 0;
  let added = true;
  while (added) {
    added = false;
    for (const typ of FEED_MIX_ORDER) {
      const bucket = buckets.get(typ)!;
      if (round < bucket.length) {
        result.push(bucket[round]!);
        added = true;
      }
    }
    round++;
  }
  return result;
}
