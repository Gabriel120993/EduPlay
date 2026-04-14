/** IDs fijos de las 3 misiones del reto diario (upsert en `ensureMissionCatalog`). */
export const DAILY_CHALLENGE_MISSION_IDS = {
  play: "a0000001-0000-4000-8000-000000000010",
  read: "a0000001-0000-4000-8000-000000000011",
  correct: "a0000001-0000-4000-8000-000000000012",
} as const;

export const DAILY_CHALLENGE_ORDER = [
  DAILY_CHALLENGE_MISSION_IDS.play,
  DAILY_CHALLENGE_MISSION_IDS.read,
  DAILY_CHALLENGE_MISSION_IDS.correct,
] as const;

/** XP extra al completar las 3 misiones el mismo día. */
export const DAILY_CHALLENGE_BONUS_XP = 75;

/** Logro desbloqueable la primera vez que se obtiene el bonus del reto diario. */
export const DAILY_CHALLENGE_ACHIEVEMENT_ID = "b0000001-0000-4000-8000-0000000000d1";
