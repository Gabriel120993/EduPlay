import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../contexts/ThemeContext";
import { READ_ONLY_BANNER_TEXT } from "../contexts/ScreenTimeContext";
import { space, typography } from "../theme/tokens";

/** Banner compacto bajo el header cuando el límite de pantalla está alcanzado (modo lectura). */
export function ReadOnlyBanner() {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: colors.warnBannerBg, borderBottomColor: colors.warnBannerBorder },
      ]}
      accessibilityRole="text"
    >
      <Text style={[styles.text, { color: colors.warnBannerText }]}>{READ_ONLY_BANNER_TEXT}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: space.sm + space.xs,
    paddingHorizontal: space.md - space.xs,
  },
  text: {
    fontSize: typography.body,
    fontWeight: "800",
    textAlign: "center",
  },
});
