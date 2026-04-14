import { useMemo } from "react";
import { StyleSheet } from "react-native";

import { useTheme } from "../contexts/ThemeContext";
import type { AppColors } from "../theme/appTheme";
import { space, typography } from "../theme/tokens";

export function useAuthScreenStyles() {
  const { colors } = useTheme();
  return useMemo(() => createAuthStyles(colors), [colors]);
}

function createAuthStyles(c: AppColors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: c.background,
      padding: space.md + space.sm,
    },
    card: {
      width: "100%",
      maxWidth: 420,
      backgroundColor: c.card,
      borderRadius: space.md,
      padding: space.md + space.xs,
      borderWidth: 1,
      borderColor: c.border,
      gap: space.sm + space.xs,
    },
    title: {
      fontSize: typography.title,
      fontWeight: "800",
      color: c.text,
    },
    /** Centra logo + eslogan: la tarjeta usa stretch y los hijos con ancho fijo quedan pegados a la izquierda si no van dentro de este bloque. */
    brandHeader: {
      width: "100%",
      alignItems: "center",
      marginBottom: space.xs,
      gap: space.sm,
    },
    taglineBlock: {
      alignItems: "center",
      paddingHorizontal: space.sm,
      gap: 2,
    },
    taglineMark: {
      fontSize: typography.title - 2,
      fontWeight: "800",
      color: c.text,
      textAlign: "center",
      letterSpacing: 0.4,
    },
    taglineSub: {
      fontSize: typography.bodyLarge,
      fontWeight: "600",
      color: c.primary,
      textAlign: "center",
      lineHeight: typography.bodyLarge + 4,
      letterSpacing: 0.15,
    },
    subtitle: {
      fontSize: typography.body,
      color: c.ghostText,
      marginBottom: space.sm + space.xs,
      lineHeight: typography.body + space.sm,
    },
    /** Flujo de aprobación parental antes del primer acceso del menor. */
    childConsentNote: {
      fontSize: typography.body - 1,
      color: c.textMuted,
      lineHeight: typography.body + space.xs,
      marginBottom: space.sm,
    },
    choiceSectionLabel: {
      fontSize: typography.secondary,
      fontWeight: "800",
      color: c.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: space.sm,
    },
    choiceList: {
      gap: space.sm + space.xs,
      marginBottom: space.xs,
    },
    choiceCard: {
      borderWidth: 2,
      borderColor: c.border,
      borderRadius: space.sm + space.xs,
      paddingHorizontal: space.md - space.xs,
      paddingVertical: space.sm + space.xs,
      backgroundColor: c.mode === "dark" ? c.cardElevated : "#f8fafc",
    },
    choiceCardOn: {
      borderColor: c.primary,
      backgroundColor: c.mode === "dark" ? c.primarySoft : "#eff6ff",
    },
    choiceCardHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: space.sm,
    },
    choiceTitle: {
      fontSize: typography.bodyLarge,
      fontWeight: "800",
      color: c.textBody,
      flex: 1,
    },
    choiceTitleOn: {
      color: c.primaryStrong,
    },
    choiceCheck: {
      fontSize: typography.bodyLarge,
      fontWeight: "800",
      color: c.primary,
    },
    choiceDesc: {
      marginTop: space.xs + space.xs - 2,
      fontSize: typography.body - 1,
      fontWeight: "500",
      color: c.textMuted,
      lineHeight: typography.body + space.xs,
    },
    input: {
      borderWidth: 1,
      borderColor: c.inputBorder,
      borderRadius: space.sm + space.xs,
      paddingHorizontal: space.sm + space.xs,
      paddingVertical: space.sm + space.xs,
      fontSize: typography.bodyLarge,
      color: c.inputText,
      backgroundColor: c.mode === "dark" ? c.cardElevated : undefined,
    },
    error: {
      color: c.error,
      fontSize: typography.body - 1,
      lineHeight: typography.body + space.xs,
    },
    submitBtn: {
      marginTop: space.xs,
      backgroundColor: c.primary,
      borderRadius: space.sm + space.xs,
      alignItems: "center",
      justifyContent: "center",
      minHeight: space.md * 2 + space.sm + space.xs,
    },
    submitBtnDisabled: {
      opacity: 0.6,
    },
    submitText: {
      color: c.textOnPrimary,
      fontSize: typography.bodyLarge,
      fontWeight: "700",
    },
    switchBtn: {
      alignSelf: "center",
      marginTop: space.xs,
      padding: space.sm,
    },
    switchText: {
      color: c.link,
      fontWeight: "700",
      fontSize: typography.body,
    },
    pressed: {
      opacity: 0.9,
    },
    rememberRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: space.sm,
      paddingVertical: space.xs,
    },
    rememberTitle: {
      fontSize: typography.body,
      fontWeight: "700",
      color: c.text,
    },
    rememberDesc: {
      marginTop: space.xs - 2,
      fontSize: typography.secondary,
      fontWeight: "500",
      color: c.textMuted,
      lineHeight: typography.body + space.xs - 2,
    },
    themeHint: {
      marginTop: space.sm,
      paddingTop: space.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    themeHintLabel: {
      fontSize: typography.secondary,
      fontWeight: "700",
      color: c.textMuted,
      marginBottom: space.xs,
    },
    legalFooter: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      alignItems: "center",
      gap: space.sm,
      marginTop: space.md,
      paddingTop: space.sm,
    },
    legalLink: {
      fontSize: typography.secondary,
      fontWeight: "700",
      color: c.link,
    },
    legalDot: {
      fontSize: typography.secondary,
      color: c.textMuted,
    },
    legalAcceptRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: space.sm + space.xs,
      marginTop: space.xs,
      paddingVertical: space.xs,
    },
    legalCheckboxOuter: {
      width: 24,
      height: 24,
      borderRadius: 6,
      borderWidth: 2,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },
    legalAcceptText: {
      flex: 1,
      fontSize: typography.body - 1,
      fontWeight: "500",
      color: c.textBody,
      lineHeight: typography.body + space.xs,
    },
    legalInlineLink: {
      fontWeight: "800",
      color: c.link,
      textDecorationLine: "underline",
    },
  });
}
