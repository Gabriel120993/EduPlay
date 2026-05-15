import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../contexts/ThemeContext";
import { space, typography } from "../theme/tokens";
import { AppIcon } from "./AppIcon";
import { BrandLogo } from "./BrandLogo";

type Props = {
  title: string;
  subtitle?: string;
  /** Emoji a la izquierda del título. `false` = sin prefijo (el título ya trae emoji al final). */
  emoji?: string | false;
};

/**
 * Empty state con personalidad de marca:
 * - formas redondeadas
 * - paleta de marca (primary/soft)
 * - logo pequeño como mascot
 */
export function BrandEmptyState({ title, subtitle, emoji }: Props) {
  const { colors } = useTheme();
  const prefix = emoji === false ? "" : emoji === undefined ? "" : `${emoji} `;
  const showSparkleIcon = emoji === undefined;

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: colors.primarySoft,
          borderColor: colors.primarySoftBorder,
        },
      ]}
      accessibilityRole="summary"
      accessibilityLabel={title}
    >
      <BrandLogo width={56} height={56} />
      <View style={styles.titleRow}>
        {showSparkleIcon ? (
          <AppIcon name="sparkles" color={colors.primaryStrong} size="md" />
        ) : null}
        <Text style={[styles.title, { color: colors.primaryStrong }]}>
          {prefix}
          {title}
        </Text>
      </View>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: space.lg,
    paddingHorizontal: space.md,
    gap: space.sm,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.sm,
    flexWrap: "wrap",
    paddingHorizontal: space.xs,
  },
  title: {
    textAlign: "center",
    fontSize: typography.bodyLarge,
    fontWeight: "800",
    lineHeight: typography.bodyLarge + 4,
    flexShrink: 1,
  },
  subtitle: {
    textAlign: "center",
    fontSize: typography.body,
    lineHeight: typography.body + 4,
    maxWidth: 380,
  },
});
