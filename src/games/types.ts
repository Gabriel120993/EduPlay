export const PLAY_GAME_MAX_SESSION_MS = 15 * 60 * 1000;

export const PLAY_GAME_SLUGS = [
  'memory-arena',
  'patrones-rapidos',
  'detective-junior',
  'matematica-relampago',
  'cierto-o-fake',
] as const;

export type PlayGameSlug = (typeof PLAY_GAME_SLUGS)[number];

export function isPlayGameSlug(s: string): s is PlayGameSlug {
  return (PLAY_GAME_SLUGS as readonly string[]).includes(s);
}
