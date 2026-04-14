/** Etiquetas canónicas (alineadas con `FEED_TYPE_LABEL_ES` en el API). */
export const FEED_TYPE_LABELS: Record<"GAME_RESULT" | "POST" | "ACHIEVEMENT", string> = {
  GAME_RESULT: "🎮 Juego",
  POST: "📚 Aprendizaje",
  ACHIEVEMENT: "🏆 Logro",
};

/** Coincide con `feedLabelForPostType` del API (fallback si falta `feedLabel`). */
export function feedLabelFromPostType(type: string | undefined): string | undefined {
  if (!type) return undefined;
  if (type === "GAME_RESULT" || type === "POST" || type === "ACHIEVEMENT") {
    return FEED_TYPE_LABELS[type];
  }
  return undefined;
}
