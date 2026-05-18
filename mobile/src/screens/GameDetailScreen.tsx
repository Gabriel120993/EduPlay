import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";

import { useTheme } from "../contexts/ThemeContext";
import type { RootStackParamList } from "../navigation/types";
import { fetchPlayGameDetail, startPlayGame } from "../services/api";
import { space } from "../theme/tokens";

export function GameDetailScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "GameDetail">>();
  const { slug } = route.params;
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [howToPlay, setHowToPlay] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchPlayGameDetail(slug);
        if (!cancelled) {
          setName(res.game.name);
          setHowToPlay(res.howToPlay);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const play = useCallback(async () => {
    if (slug === "memory-arena") {
      const res = await startPlayGame(slug, { difficulty: 3 });
      navigation.navigate("MemoryGame", { slug, sessionId: res.sessionId });
      return;
    }
    navigation.navigate("PlayGame", { slug, difficulty: 3 });
  }, [navigation, slug]);

  const leaderboard = useCallback(() => {
    navigation.navigate("PlayGameLeaderboard", { slug, gameName: name || slug });
  }, [navigation, slug, name]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <Pressable onPress={() => navigation.goBack()} style={{ padding: space.md }}>
        <Text style={{ color: colors.link, fontWeight: "900" }}>‹ Volver</Text>
      </Pressable>
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: space.md }}>
          <Text style={{ color: colors.text, fontWeight: "900", fontSize: 22 }}>{name}</Text>
          <Text style={{ color: colors.textMuted, marginTop: space.md, lineHeight: 22 }}>{howToPlay}</Text>
          <Pressable
            onPress={play}
            style={{
              marginTop: space.xl,
              backgroundColor: colors.primary,
              padding: space.md,
              borderRadius: 14,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "900" }}>Jugar</Text>
          </Pressable>
          <Pressable onPress={leaderboard} style={{ marginTop: space.md, alignItems: "center" }}>
            <Text style={{ color: colors.link, fontWeight: "700" }}>Ver ranking</Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}
