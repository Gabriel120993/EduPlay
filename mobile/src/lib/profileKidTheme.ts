import { CONTENT_CATEGORIES_UI } from "./contentCategoryUi";

export function hexWithAlpha(hex: string, alpha: number): string {
  if (typeof hex !== "string" || !/^#([0-9A-Fa-f]{6})$/.test(hex)) {
    return `rgba(99, 102, 241, ${alpha})`;
  }
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex.slice(0, 7).toLowerCase()}${a}`;
}

/** Gradientes suaves para anillo de avatar según nivel (ciclo). */
export const LEVEL_RING_GRADIENTS: [string, string][] = [
  ["#f472b6", "#fb923c"],
  ["#60a5fa", "#34d399"],
  ["#a78bfa", "#f472b6"],
  ["#fbbf24", "#f97316"],
  ["#22d3ee", "#818cf8"],
  ["#4ade80", "#2dd4bf"],
];

export function levelRingGradient(level: number): [string, string] {
  return LEVEL_RING_GRADIENTS[Math.max(0, level) % LEVEL_RING_GRADIENTS.length];
}

/** Color de acento para barra XP / badge según nivel (alineado a categorías). */
export function levelAccentColor(level: number): string {
  const i = Math.max(0, level) % CONTENT_CATEGORIES_UI.length;
  return CONTENT_CATEGORIES_UI[i]?.accent ?? "#6366f1";
}

/** Degradado de la barra de XP del perfil (mismo ciclo que el anillo de nivel). */
export function xpBarFillGradient(level: number): [string, string] {
  return levelRingGradient(level);
}

/** Fondo hero (tarjeta principal) — claro. */
export const HERO_CARD_GRADIENT: [string, string, string] = ["#f0f9ff", "#fff7ed", "#fdf4ff"];

/**
 * Cabecera de perfil: gradiente muy suave (pastel) para menores.
 */
export const PROFILE_HERO_CARD_GRADIENT_LIGHT: [string, string, string, string] = [
  "#fffbeb",
  "#e0f7fa",
  "#f5f3ff",
  "#ffedd5",
];

/** Fondo pantalla perfil — claro (suave y alegre). */
export const PROFILE_SCREEN_GRADIENT: [string, string, string] = ["#eef2ff", "#fff7ed", "#fdf4ff"];

export function heroCardGradient(isDark: boolean): [string, string, string] {
  if (isDark) return ["#2a2a2a", "#1e1e1e", "#252525"];
  return HERO_CARD_GRADIENT;
}

/** Gradiente de la tarjeta cabecera del perfil (3–4 paradas). */
export function profileHeroCardGradient(isDark: boolean): [string, string, string, string] {
  if (isDark) {
    return ["#1a2332", "#252038", "#1e2d2a", "#221a28"];
  }
  return PROFILE_HERO_CARD_GRADIENT_LIGHT;
}

export function profileScreenGradient(isDark: boolean): [string, string, string] {
  if (isDark) return ["#121212", "#1a1a24", "#121212"];
  return PROFILE_SCREEN_GRADIENT;
}

/** Gradientes por tipo de misión (tarjetas). */
export function missionCardGradient(type: string, isDark = false): [string, string] {
  if (isDark) {
    switch (type) {
      case "PLAY_GAMES":
        return ["#1e3a5f", "#2d1a3d"];
      case "EARN_XP":
        return ["#3a2a06", "#422006"];
      case "COMPLETE_ACHIEVEMENT":
        return ["#064e3b", "#134e4a"];
      case "READ_CONTENT":
        return ["#312e81", "#1e1b4b"];
      case "CORRECT_ANSWERS":
        return ["#4c1d95", "#581c87"];
      default:
        return ["#2a2a2a", "#1e1e1e"];
    }
  }
  switch (type) {
    case "PLAY_GAMES":
      return ["#dbeafe", "#e9d5ff"];
    case "EARN_XP":
      return ["#fef9c3", "#fed7aa"];
    case "COMPLETE_ACHIEVEMENT":
      return ["#d1fae5", "#a5f3fc"];
    case "READ_CONTENT":
      return ["#e0e7ff", "#ddd6fe"];
    case "CORRECT_ANSWERS":
      return ["#f3e8ff", "#fce7f3"];
    default:
      return ["#f1f5f9", "#e2e8f0"];
  }
}

export function missionTypeStrongColors(type: string, isDark = false): { iconBg: string; border: string; accent: string } {
  if (isDark) {
    switch (type) {
      case "PLAY_GAMES":
        return { iconBg: "#1e3a5f", border: "#60a5fa", accent: "#93c5fd" };
      case "EARN_XP":
        return { iconBg: "#422006", border: "#fbbf24", accent: "#fde68a" };
      case "COMPLETE_ACHIEVEMENT":
        return { iconBg: "#064e3b", border: "#34d399", accent: "#a7f3d0" };
      case "READ_CONTENT":
        return { iconBg: "#312e81", border: "#a5b4fc", accent: "#c7d2fe" };
      case "CORRECT_ANSWERS":
        return { iconBg: "#581c87", border: "#e879f9", accent: "#f0abfc" };
      default:
        return { iconBg: "#2a2a2a", border: "#737373", accent: "#a3a3a3" };
    }
  }
  switch (type) {
    case "PLAY_GAMES":
      return { iconBg: "#c7d2fe", border: "#6366f1", accent: "#3730a3" };
    case "EARN_XP":
      return { iconBg: "#fef08a", border: "#eab308", accent: "#854d0e" };
    case "COMPLETE_ACHIEVEMENT":
      return { iconBg: "#bbf7d0", border: "#10b981", accent: "#065f46" };
    case "READ_CONTENT":
      return { iconBg: "#c7d2fe", border: "#4f46e5", accent: "#312e81" };
    case "CORRECT_ANSWERS":
      return { iconBg: "#f5d0fe", border: "#c026d3", accent: "#86198f" };
    default:
      return { iconBg: "#e2e8f0", border: "#94a3b8", accent: "#334155" };
  }
}

/** Gradiente suave para títulos de sección (variaciones) — claro. */
export const SECTION_TINTS: [string, string][] = [
  ["#e0e7ff", "#fce7f3"],
  ["#d1fae5", "#e0f2fe"],
  ["#fef3c7", "#ffedd5"],
  ["#ede9fe", "#cffafe"],
];

/** Franja lateral en títulos de sección (perfil) — acentos suaves por bloque. */
export const SECTION_TITLE_ACCENT: readonly string[] = ["#6366f1", "#10b981", "#f59e0b", "#a855f7"];

export function sectionTitleAccent(tintIndex: number): string {
  return SECTION_TITLE_ACCENT[Math.abs(tintIndex) % SECTION_TITLE_ACCENT.length] ?? "#6366f1";
}

export function sectionTints(isDark: boolean): [string, string][] {
  if (isDark) {
    return [
      ["#252530", "#2a2538"],
      ["#1a2a24", "#1e3228"],
      ["#2c2418", "#322818"],
      ["#2a1f30", "#301e38"],
    ];
  }
  return SECTION_TINTS;
}
