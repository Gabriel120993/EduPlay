import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useTheme } from "../contexts/ThemeContext";
import type { RootStackParamList } from "../navigation/types";
import { api, completePlayGame, playGameAction } from "../services/api";
import { space } from "../theme/tokens";

type Card = { position: number; value: string; isRevealed: boolean; isMatched: boolean };

export function MemoryGameScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "MemoryGame">>();
  const { slug, sessionId } = route.params;
  const [cards, setCards] = useState<Card[]>([]);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const startedAt = useState(() => Date.now())[0];

  useEffect(() => {
    void api
      .get(`/api/play-games/${encodeURIComponent(slug)}/${encodeURIComponent(sessionId)}/state`)
      .then((res) => {
        const mem = res.data.state?.state as { cards: Card[] } | undefined;
        if (mem?.cards) setCards(mem.cards);
      })
      .finally(() => setLoading(false));
  }, [slug, sessionId]);

  const reveal = useCallback(
    async (position: number) => {
      const res = await playGameAction(slug, sessionId, { action: "reveal", data: { position } });
      const mem = res.state.state as { cards: Card[] };
      setCards(mem.cards);
      setScore(res.score);
      if (res.event === "no_match") {
        setTimeout(() => {
          void playGameAction(slug, sessionId, { action: "hide_unmatched", data: {} }).then((r) => {
            const m = r.state.state as { cards: Card[] };
            setCards(m.cards);
          });
        }, 800);
      }
      if (res.event === "match_and_finish") {
        const durationMs = Date.now() - startedAt;
        const result = await completePlayGame(slug, sessionId, { durationMs });
        navigation.replace("GameResult", {
          slug,
          score: result.score,
          xpEarned: result.xpEarned,
        });
      }
    },
    [navigation, sessionId, slug, startedAt],
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top, padding: space.sm }}>
      <Text style={{ color: colors.text, fontWeight: "900", marginBottom: space.sm }}>
        Memory Arena · {score} pts
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center" }}>
        {cards.map((c) => (
          <Pressable
            key={c.position}
            disabled={c.isMatched || c.isRevealed}
            onPress={() => void reveal(c.position)}
            style={{
              width: 72,
              height: 72,
              margin: 4,
              borderRadius: 10,
              backgroundColor: c.isRevealed || c.isMatched ? colors.card : colors.primary,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 28 }}>{c.isRevealed || c.isMatched ? c.value : "?"}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
