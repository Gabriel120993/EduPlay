import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../contexts/ThemeContext";
import type { AppColors } from "../theme/appTheme";
import { space, typography } from "../theme/tokens";

type Props = {
  label: string;
  compact?: boolean;
  /** `GAME_RESULT` | `POST` | `ACHIEVEMENT` — colorea el chip según el tipo. */
  postType?: string;
};

function colorsForPostType(
  postType: string | undefined,
  colors: AppColors,
  isDark: boolean,
): { border: string; bg: string; text: string } {
  switch (postType) {
    case "GAME_RESULT":
      return {
        border: colors.primarySoftBorder,
        bg: colors.primarySoft,
        text: colors.primaryStrong,
      };
    case "POST":
      return {
        border: isDark ? "rgba(52, 211, 153, 0.45)" : "#a7f3d0",
        bg: isDark ? "rgba(16, 185, 129, 0.14)" : "#ecfdf5",
        text: colors.success,
      };
    case "ACHIEVEMENT":
      return {
        border: colors.warnBannerBorder,
        bg: colors.warnBannerBg,
        text: colors.warnBannerText,
      };
    default:
      return {
        border: colors.chipBorder,
        bg: colors.chipBg,
        text: colors.textMuted,
      };
  }
}

/** Chip de tipo de publicación (juego / aprendizaje / logro) en feed y explorar. */
export function FeedPostTypeLabel({ label, compact, postType }: Props) {
  const { colors, mode } = useTheme();
  const isDark = mode === "dark";
  const v = useMemo(() => colorsForPostType(postType, colors, isDark), [postType, colors, isDark]);

  return (
    <View
      style={[
        compact ? styles.compact : styles.base,
        { borderColor: v.border, backgroundColor: v.bg },
      ]}
      accessibilityRole="text"
      accessibilityLabel={label}
    >
      <Text
        style={[compact ? styles.textCompact : styles.text, { color: v.text }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: "flex-start",
    paddingVertical: space.xs,
    paddingHorizontal: space.sm,
    borderRadius: 999,
    borderWidth: 1,
  },
  compact: {
    alignSelf: "flex-start",
    paddingVertical: 2,
    paddingHorizontal: space.xs + 2,
    borderRadius: 999,
    borderWidth: 1,
  },
  text: {
    fontSize: typography.secondary,
    fontWeight: "800",
  },
  textCompact: {
    fontSize: typography.secondary - 2,
    fontWeight: "800",
  },
});
