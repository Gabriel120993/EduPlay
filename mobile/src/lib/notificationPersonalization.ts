import { getCategoryUi } from "./contentCategoryUi";
import type { ProfileInterestItem } from "../types/api";

/** Emoji opcional por categoría para notificaciones (p. ej. astronomía como en el ejemplo). */
const NOTIFICATION_EMOJI: Partial<Record<string, string>> = {
  astronomy: "🌌",
};

/**
 * Elige una categoría de interés con probabilidad proporcional al `score` del API.
 */
export function pickInterestCategoryId(
  interests: ProfileInterestItem[] | undefined,
): string | null {
  if (!interests?.length) return null;
  const total = interests.reduce((s, i) => s + Math.max(1, i.score), 0);
  let r = Math.random() * total;
  for (const i of interests) {
    const w = Math.max(1, i.score);
    r -= w;
    if (r <= 0) return i.category;
  }
  return interests[0].category;
}

/**
 * Segunda categoría distinta para otra notificación (misma sesión); si solo hay una, repite.
 */
export function pickAnotherInterestCategoryId(
  interests: ProfileInterestItem[] | undefined,
  exclude: string | null,
): string | null {
  if (!interests?.length) return null;
  const others = exclude ? interests.filter((i) => i.category !== exclude) : interests;
  if (others.length === 0) return exclude;
  return pickInterestCategoryId(others);
}

function labelAndEmojiForNotification(categoryId: string): { label: string; emoji: string } {
  const ui = getCategoryUi(categoryId);
  const label = ui?.label ?? categoryId;
  const emoji = NOTIFICATION_EMOJI[categoryId] ?? ui?.emoji ?? "✨";
  return { label, emoji };
}

/** Recordatorio 24 h sin abrir la app. */
export function bodyInactivityWithInterests(categoryId: string | null): string {
  if (!categoryId) {
    return "Hace un día que no entrás. ¡Volvé a seguir aprendiendo! 📚";
  }
  const { label, emoji } = labelAndEmojiForNotification(categoryId);
  return `Volvé a EduPlay: seguí con ${label} ${emoji}`;
}

/**
 * Desafíos diarios pendientes + gancho por interés.
 * Título suele ser "EduPlay"; el cuerpo sigue el estilo "Nuevo contenido de …".
 */
export function bodyChallengesWithInterests(categoryId: string | null): string {
  if (!categoryId) {
    return "Tenés desafíos pendientes 🎯";
  }
  const { label, emoji } = labelAndEmojiForNotification(categoryId);
  return `Nuevo contenido de ${label} ${emoji}`;
}
