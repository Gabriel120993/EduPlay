import { StyleSheet, Text, View } from "react-native";

import { categoryDisplayLabel, getCategoryUi } from "../lib/contentCategoryUi";
import { space, typography } from "../theme/tokens";

import { AppIcon } from "./AppIcon";

type Props = {
  category: string | undefined;
  compact?: boolean;
  /** En fila junto al tipo de post (sin margen superior extra). */ inline?: boolean;
};

/** Chip de categoría (feed / explorar): borde y fondo del sistema de color por categoría. */
export function PostCategoryTag({ category, compact, inline }: Props) {
  const ui = getCategoryUi(category);
  if (!ui) return null;
  return (
    <View
      style={[
        compact ? (inline ? styles.compactInline : styles.compact) : styles.base,
        {
          borderColor: ui.highlight,
          backgroundColor: ui.softBg,
          borderWidth: compact ? 2 : 2,
        },
      ]}
      accessibilityRole="text"
      accessibilityLabel={`Categoría ${ui.label}`}
    >
      <AppIcon name={ui.icon} color={ui.accent} size={compact ? "sm" : "md"} />
      <Text style={[compact ? styles.labelCompact : styles.label, { color: ui.accent }]}>
        {categoryDisplayLabel(ui)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: space.xs + space.xs,
    gap: space.xs + space.xs,
    paddingVertical: space.xs,
    paddingHorizontal: space.sm + space.xs,
    borderRadius: 999,
  },
  label: {
    fontSize: typography.secondary,
    fontWeight: "800",
  },
  compactInline: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: 0,
    gap: space.xs,
    paddingVertical: 2,
    paddingHorizontal: space.xs + space.xs,
    borderRadius: 999,
  },
  compact: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: space.xs,
    gap: space.xs,
    paddingVertical: 2,
    paddingHorizontal: space.xs + space.xs,
    borderRadius: 999,
  },
  labelCompact: {
    fontSize: typography.secondary - 2,
    fontWeight: "800",
  },
});
