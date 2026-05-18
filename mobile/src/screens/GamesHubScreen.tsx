import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useTheme } from "../contexts/ThemeContext";
import type { RootStackParamList } from "../navigation/types";
import { fetchPlayGames, type PlayGameListItem } from "../services/api";
import { space } from "../theme/tokens";

const CATEGORY_LABEL: Record<string, string> = {
  MEMORY: "Memoria",
  LOGIC: "Lógica",
  MATH: "Matemáticas",
  GENERAL_KNOWLEDGE: "Cultura",
};

export function GamesHubScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [games, setGames] = useState<PlayGameListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchPlayGames();
        if (!cancelled) setGames(res.games);
      } catch {
        if (!cancelled) setError("No se pudieron cargar los juegos.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const openGame = useCallback(
    (slug: string) => {
      navigation.navigate("GameDetail", { slug });
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
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} accessibilityRole="button">
          <Text style={{ color: colors.link, fontWeight: "900", fontSize: 16 }}>‹ Volver</Text>
        </Pressable>
        <Text style={{ flex: 1, marginLeft: space.sm, color: colors.text, fontWeight: "900", fontSize: 18 }}>
          Juegos con amigos
        </Text>
        <Pressable onPress={() => navigation.navigate("PlayGameChallenges")} accessibilityRole="button">
          <Text style={{ color: colors.link, fontWeight: "700" }}>Desafíos</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: space.xl }} color={colors.primary} />
      ) : error ? (
        <Text style={{ color: colors.danger, padding: space.md }}>{error}</Text>
      ) : (
        <ScrollView contentContainerStyle={{ padding: space.md, paddingBottom: insets.bottom + space.xl }}>
          {games.map((g) => (
            <Pressable
              key={g.id}
              onPress={() => openGame(g.slug)}
              style={{
                marginBottom: space.md,
                padding: space.md,
                borderRadius: 16,
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.borderSubtle,
              }}
              accessibilityRole="button"
              accessibilityLabel={g.name}
            >
              <Text style={{ color: colors.text, fontWeight: "900", fontSize: 17 }}>{g.name}</Text>
              <Text style={{ color: colors.textMuted, marginTop: 4 }} numberOfLines={2}>
                {g.description}
              </Text>
              <View style={{ flexDirection: "row", marginTop: space.sm, gap: space.sm }}>
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "700" }}>
                  {CATEGORY_LABEL[g.category] ?? g.category}
                </Text>
                {g.isPremium ? (
                  <Text style={{ color: colors.warning, fontSize: 12, fontWeight: "700" }}>Premium</Text>
                ) : null}
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
