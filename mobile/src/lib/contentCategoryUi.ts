/**
 * Sistema de color por categoría educativa (alineado con `ContentCategory` del API).
 * Tonos vivos pero suaves + emoji por categoría (UI gamificada infantil).
 *
 * Iconos: Ionicons (`@expo/vector-icons`), tamaños vía `iconSize` en tokens.
 */

import type { IoniconName } from "../theme/icons";

export type CategoryUi = {
  id: string;
  icon: IoniconName;
  /** Texto corto sin emoji (accesibilidad / lógica). */
  label: string;
  /** Emoji mostrado junto al nombre en chips y etiquetas. */
  emoji: string;
  /** Texto y borde de chips / etiquetas */
  accent: string;
  /** Fondo suave de chips y pills */
  softBg: string;
  /** Franja lateral (highlights) en tarjetas feed / explorar */
  highlight: string;
  /** Borde del contenedor del icono de logro en posts */
  badgeRing: string;
};

const FALLBACK: CategoryUi = {
  id: "__unknown__",
  icon: "pricetag-outline",
  label: "General",
  emoji: "✨",
  accent: "#6366f1",
  softBg: "rgba(99, 102, 241, 0.16)",
  highlight: "#818cf8",
  badgeRing: "#a5b4fc",
};

/** Orden fijo para filtros y listas (todas las categorías del backend). */
export const CONTENT_CATEGORIES_UI: CategoryUi[] = [
  {
    id: "math",
    icon: "calculator-outline",
    label: "Matemáticas",
    emoji: "🔢",
    accent: "#2563eb",
    softBg: "rgba(59, 130, 246, 0.2)",
    highlight: "#3b82f6",
    badgeRing: "#60a5fa",
  },
  {
    id: "astronomy",
    icon: "planet-outline",
    label: "Astronomía",
    emoji: "🪐",
    accent: "#7c3aed",
    softBg: "rgba(139, 92, 246, 0.2)",
    highlight: "#8b5cf6",
    badgeRing: "#a78bfa",
  },
  {
    id: "science",
    icon: "flask-outline",
    label: "Ciencias",
    emoji: "🧪",
    accent: "#059669",
    softBg: "rgba(16, 185, 129, 0.2)",
    highlight: "#10b981",
    badgeRing: "#34d399",
  },
  {
    id: "geography",
    icon: "globe-outline",
    label: "Geografía",
    emoji: "🌍",
    accent: "#0284c7",
    softBg: "rgba(14, 165, 233, 0.2)",
    highlight: "#0ea5e9",
    badgeRing: "#38bdf8",
  },
  {
    id: "education",
    icon: "book-outline",
    label: "Educación",
    emoji: "📚",
    accent: "#d97706",
    softBg: "rgba(251, 191, 36, 0.22)",
    highlight: "#fbbf24",
    badgeRing: "#fcd34d",
  },
  {
    id: "history",
    icon: "library-outline",
    label: "Historia",
    emoji: "📜",
    accent: "#ea580c",
    softBg: "rgba(251, 146, 60, 0.2)",
    highlight: "#fb923c",
    badgeRing: "#fdba74",
  },
  {
    id: "puzzle",
    icon: "extension-puzzle-outline",
    label: "Puzzle",
    emoji: "🧩",
    /** Fucsia: distinto de Astronomía (violeta). */
    accent: "#c026d3",
    softBg: "rgba(192, 38, 211, 0.18)",
    highlight: "#d946ef",
    badgeRing: "#e879f9",
  },
  {
    id: "sports",
    icon: "football-outline",
    label: "Deportes",
    emoji: "⚽",
    accent: "#16a34a",
    softBg: "rgba(74, 222, 128, 0.22)",
    highlight: "#22c55e",
    badgeRing: "#4ade80",
  },
  {
    id: "creativity",
    icon: "color-palette-outline",
    label: "Creatividad",
    emoji: "🎨",
    accent: "#db2777",
    softBg: "rgba(244, 114, 182, 0.2)",
    highlight: "#f472b6",
    badgeRing: "#f9a8d4",
  },
];

const BY_ID = new Map(CONTENT_CATEGORIES_UI.map((c) => [c.id, c]));

export function getCategoryUi(category: string | null | undefined): CategoryUi | null {
  if (category == null || String(category).trim() === "") return null;
  const id = String(category).trim();
  return BY_ID.get(id) ?? { ...FALLBACK, id, label: id };
}

/** Colores derivados de categoría para tarjetas, anillos y tintes (una sola fuente de verdad). */
export type CategoryChrome = {
  ring: string;
  stripe: string;
  accent: string;
  softBg: string;
  /** Fondo suave para pills acoplados a la categoría (p. ej. contenedor del icono de logro). */
  pillBgTint: string;
};

export function hexWithAlpha(hex: string, alpha: number): string {
  if (typeof hex !== "string" || !/^#([0-9A-Fa-f]{6})$/.test(hex)) {
    return `rgba(99, 102, 241, ${alpha})`;
  }
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex.slice(0, 7).toLowerCase()}${a}`;
}

/**
 * Paleta unificada por categoría: usar en franjas, bordes de icono y fondos suaves.
 * Si no hay categoría conocida, usa `FALLBACK` (no colores arbitrarios del API).
 */
export function getCategoryChrome(category: string | null | undefined): CategoryChrome {
  const ui = getCategoryUi(category);
  const base = ui ?? FALLBACK;
  return {
    ring: base.badgeRing,
    stripe: base.highlight,
    accent: base.accent,
    softBg: base.softBg,
    pillBgTint: hexWithAlpha(base.accent, 0.22),
  };
}

/** Texto visible en UI: emoji + nombre legible. */
export function categoryDisplayLabel(ui: CategoryUi): string {
  return `${ui.emoji} ${ui.label}`;
}

/** Color de franja lateral / highlight (explorar, feed). */
export function getCategoryHighlight(category: string | null | undefined): string | null {
  return getCategoryUi(category)?.highlight ?? null;
}
