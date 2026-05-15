/** XP acumulado en el nivel actual; cada 100 XP sube un nivel y el resto se conserva. */
export const XP_PER_LEVEL = 100;

export const ACHIEVEMENT_XP_REWARD = 50;

export function xpFromGameScore(score: number): number {
  return Math.floor(score / 10);
}

export function addExperience(
  level: number,
  experience: number,
  xpGain: number,
): { level: number; experience: number } {
  let l = Math.max(1, level);
  let xp = experience + Math.max(0, xpGain);
  while (xp >= XP_PER_LEVEL) {
    l += 1;
    xp -= XP_PER_LEVEL;
  }
  return { level: l, experience: xp };
}
