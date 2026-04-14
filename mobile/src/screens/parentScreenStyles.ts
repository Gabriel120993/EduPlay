import { useMemo } from "react";
import { Platform, StyleSheet } from "react-native";

import { useTheme } from "../contexts/ThemeContext";
import type { AppColors } from "../theme/appTheme";
import { iconSize, space, typography } from "../theme/tokens";

export function useParentStyles() {
  const { colors } = useTheme();
  return useMemo(() => createParentStyles(colors), [colors]);
}

export function createParentStyles(c: AppColors) {
  return StyleSheet.create({
    scroll: {
      flex: 1,
      backgroundColor: c.background,
    },
    scrollContent: {
      padding: space.md,
      paddingBottom: space.xl,
    },
    centered: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: space.md + space.sm,
      backgroundColor: c.background,
    },
    loadingHint: {
      marginTop: space.sm + space.xs,
      fontSize: typography.body,
      color: c.loadingText,
      fontWeight: "600",
    },
    errorText: {
      fontSize: typography.bodyLarge,
      color: c.error,
      textAlign: "center",
      lineHeight: typography.bodyLarge + space.sm,
    },
    mono: {
      fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
      fontSize: typography.body - 1,
      color: c.text,
    },
    retry: {
      marginTop: space.md,
      fontSize: typography.bodyLarge,
      fontWeight: "700",
      color: c.link,
    },
    parentBanner: {
      backgroundColor: c.card,
      borderRadius: space.md,
      padding: space.md,
      marginBottom: space.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.borderSubtle,
    },
    parentEmail: {
      fontSize: typography.bodyLarge,
      fontWeight: "800",
      color: c.text,
    },
    dateLine: {
      marginTop: space.xs + space.xs - 2,
      fontSize: typography.body - 1,
      color: c.textMuted,
      fontWeight: "600",
    },
    dangerDeleteBtn: {
      marginTop: space.sm,
      alignSelf: "flex-start",
      paddingVertical: space.sm + space.xs,
      paddingHorizontal: space.md,
      borderRadius: 10,
      backgroundColor: c.error,
    },
    dangerDeleteBtnPressed: {
      opacity: 0.92,
    },
    dangerDeleteBtnDisabled: {
      opacity: 0.55,
    },
    dangerDeleteBtnText: {
      fontSize: typography.body,
      fontWeight: "800",
      color: c.textOnPrimary,
    },
    analyticsCta: {
      marginTop: space.md,
      alignSelf: "flex-start",
      paddingVertical: space.sm,
      paddingHorizontal: space.md,
      borderRadius: 10,
      backgroundColor: c.primarySoft,
      borderWidth: 1,
      borderColor: c.primarySoftBorder,
    },
    analyticsCtaText: {
      fontSize: typography.body,
      fontWeight: "800",
      color: c.primary,
    },
    premiumCta: {
      marginTop: space.md,
      alignSelf: "flex-start",
      paddingVertical: space.sm,
      paddingHorizontal: space.md,
      borderRadius: 10,
      backgroundColor: c.primarySoft,
      borderWidth: 1,
      borderColor: c.primarySoftBorder,
    },
    premiumCtaText: {
      fontSize: typography.body,
      fontWeight: "800",
      color: c.primary,
    },
    muted: {
      fontSize: typography.body,
      color: c.textMuted,
    },
    childCard: {
      backgroundColor: c.card,
      borderRadius: space.md + space.xs,
      padding: space.md,
      marginBottom: space.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.borderSubtle,
      ...Platform.select({
        ios: {
          shadowColor: c.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 10,
        },
        android: { elevation: 2 },
        default: {},
      }),
    },
    childHeader: {
      marginBottom: space.md - space.xs,
    },
    childName: {
      fontSize: typography.title + 1,
      fontWeight: "800",
      color: c.text,
    },
    childMeta: {
      marginTop: space.xs,
      fontSize: typography.body,
      color: c.textMuted,
      fontWeight: "600",
    },
    sectionLabel: {
      fontSize: typography.body - 1,
      fontWeight: "800",
      color: c.ghostText,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    sectionSpaced: {
      marginTop: space.md + space.xs,
    },
    timeRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "baseline",
      marginTop: space.sm,
      marginBottom: space.sm,
    },
    timeUsed: {
      fontSize: typography.title + 4,
      fontWeight: "800",
      color: c.primaryStrong,
    },
    timeLimit: {
      fontSize: typography.body,
      fontWeight: "700",
      color: c.textMuted,
    },
    progressTrack: {
      height: 10,
      borderRadius: 999,
      backgroundColor: c.mode === "dark" ? "#333333" : "#e2e8f0",
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      borderRadius: 999,
      backgroundColor: c.primary,
    },
    progressHint: {
      marginTop: space.xs + space.xs - 2,
      fontSize: typography.secondary,
      fontWeight: "600",
      color: c.textSecondary,
    },
    subHint: {
      marginTop: space.xs + space.xs - 2,
      fontSize: typography.body,
      color: c.ghostText,
      fontWeight: "600",
    },
    activitySubtitle: {
      marginTop: space.md - space.xs,
      marginBottom: space.sm,
      fontSize: typography.bodyLarge,
      fontWeight: "800",
      color: c.text,
    },
    emptyLine: {
      fontSize: typography.body,
      color: c.textSecondary,
      fontStyle: "italic",
      marginBottom: space.sm,
    },
    activityRow: {
      paddingVertical: space.sm + space.xs,
      paddingHorizontal: space.sm + space.xs,
      backgroundColor: c.mode === "dark" ? c.cardElevated : "#f8fafc",
      borderRadius: space.sm + space.xs,
      marginBottom: space.sm,
      borderWidth: 1,
      borderColor: c.border,
    },
    activityRowHeader: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: space.xs,
      marginBottom: space.xs,
    },
    activityBadge: {
      fontSize: typography.secondary - 1,
      fontWeight: "800",
      color: c.primary,
    },
    activityText: {
      fontSize: typography.body,
      color: c.textBody,
      lineHeight: typography.body + space.sm,
    },
    activityDate: {
      marginTop: space.xs + space.xs - 2,
      fontSize: typography.secondary - 1,
      fontWeight: "600",
      color: c.textSecondary,
    },
    achievementRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: space.sm + space.xs,
      paddingHorizontal: space.sm + space.xs,
      backgroundColor: c.mode === "dark" ? c.cardElevated : "#f8fafc",
      borderRadius: space.sm + space.xs,
      marginBottom: space.sm,
      borderWidth: 1,
      borderColor: c.border,
    },
    achievementIcon: {
      fontSize: iconSize.md + space.xs,
      marginRight: space.sm + space.xs,
    },
    achievementBody: {
      flex: 1,
      minWidth: 0,
    },
    achievementTitle: {
      fontSize: typography.bodyLarge,
      fontWeight: "700",
      color: c.text,
    },
    achievementRarity: {
      marginTop: space.xs / 2,
      fontSize: typography.secondary,
      fontWeight: "800",
    },
    toggleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: space.sm + space.xs,
      paddingVertical: space.sm,
      gap: space.sm + space.xs,
    },
    toggleLabels: {
      flex: 1,
      minWidth: 0,
    },
    toggleTitle: {
      fontSize: typography.bodyLarge,
      fontWeight: "700",
      color: c.text,
    },
    toggleSub: {
      marginTop: space.xs / 2,
      fontSize: typography.body - 1,
      color: c.textMuted,
      fontWeight: "500",
    },
    legalFooter: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      alignItems: "center",
      gap: space.sm,
      marginTop: space.lg,
      paddingBottom: space.md,
    },
    legalFooterLink: {
      fontSize: typography.secondary,
      fontWeight: "700",
      color: c.link,
    },
    legalFooterMuted: {
      fontSize: typography.secondary,
      color: c.textMuted,
    },
  });
}
