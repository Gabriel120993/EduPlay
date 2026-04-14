import { useMemo } from "react";
import { Platform, StyleSheet } from "react-native";

import { useTheme } from "../contexts/ThemeContext";
import type { AppColors } from "../theme/appTheme";
import { radius, screenEdge, space, typography } from "../theme/tokens";

export function useQuizResultStyles() {
  const { colors } = useTheme();
  return useMemo(() => createQuizResultStyles(colors), [colors]);
}

function createQuizResultStyles(c: AppColors) {
  return StyleSheet.create({
    scroll: {
      flex: 1,
      backgroundColor: c.background,
    },
    scrollContent: {
      paddingHorizontal: screenEdge.horizontal,
      paddingBottom: space.xl + space.md,
      alignItems: "stretch",
    },
    circleWrap: {
      alignSelf: "center",
      marginTop: space.md,
      marginBottom: space.md,
    },
    circleOuter: {
      width: 170,
      height: 170,
      borderRadius: 999,
      borderWidth: 12,
      borderColor: c.card,
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      overflow: "hidden",
    },
    circleFill: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
    },
    scoreInCircle: {
      color: c.text,
      fontSize: 40,
      fontWeight: "900",
      zIndex: 1,
    },
    starsRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: space.xs,
      marginBottom: space.md,
    },
    feedbackText: {
      color: c.text,
      fontSize: 20,
      fontWeight: "700",
      textAlign: "center",
      marginBottom: space.lg,
    },
    statsCard: {
      borderRadius: radius.sheet,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      backgroundColor: c.cardElevated,
      padding: space.md,
      marginBottom: space.lg,
      ...Platform.select({
        ios: {
          shadowColor: c.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.12,
          shadowRadius: 10,
        },
        android: { elevation: 3 },
        default: {},
      }),
    },
    statRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: space.sm,
    },
    statRowDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.borderSubtle,
    },
    statLabel: {
      fontSize: typography.body,
      fontWeight: "700",
      color: c.textMuted,
    },
    statValue: {
      fontSize: typography.bodyLarge + 4,
      fontWeight: "900",
      color: c.text,
    },
    statValueAccent: {
      fontSize: typography.bodyLarge + 4,
      fontWeight: "900",
      color: c.primaryStrong,
    },
    statHint: {
      marginTop: space.xs,
      fontSize: typography.secondary,
      color: c.textMuted,
      fontWeight: "600",
    },
    buttonCol: {
      gap: space.sm + space.xs,
    },
    btnPrimary: {
      backgroundColor: c.primary,
      paddingVertical: space.md - space.xs,
      paddingHorizontal: space.md,
      borderRadius: radius.cardSm,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 48,
    },
    btnPrimaryPressed: {
      opacity: 0.9,
    },
    btnPrimaryDisabled: {
      opacity: 0.65,
    },
    btnPrimaryText: {
      color: c.textOnPrimary,
      fontWeight: "800",
      fontSize: typography.bodyLarge,
    },
    btnSecondary: {
      backgroundColor: c.ghostBg,
      borderWidth: 2,
      borderColor: c.primarySoftBorder,
      paddingVertical: space.md - space.xs,
      paddingHorizontal: space.md,
      borderRadius: radius.cardSm,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 48,
    },
    btnSecondaryPressed: {
      opacity: 0.92,
    },
    btnSecondaryText: {
      color: c.primaryStrong,
      fontWeight: "800",
      fontSize: typography.bodyLarge,
    },
    btnGhost: {
      paddingVertical: space.md - space.xs,
      alignItems: "center",
    },
    btnGhostText: {
      color: c.link,
      fontWeight: "800",
      fontSize: typography.body,
    },
    loadingRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: space.sm,
    },
    suggestSection: {
      marginBottom: space.lg,
    },
    suggestHeading: {
      fontSize: typography.bodyLarge + 1,
      fontWeight: "800",
      color: c.text,
      marginBottom: space.sm + space.xs,
    },
    suggestCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: space.sm,
      padding: space.md - space.xs,
      borderRadius: radius.cardSm,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      backgroundColor: c.card,
      marginBottom: space.sm,
    },
    suggestCardPressed: {
      opacity: 0.92,
      transform: [{ scale: 0.995 }],
    },
    suggestIconWrap: {
      width: 44,
      height: 44,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.primarySoft,
    },
    suggestTextCol: {
      flex: 1,
      minWidth: 0,
    },
    suggestKicker: {
      fontSize: typography.secondary - 1,
      fontWeight: "800",
      color: c.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    suggestTitle: {
      fontSize: typography.body,
      fontWeight: "800",
      color: c.text,
      lineHeight: typography.body + 4,
    },
    suggestHint: {
      marginTop: 4,
      fontSize: typography.secondary,
      fontWeight: "600",
      color: c.textMuted,
    },
  });
}
