import type { ThemeMode } from "./appTheme";

/**
 * Colores del chat pensados para menores: tonos suaves (cielo / menta), buen contraste de texto.
 * Independiente del tema global para mantener siempre una lectura clara en esta pantalla.
 */
export type KidChatPalette = {
  screenBg: string;
  cardBg: string;
  cardBorder: string;
  cardPressedBg: string;
  titleText: string;
  metaText: string;
  previewText: string;
  avatarFriendBg: string;
  avatarFriendText: string;
  timeText: string;
  accentDot: string;
  peerBubbleBg: string;
  peerBubbleBorder: string;
  peerText: string;
  mineBubbleBg: string;
  mineBubbleBorder: string;
  mineText: string;
  blockedMineBg: string;
  blockedMineBorder: string;
  blockedMineText: string;
  flaggedBannerBg: string;
  flaggedBannerBorder: string;
  flaggedBannerText: string;
  composerBg: string;
  composerTopBorder: string;
  inputBg: string;
  inputBorder: string;
  inputText: string;
  placeholder: string;
  sendBg: string;
  sendBgDisabled: string;
  sendIcon: string;
  sendIconDisabled: string;
  emptyEmojiBg: string;
  hintText: string;
};

export function kidChatPalette(mode: ThemeMode): KidChatPalette {
  if (mode === "dark") {
    return {
      screenBg: "#0c1222",
      cardBg: "#152238",
      cardBorder: "rgba(125, 211, 252, 0.35)",
      cardPressedBg: "#1a2d45",
      titleText: "#f0f9ff",
      metaText: "#94a3b8",
      previewText: "#cbd5e1",
      avatarFriendBg: "#1e3a5f",
      avatarFriendText: "#bae6fd",
      timeText: "#94a3b8",
      accentDot: "#fbbf24",
      peerBubbleBg: "#172554",
      peerBubbleBorder: "#3b82f6",
      peerText: "#e0f2fe",
      mineBubbleBg: "#134e4a",
      mineBubbleBorder: "#2dd4bf",
      mineText: "#ecfdf5",
      blockedMineBg: "#3f1f1f",
      blockedMineBorder: "#f87171",
      blockedMineText: "#fecaca",
      flaggedBannerBg: "#422006",
      flaggedBannerBorder: "#f59e0b",
      flaggedBannerText: "#fde68a",
      composerBg: "#111827",
      composerTopBorder: "rgba(125, 211, 252, 0.2)",
      inputBg: "#1e293b",
      inputBorder: "#334155",
      inputText: "#f8fafc",
      placeholder: "#94a3b8",
      sendBg: "#0891b2",
      sendBgDisabled: "#334155",
      sendIcon: "#ffffff",
      sendIconDisabled: "#64748b",
      emptyEmojiBg: "#1e3a5f",
      hintText: "#94a3b8",
    };
  }

  return {
    screenBg: "#e0f2fe",
    cardBg: "#ffffff",
    cardBorder: "rgba(14, 165, 233, 0.25)",
    cardPressedBg: "#f0f9ff",
    titleText: "#0c4a6e",
    metaText: "#0369a1",
    previewText: "#475569",
    avatarFriendBg: "#bae6fd",
    avatarFriendText: "#075985",
    timeText: "#64748b",
    accentDot: "#f59e0b",
    peerBubbleBg: "#ffffff",
    peerBubbleBorder: "#38bdf8",
    peerText: "#0c4a6e",
    mineBubbleBg: "#ccfbf1",
    mineBubbleBorder: "#2dd4bf",
    mineText: "#134e4a",
    blockedMineBg: "#fef2f2",
    blockedMineBorder: "#f87171",
    blockedMineText: "#991b1b",
    flaggedBannerBg: "#fffbeb",
    flaggedBannerBorder: "#fcd34d",
    flaggedBannerText: "#92400e",
    composerBg: "#ffffff",
    composerTopBorder: "rgba(14, 165, 233, 0.2)",
    inputBg: "#f0f9ff",
    inputBorder: "#7dd3fc",
    inputText: "#0f172a",
    placeholder: "#64748b",
    sendBg: "#0891b2",
    sendBgDisabled: "#cbd5e1",
    sendIcon: "#ffffff",
    sendIconDisabled: "#94a3b8",
    emptyEmojiBg: "#e0f2fe",
    hintText: "#64748b",
  };
}
