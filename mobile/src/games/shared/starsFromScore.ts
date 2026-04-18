import type { Stars } from "../types";

/** Menos errores / más rápido ⇒ más estrellas (1–3). */
export function starsFromAttempts(totalSteps: number, mistakes: number, timeLeftRatio: number): Stars {
  const clean = Math.max(0, totalSteps - mistakes) / Math.max(1, totalSteps);
  const time = Math.max(0, Math.min(1, timeLeftRatio));
  const score = clean * 0.65 + time * 0.35;
  if (score >= 0.78) return 3;
  if (score >= 0.45) return 2;
  return 1;
}
