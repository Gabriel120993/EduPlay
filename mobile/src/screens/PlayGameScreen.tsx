import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RouteProp } from "@react-navigation/native";

import { useTheme } from "../contexts/ThemeContext";
import type { RootStackParamList } from "../navigation/types";
import { completePlayGame, playGameAction, startPlayGame } from "../services/api";
import { space } from "../theme/tokens";

/** Pantalla unificada: patrones, cierto/fake y flujo genérico vía API. */
export function PlayGameScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "PlayGame">>();
  const { slug, difficulty = 3 } = route.params;
  const startedAt = useRef(Date.now());
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [state, setState] = useState<Record<string, unknown> | null>(null);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await startPlayGame(slug, { difficulty });
        if (!cancelled) {
          setSessionId(res.sessionId);
          setState(res.state);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, difficulty]);

  const finish = useCallback(async () => {
    if (!sessionId) return;
    const durationMs = Date.now() - startedAt.current;
    const result = await completePlayGame(slug, sessionId, { durationMs });
    navigation.replace("GameResult", {
      slug,
      score: result.score,
      xpEarned: result.xpEarned,
    });
  }, [navigation, sessionId, slug]);

  const answerPattern = useCallback(
    async (optionIndex: number) => {
      if (!sessionId) return;
      const res = await playGameAction(slug, sessionId, {
        action: "answer",
        data: { optionIndex, difficulty },
      });
      setState(res.state);
      setScore(res.score);
      if (Number(res.state.index) >= 5) {
        await finish();
      }
    },
    [sessionId, slug, difficulty, finish],
  );

  const answerFact = useCallback(
    async (isTrue: boolean) => {
      if (!sessionId) return;
      const res = await playGameAction(slug, sessionId, {
        action: "check",
        data: { isTrue },
      });
      setState(res.state);
      setScore(res.score);
      if (Number(res.state.index) >= 5) {
        await finish();
      }
    },
    [sessionId, slug, finish],
  );

  if (loading || !state) {
    return (
      <View style={{ flex: 1, justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (slug === "patrones-rapidos" && state.engine === "patterns") {
    const round = state.round as {
      sequence: (number | string)[];
      options: (number | string)[];
    };
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top, padding: space.md }}>
        <Text style={{ color: colors.text, fontWeight: "900", fontSize: 20 }}>Patrones rápidos</Text>
        <Text style={{ color: colors.textMuted, marginVertical: space.md }}>
          Secuencia: {round.sequence.join(" → ")} → ?
        </Text>
        {round.options.map((opt, i) => (
          <Pressable
            key={String(opt)}
            onPress={() => void answerPattern(i)}
            style={{
              marginBottom: space.sm,
              padding: space.md,
              borderRadius: 12,
              backgroundColor: colors.card,
            }}
          >
            <Text style={{ color: colors.text, fontWeight: "700", textAlign: "center" }}>{String(opt)}</Text>
          </Pressable>
        ))}
        <Text style={{ color: colors.textMuted, marginTop: space.md }}>Puntos: {score}</Text>
      </View>
    );
  }

  if (slug === "cierto-o-fake" && state.engine === "factcheck") {
    const facts = state.facts as { id: string; statement: string }[];
    const idx = Number(state.index ?? 0);
    const fact = facts[idx];
    if (!fact) {
      void finish();
      return null;
    }
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top, padding: space.md }}>
        <Text style={{ color: colors.text, fontWeight: "900" }}>¿Cierto o fake?</Text>
        <Text style={{ color: colors.text, marginVertical: space.lg, fontSize: 18, lineHeight: 26 }}>
          {fact.statement}
        </Text>
        <Pressable
          onPress={() => void answerFact(true)}
          style={{ backgroundColor: colors.primary, padding: space.md, borderRadius: 12, marginBottom: space.sm }}
        >
          <Text style={{ color: "#fff", fontWeight: "900", textAlign: "center" }}>Cierto</Text>
        </Pressable>
        <Pressable
          onPress={() => void answerFact(false)}
          style={{ backgroundColor: colors.card, padding: space.md, borderRadius: 12 }}
        >
          <Text style={{ color: colors.text, fontWeight: "900", textAlign: "center" }}>Fake</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: space.md, backgroundColor: colors.background }}>
      <Text style={{ color: colors.text }}>
        Abrí este juego desde el detalle. Slug: {slug}
      </Text>
      <Pressable onPress={() => navigation.navigate("MemoryGame", { slug, sessionId: sessionId! })}>
        <Text style={{ color: colors.link, marginTop: space.md }}>Memory Arena →</Text>
      </Pressable>
    </View>
  );
}
