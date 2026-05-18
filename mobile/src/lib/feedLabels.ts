/** Etiquetas canónicas (alineadas con `FEED_TYPE_LABEL_ES` en el API). */
export const FEED_TYPE_LABELS: Record<string, string> = {
  GAME_RESULT: "🎮 Juego",
  POST: "📚 Aprendizaje",
  ACHIEVEMENT: "🏆 Logro",
  CHALLENGE: "🎯 Desafío",
  DAILY_STREAK: "🔥 Racha",
  CONTENT_COMPLETED: "📖 Biblioteca",
  LEVEL_UP: "🆙 Nivel",
  FRIEND_MILESTONE: "🤝 Amigos",
  GROUP_REWARD: "🎁 Recompensa",
};

/** Coincide con `feedLabelForPostType` del API (fallback si falta `feedLabel`). */
export function feedLabelFromPostType(type: string | undefined): string | undefined {
  if (!type) return undefined;
  return FEED_TYPE_LABELS[type];
}
