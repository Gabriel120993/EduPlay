import type { FeedPost } from "../types/api";

/** Mismo orden que `FEED_MIX_ORDER` en el API (`feedVariety.ts`). */
export const FEED_MIX_ORDER = ["GAME_RESULT", "POST", "ACHIEVEMENT"] as const;

/**
 * Mezcla juego → aprendizaje → logro por rondas (score desc. dentro de cada bucket).
 * Tipos desconocidos van al final.
 *
 * **Cuándo usar en el cliente:** `GET /posts` ya devuelve el feed intercalado en el servidor
 * (`interleaveFeedByPostType`). No volver a llamar esto con la lista completa: sería redundante.
 * Sí conviene después de **filtrar** (p. ej. por categoría), porque el orden global ya no aplica al subconjunto.
 */
export function interleaveFeedPostsByType<T extends Pick<FeedPost, "type" | "createdAt" | "score">>(items: T[]): T[] {
  const buckets = new Map<string, T[]>();
  for (const t of FEED_MIX_ORDER) {
    buckets.set(t, []);
  }
  const unknown: T[] = [];
  for (const item of items) {
    const b = buckets.get(item.type);
    if (b) b.push(item);
    else unknown.push(item);
  }
  for (const typ of FEED_MIX_ORDER) {
    const bucket = buckets.get(typ)!;
    bucket.sort((a, b) => {
      const sa = a.score ?? 0;
      const sb = b.score ?? 0;
      if (sb !== sa) return sb - sa;
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
  unknown.sort((a, b) => {
    const sa = a.score ?? 0;
    const sb = b.score ?? 0;
    if (sb !== sa) return sb - sa;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  return [...result, ...unknown];
}
