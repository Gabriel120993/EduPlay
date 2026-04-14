/**
 * Temas claro / oscuro para la app (menor).
 * Oscuro: fondo ~#0b, tarjetas ~#26 (más claras que el fondo), texto #f8 y grises legibles.
 */

export type ThemeMode = "light" | "dark";

export type AppColors = {
  mode: ThemeMode;
  background: string;
  card: string;
  cardElevated: string;
  text: string;
  textBody: string;
  textMuted: string;
  textSecondary: string;
  border: string;
  borderSubtle: string;
  primary: string;
  primaryStrong: string;
  primarySoft: string;
  primarySoftBorder: string;
  tabBar: string;
  tabBarBorder: string;
  headerBg: string;
  headerTint: string;
  error: string;
  errorSoft: string;
  errorBorder: string;
  /** Respuestas correctas, estados positivos. */
  success: string;
  link: string;
  /** Texto sobre botones primarios (siempre claro). */
  textOnPrimary: string;
  shadow: string;
  avatarBg: string;
  avatarPh: string;
  avatarPhText: string;
  chipBorder: string;
  chipBg: string;
  chipActiveBg: string;
  chipActiveBorder: string;
  chipText: string;
  chipTextActive: string;
  reactionIdle: string;
  reactionActive: string;
  reactionActiveBorder: string;
  reactionReadonlyBg: string;
  /** Iconos de reacción inactivos (contraste en claro/oscuro). */
  reactionIconMuted: string;
  modalOverlay: string;
  modalCard: string;
  inputBorder: string;
  inputText: string;
  ghostBg: string;
  ghostText: string;
  warnBannerBg: string;
  warnBannerBorder: string;
  warnBannerText: string;
  placeholder: string;
  exploreHeroTitle: string;
  exploreHeroSubtitle: string;
  recWrapBg: string;
  recWrapBorder: string;
  recGlow: string;
  recTitle: string;
  recSubtitle: string;
  recBlockLabel: string;
  recGameChipBg: string;
  recGameChipBorder: string;
  recGameReadOnlyBg: string;
  recGameReadOnlyBorder: string;
  recGameName: string;
  recGameMeta: string;
  recPostCardBg: string;
  recPostCardBorder: string;
  recPostContent: string;
  friendsBannerBg: string;
  friendsBannerBorder: string;
  friendsBannerText: string;
  fetchingBannerBg: string;
  fetchingBannerBorder: string;
  fetchingBannerText: string;
  highlightRingBg: string;
  highlightRingBorder: string;
  loadingText: string;
  badgeIconBorder: string;
  categoryFilterTitle: string;
  emptyText: string;
  footerMuted: string;
  exploreMeta: string;
  exploreContent: string;
  modalGhostPressed: string;
};

const light: Omit<AppColors, "mode"> = {
  /** Más frío que la tarjeta blanca para jerarquía clara. */
  background: "#e5e9f2",
  card: "#ffffff",
  cardElevated: "#fafbff",
  text: "#0f172a",
  textBody: "#1e293b",
  textMuted: "#64748b",
  textSecondary: "#94a3b8",
  border: "#e2e8f0",
  borderSubtle: "rgba(15, 23, 42, 0.06)",
  primary: "#4f46e5",
  primaryStrong: "#4338ca",
  primarySoft: "#eef2ff",
  primarySoftBorder: "#c7d2fe",
  tabBar: "#ffffff",
  tabBarBorder: "rgba(15, 23, 42, 0.08)",
  headerBg: "#ffffff",
  headerTint: "#0f172a",
  error: "#b91c1c",
  errorSoft: "#fef2f2",
  errorBorder: "#fecaca",
  success: "#15803d",
  link: "#4f46e5",
  textOnPrimary: "#ffffff",
  shadow: "#0f172a",
  avatarBg: "#e2e8f0",
  avatarPh: "#cbd5e1",
  avatarPhText: "#475569",
  chipBorder: "#e2e8f0",
  chipBg: "#ffffff",
  chipActiveBg: "#eef2ff",
  chipActiveBorder: "#6366f1",
  chipText: "#475569",
  chipTextActive: "#1d4ed8",
  reactionIdle: "#f8fafc",
  reactionActive: "#bfdbfe",
  reactionActiveBorder: "#2563eb",
  reactionReadonlyBg: "#f1f5f9",
  reactionIconMuted: "#94a3b8",
  modalOverlay: "rgba(15, 23, 42, 0.45)",
  modalCard: "#ffffff",
  inputBorder: "#e2e8f0",
  inputText: "#0f172a",
  ghostBg: "#f1f5f9",
  ghostText: "#475569",
  warnBannerBg: "#fef3c7",
  warnBannerBorder: "#fcd34d",
  warnBannerText: "#92400e",
  placeholder: "#94a3b8",
  exploreHeroTitle: "#4338ca",
  exploreHeroSubtitle: "#7c3aed",
  recWrapBg: "#f5f3ff",
  recWrapBorder: "#c4b5fd",
  recGlow: "rgba(167, 139, 250, 0.18)",
  recTitle: "#5b21b6",
  recSubtitle: "#7c3aed",
  recBlockLabel: "#6d28d9",
  recGameChipBg: "#ffffff",
  recGameChipBorder: "#ddd6fe",
  recGameReadOnlyBg: "#f8fafc",
  recGameReadOnlyBorder: "#e2e8f0",
  recGameName: "#1e1b4b",
  recGameMeta: "#6d28d9",
  recPostCardBg: "#ffffff",
  recPostCardBorder: "#e9d5ff",
  recPostContent: "#334155",
  friendsBannerBg: "#eff6ff",
  friendsBannerBorder: "#bfdbfe",
  friendsBannerText: "#1e40af",
  fetchingBannerBg: "#eff6ff",
  fetchingBannerBorder: "#bfdbfe",
  fetchingBannerText: "#1d4ed8",
  highlightRingBg: "rgba(124, 58, 237, 0.08)",
  highlightRingBorder: "#7c3aed",
  loadingText: "#64748b",
  badgeIconBorder: "#e2e8f0",
  categoryFilterTitle: "#64748b",
  emptyText: "#64748b",
  footerMuted: "#64748b",
  exploreMeta: "#94a3b8",
  exploreContent: "#1e293b",
  modalGhostPressed: "rgba(0,0,0,0.06)",
};

const dark: Omit<AppColors, "mode"> = {
  /** Fondo y tarjetas más separados para lectura y bordes visibles (WCAG-friendly). */
  background: "#0e0e12",
  card: "#2a2a32",
  cardElevated: "#34343e",
  /** Texto principal: máximo contraste sobre card. */
  text: "#fafafa",
  textBody: "#eceef2",
  /** Metadatos e iconos secundarios: más claros que antes en oscuro. */
  textMuted: "#d8dce4",
  textSecondary: "#c5cad4",
  border: "#4b4b56",
  borderSubtle: "rgba(255, 255, 255, 0.16)",
  /** Azul un poco más claro para acento activo e iconos filled. */
  primary: "#7cb4ff",
  primaryStrong: "#b8d9ff",
  primarySoft: "#1e3a5f",
  primarySoftBorder: "#3b82f6",
  tabBar: "#1a1a20",
  tabBarBorder: "#4b4b56",
  headerBg: "#1a1a20",
  headerTint: "#f8fafc",
  error: "#fca5a5",
  errorSoft: "#3f1f1f",
  errorBorder: "#7f1d1d",
  success: "#86efac",
  link: "#7cb4ff",
  /** Sobre `primary` (#7cb4ff) el blanco mantiene buen contraste. */
  textOnPrimary: "#ffffff",
  shadow: "#000000",
  avatarBg: "#3f3f46",
  avatarPh: "#52525b",
  avatarPhText: "#e4e4e7",
  chipBorder: "#5c5c68",
  chipBg: "#32323c",
  chipActiveBg: "#1e3a5f",
  chipActiveBorder: "#7cb4ff",
  chipText: "#c4c9d2",
  chipTextActive: "#b8d9ff",
  reactionIdle: "#34343c",
  reactionActive: "#1e3a5f",
  reactionActiveBorder: "#7cb4ff",
  reactionReadonlyBg: "#32323a",
  reactionIconMuted: "#a8b0bd",
  modalOverlay: "rgba(0, 0, 0, 0.78)",
  modalCard: "#34343e",
  inputBorder: "#52525b",
  inputText: "#f8fafc",
  ghostBg: "#34343c",
  ghostText: "#c4c9d2",
  warnBannerBg: "#422006",
  warnBannerBorder: "#b45309",
  warnBannerText: "#fde68a",
  placeholder: "#9ca3af",
  exploreHeroTitle: "#ddd6fe",
  exploreHeroSubtitle: "#c4b5fd",
  recWrapBg: "#1e1830",
  recWrapBorder: "#7c3aed",
  recGlow: "rgba(124, 58, 237, 0.22)",
  recTitle: "#f3e8ff",
  recSubtitle: "#ddd6fe",
  recBlockLabel: "#c4b5fd",
  recGameChipBg: "#2e2e36",
  recGameChipBorder: "#6d28d9",
  recGameReadOnlyBg: "#1a1624",
  recGameReadOnlyBorder: "#52525b",
  recGameName: "#faf5ff",
  recGameMeta: "#ddd6fe",
  recPostCardBg: "#2a2a32",
  recPostCardBorder: "#6d28d9",
  recPostContent: "#e8eaef",
  friendsBannerBg: "#1e3a5f",
  friendsBannerBorder: "#3b82f6",
  friendsBannerText: "#bfdbfe",
  fetchingBannerBg: "#1e3a5f",
  fetchingBannerBorder: "#3b82f6",
  fetchingBannerText: "#bfdbfe",
  highlightRingBg: "rgba(124, 58, 237, 0.22)",
  highlightRingBorder: "#a78bfa",
  loadingText: "#c5cad4",
  badgeIconBorder: "#52525b",
  categoryFilterTitle: "#c4c9d2",
  emptyText: "#aeb4bf",
  footerMuted: "#9ca3af",
  exploreMeta: "#aeb4bf",
  exploreContent: "#e8eaef",
  modalGhostPressed: "rgba(255,255,255,0.1)",
};

export const lightThemeColors: AppColors = { mode: "light", ...light };
export const darkThemeColors: AppColors = { mode: "dark", ...dark };

export function colorsForMode(mode: ThemeMode): AppColors {
  return mode === "dark" ? darkThemeColors : lightThemeColors;
}
