/** Dificultad sugerida según nivel del usuario (override manual posible en UI). */
export function difficultyFromUserLevel(level: number): "EASY" | "MEDIUM" | "HARD" {
  if (level <= 3) return "EASY";
  if (level <= 7) return "MEDIUM";
  return "HARD";
}
