import type { AchievementRarity } from "../types/api";

export type RarityBadgeVisual = {
  accent: string;
  border: string;
  softBg: string;
  borderWidth: number;
  /** Sombra iOS (raras+); COMMON sin resplandor. */
  iosShadow?: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
  };
  /** Elevación Android aproximada por rareza. */
  androidElevation: number;
};

/**
 * Colores por rareza (COMMON gris, RARE azul, EPIC violeta, LEGENDARY oro).
 * Resplandor / borde más marcado desde RARE hacia arriba.
 */
export function getRarityBadgeVisual(
  rarity: AchievementRarity,
  isDark: boolean,
): RarityBadgeVisual {
  const r: AchievementRarity =
    rarity === "RARE" || rarity === "EPIC" || rarity === "LEGENDARY" || rarity === "COMMON"
      ? rarity
      : "COMMON";
  switch (r) {
    case "COMMON":
      return {
        accent: isDark ? "#94a3b8" : "#64748b",
        border: isDark ? "#475569" : "#cbd5e1",
        softBg: isDark ? "rgba(148, 163, 184, 0.14)" : "rgba(100, 116, 139, 0.12)",
        borderWidth: 1,
        androidElevation: 1,
      };
    case "RARE":
      return {
        accent: "#3b82f6",
        border: "#60a5fa",
        softBg: isDark ? "rgba(59, 130, 246, 0.22)" : "rgba(59, 130, 246, 0.16)",
        borderWidth: 2,
        iosShadow: {
          shadowColor: "#3b82f6",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: isDark ? 0.45 : 0.35,
          shadowRadius: 10,
        },
        androidElevation: 4,
      };
    case "EPIC":
      return {
        accent: "#a855f7",
        border: "#c084fc",
        softBg: isDark ? "rgba(168, 85, 247, 0.24)" : "rgba(168, 85, 247, 0.18)",
        borderWidth: 2,
        iosShadow: {
          shadowColor: "#9333ea",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: isDark ? 0.55 : 0.42,
          shadowRadius: 14,
        },
        androidElevation: 6,
      };
    case "LEGENDARY":
      return {
        accent: "#eab308",
        border: "#facc15",
        softBg: isDark ? "rgba(234, 179, 8, 0.22)" : "rgba(250, 204, 21, 0.2)",
        borderWidth: 2,
        iosShadow: {
          shadowColor: "#eab308",
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: isDark ? 0.65 : 0.5,
          shadowRadius: 16,
        },
        androidElevation: 8,
      };
  }
}
