import { useCallback } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useTheme } from "../contexts/ThemeContext";
import { MINI_GAME_REGISTRY } from "../games/registry";
import type { RootStackParamList } from "../navigation/types";
import { space } from "../theme/tokens";

export function MiniGamesHubScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const openGame = useCallback(
    (gameId: (typeof MINI_GAME_REGISTRY)[number]["id"]) => {
      navigation.navigate("MiniGamePlayer", { gameId });
    },
    [navigation],
  );

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
          onPress={() => navigation.goBack()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Volver"
        >
          <Text style={{ color: colors.link, fontWeight: "900", fontSize: 16 }}>‹ Volver</Text>
        </Pressable>
        <Text
          style={{
            flex: 1,
            marginLeft: space.sm,
            color: colors.text,
            fontWeight: "900",
            fontSize: 18,
          }}
          numberOfLines={1}
        >
          Minijuegos EduPlay
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={{
          padding: space.md,
          paddingBottom: insets.bottom + space.xl,
          gap: space.sm,
        }}
      >
        <Text style={{ color: colors.textMuted, fontWeight: "600", marginBottom: space.sm }}>
          10 experiencias con tutorial (~30 s), 22 niveles, estrellas, ranking entre amigos y
          recompensas cosméticas.
        </Text>
        {MINI_GAME_REGISTRY.map((g) => (
          <Pressable
            key={g.id}
            onPress={() => openGame(g.id)}
            style={{
              padding: space.md,
              borderRadius: 14,
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.borderSubtle,
            }}
            accessibilityRole="button"
            accessibilityLabel={`Abrir ${g.meta.title}`}
          >
            <Text style={{ fontWeight: "900", color: colors.text, fontSize: 16 }}>
              {g.meta.icon} {g.meta.title}
            </Text>
            <Text style={{ color: colors.textSecondary, fontWeight: "600", marginTop: 4 }}>
              {g.meta.subtitle}
            </Text>
            <Text
              style={{ color: colors.textMuted, fontWeight: "700", fontSize: 12, marginTop: 6 }}
            >
              {g.meta.subject} · {g.totalLevels} niveles
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
