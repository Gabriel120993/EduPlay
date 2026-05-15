import type { ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../../contexts/ThemeContext";
import type { MiniGameMeta } from "../types";
import { FriendsLeaderboardStrip } from "./FriendsLeaderboardStrip";
import { space } from "../../theme/tokens";

type Props = {
  meta: MiniGameMeta;
  levelIndex: number;
  totalLevels: number;
  /** Estrellas ya logradas en este nivel */
  bestStars?: number;
  children: ReactNode;
  footer?: ReactNode;
  onBack: () => void;
};

export function MiniGameChrome({
  meta,
  levelIndex,
  totalLevels,
  bestStars,
  children,
  footer,
  onBack,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: space.md,
          paddingBottom: space.sm,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderSubtle,
        }}
      >
        <Pressable
          onPress={onBack}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Text style={{ color: colors.link, fontWeight: "900", fontSize: 16 }}>‹ Volver</Text>
        </Pressable>
        <View style={{ flex: 1, marginLeft: space.sm }}>
          <Text style={{ color: colors.text, fontWeight: "900" }} numberOfLines={1}>
            {meta.icon} {meta.title}
          </Text>
          <Text style={{ color: colors.textMuted, fontWeight: "700", fontSize: 12 }}>
            Nivel {levelIndex + 1}/{totalLevels}
            {bestStars ? ` · mejor: ${"⭐".repeat(bestStars)}` : ""}
          </Text>
        </View>
      </View>
      <View style={{ flex: 1, paddingHorizontal: space.md, paddingTop: space.sm }}>{children}</View>
      <View
        style={{
          paddingHorizontal: space.md,
          paddingBottom: insets.bottom + space.md,
          paddingTop: space.sm,
          borderTopWidth: 1,
          borderTopColor: colors.borderSubtle,
          gap: space.sm,
        }}
      >
        <FriendsLeaderboardStrip />
        {footer}
      </View>
    </View>
  );
}
