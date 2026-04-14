import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, Pressable, Text, View } from "react-native";
import type { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { AppIcon } from "../components/AppIcon";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { formatQuizResumeLabel, saveLastPlayedGame } from "../lib/continueLearningStorage";
import { showToast } from "../lib/toastBus";
import { completeQuizSession, getQuizQuestions, notifyMissionRewardsFromApiResponse } from "../services/api";
import {
  playClick,
  playError,
  playSuccess,
  playTimerTick,
  preloadGameFeedbackSounds,
} from "../services/soundManager";
import type { QuizQuestionItem } from "../types/api";
import type { RootStackParamList } from "../navigation/types";
import { screenEdge, space } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "Quiz">;
type QuizDifficulty = "EASY" | "MEDIUM" | "HARD";
type QuizCategory =
  | "astronomy"
  | "math"
  | "science"
  | "history"
  | "geography"
  | "creativity"
  | "mixed";

const AUTO_NEXT_MS = 1000;
const QUESTION_TIMER_SECONDS = 12;
const QUIZ_REPEAT_HISTORY_LIMIT = 30;

function quizSeenKey(category: string, difficulty: "EASY" | "MEDIUM" | "HARD"): string {
  return `quiz_seen:${category.toLowerCase()}:${difficulty}`;
}

async function readSeenQuestionIds(category: string, difficulty: "EASY" | "MEDIUM" | "HARD"): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(quizSeenKey(category, difficulty));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((x) => String(x)) : [];
  } catch {
    return [];
  }
}

async function storeSeenQuestionIds(
  category: string,
  difficulty: "EASY" | "MEDIUM" | "HARD",
  newIds: string[]
): Promise<void> {
  try {
    const previous = await readSeenQuestionIds(category, difficulty);
    const merged = [...new Set([...newIds, ...previous])].slice(0, QUIZ_REPEAT_HISTORY_LIMIT);
    await AsyncStorage.setItem(quizSeenKey(category, difficulty), JSON.stringify(merged));
  } catch {
    // Best effort: si falla, el quiz igualmente funciona.
  }
}

export function QuizScreen({ route }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { viewerUserId } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = route.params;
  const category: QuizCategory = useMemo(() => {
    const raw = params?.category;
    if (
      raw === "astronomy" ||
      raw === "math" ||
      raw === "science" ||
      raw === "history" ||
      raw === "geography" ||
      raw === "creativity" ||
      raw === "mixed"
    ) {
      return raw;
    }
    return "astronomy";
  }, [params?.category]);
  const difficulty: QuizDifficulty = useMemo(() => {
    const raw = params?.difficulty;
    if (raw === "EASY" || raw === "MEDIUM" || raw === "HARD") return raw;
    return "EASY";
  }, [params?.difficulty]);

  const [questions, setQuestions] = useState<QuizQuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(QUESTION_TIMER_SECONDS);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const answerLockRef = useRef(false);
  const correctRef = useRef(0);
  const feedbackScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, []);

  useEffect(() => {
    if (loading || questions.length === 0) return;
    void preloadGameFeedbackSounds();
  }, [loading, questions.length]);

  const loadQuizQuestions = useMemo(
    () => async (mountedRef: { current: boolean }) => {
      setLoading(true);
      setError(null);
      setIndex(0);
      setSelectedIndex(null);
      setSecondsLeft(QUESTION_TIMER_SECONDS);
      try {
        const seenIds = await readSeenQuestionIds(category, difficulty);
        const rows = await getQuizQuestions({ category, difficulty, excludeIds: seenIds });
        if (!mountedRef.current) return;
        setQuestions(rows);
        if (rows.length > 0) {
          void saveLastPlayedGame({
            kind: "quiz",
            category,
            difficulty,
            label: formatQuizResumeLabel(category, difficulty),
          });
        }
        void storeSeenQuestionIds(
          category,
          difficulty,
          rows.map((q) => q.id)
        );
        correctRef.current = 0;
      } catch {
        if (!mountedRef.current) return;
        setError("No se pudo cargar el quiz.");
        setQuestions([]);
      } finally {
        if (!mountedRef.current) return;
        setLoading(false);
      }
    },
    [category, difficulty]
  );

  useEffect(() => {
    const mountedRef = { current: true };
    void loadQuizQuestions(mountedRef);
    return () => {
      mountedRef.current = false;
    };
  }, [loadQuizQuestions]);

  useEffect(() => {
    if (!questions.length || selectedIndex != null) return;
    if (tickRef.current) clearInterval(tickRef.current);
    setSecondsLeft(QUESTION_TIMER_SECONDS);
    tickRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (tickRef.current) clearInterval(tickRef.current);
          onAnswer(-1);
          return 0;
        }
        if (prev <= 4 && prev >= 2) {
          playTimerTick();
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [index, questions.length, selectedIndex]);

  const current = questions[index];
  const progress = useMemo(() => (questions.length > 0 ? `${index + 1}/${questions.length}` : "0/0"), [index, questions.length]);
  const progressPct = useMemo(() => (questions.length > 0 ? (index + 1) / questions.length : 0), [index, questions.length]);
  const timerPct = useMemo(
    () => Math.max(0, Math.min(1, secondsLeft / QUESTION_TIMER_SECONDS)),
    [secondsLeft]
  );

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error || !current) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: screenEdge.horizontal,
          backgroundColor: colors.background,
        }}
      >
        <Text style={{ color: colors.error, fontWeight: "700", textAlign: "center" }}>
          {error ?? "No hay preguntas disponibles."}
        </Text>
      </View>
    );
  }

  const onAnswer = (optionIdx: number) => {
    if (answerLockRef.current || selectedIndex != null) return;
    answerLockRef.current = true;
    if (tickRef.current) clearInterval(tickRef.current);
    if (optionIdx !== -1) playClick();
    setSelectedIndex(optionIdx);
    const gotIt = optionIdx === current.correct;
    Animated.sequence([
      Animated.spring(feedbackScale, { toValue: 1.04, useNativeDriver: true, friction: 5 }),
      Animated.spring(feedbackScale, { toValue: 1, useNativeDriver: true, friction: 5 }),
    ]).start();
    if (gotIt) correctRef.current += 1;
    if (optionIdx === -1) {
      playError();
    } else if (gotIt) {
      setTimeout(() => playSuccess(), 55);
    } else {
      setTimeout(() => playError(), 55);
    }
    timerRef.current = setTimeout(() => {
      setSelectedIndex(null);
      const isLast = index === questions.length - 1;
      if (!isLast) {
        answerLockRef.current = false;
      }
      if (isLast) {
        const finalScore = correctRef.current;
        const totalQ = questions.length;
        void (async () => {
          let xpGained: number | undefined;
          if (viewerUserId) {
            try {
              const res = await completeQuizSession({
                userId: viewerUserId,
                category,
                correct: finalScore,
                total: totalQ,
              });
              xpGained = res.xpGained;
              notifyMissionRewardsFromApiResponse(res.missionRewards);
              if (res.dailyChallengeBonus) {
                showToast(
                  `¡Reto diario! +${res.dailyChallengeBonus.bonusXp} XP${
                    res.dailyChallengeBonus.badgeUnlocked ? " · insignia «Campeón del día»" : ""
                  }`,
                  "success"
                );
              }
            } catch {
              // El resultado local del quiz sigue siendo válido para la UI.
            }
          }
          navigation.replace("QuizResult", {
            score: finalScore,
            total: totalQ,
            xpGained,
            category,
            difficulty,
            gameMode: "quiz",
          });
        })();
        return;
      }
      setIndex((prev) => prev + 1);
    }, AUTO_NEXT_MS);
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top + space.md,
        paddingHorizontal: screenEdge.horizontal,
      }}
    >
      <Text style={{ color: colors.textMuted, fontWeight: "700", marginBottom: space.sm }}>
        {category === "mixed" ? "Modo desafío 🎯" : `Quiz · ${category}`} · {difficulty}
      </Text>
      <Text style={{ color: colors.textMuted, fontWeight: "800", marginBottom: space.xs }}>
        Pregunta {progress}
      </Text>
      <View
        style={{
          height: 8,
          backgroundColor: colors.card,
          borderRadius: 999,
          overflow: "hidden",
          marginBottom: space.sm,
        }}
      >
        <View
          style={{
            width: `${Math.round(progressPct * 100)}%`,
            height: "100%",
            backgroundColor: colors.primary,
          }}
        />
      </View>
      <Text style={{ color: colors.primary, fontWeight: "700", marginBottom: space.sm }}>
        Tiempo: {secondsLeft}s
      </Text>
      <View
        style={{
          height: 6,
          backgroundColor: colors.card,
          borderRadius: 999,
          overflow: "hidden",
          marginBottom: space.md,
        }}
      >
        <View
          style={{
            width: `${Math.round(timerPct * 100)}%`,
            height: "100%",
            backgroundColor: secondsLeft <= 4 ? colors.error : colors.success,
          }}
        />
      </View>
      <Animated.View
        style={{
          backgroundColor: colors.card,
          borderRadius: 14,
          padding: space.md,
          marginBottom: space.md,
          transform: [{ scale: feedbackScale }],
        }}
      >
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: "800", lineHeight: 30 }}>{current.question}</Text>
      </Animated.View>

      <View style={{ gap: space.sm }}>
        {current.options.slice(0, 4).map((opt, optIdx) => {
          const isCorrect = optIdx === current.correct;
          const isSelected = selectedIndex === optIdx;
          const answered = selectedIndex != null;
          const bg = answered
            ? isCorrect
              ? colors.success
              : isSelected
                ? colors.error
                : colors.card
            : colors.card;
          const borderColor = answered
            ? isCorrect
              ? colors.success
              : isSelected
                ? colors.error
                : colors.borderSubtle
            : colors.borderSubtle;
          const textColor = answered && (isCorrect || isSelected) ? "#fff" : colors.text;
          return (
            <Pressable
              key={`${current.id}-${optIdx}`}
              onPress={() => onAnswer(optIdx)}
              disabled={answered}
              style={({ pressed }) => ({
                backgroundColor: bg,
                borderColor,
                borderWidth: 1,
                borderRadius: 12,
                paddingVertical: space.sm + space.xs,
                paddingHorizontal: space.md,
                opacity: pressed ? 0.92 : 1,
              })}
              accessibilityRole="button"
              accessibilityLabel={`Opción ${optIdx + 1}`}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <Text style={{ color: textColor, fontSize: 16, fontWeight: "700", flex: 1 }}>{opt}</Text>
                {answered && isCorrect ? (
                  <AppIcon name="checkmark-circle" size="md" color="#fff" />
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
      {selectedIndex != null ? (
        <View
          style={{
            marginTop: space.md,
            backgroundColor: selectedIndex === current.correct ? colors.success : colors.card,
            borderWidth: 1,
            borderColor: selectedIndex === current.correct ? colors.success : colors.borderSubtle,
            borderRadius: 12,
            padding: space.sm + space.xs,
          }}
        >
          <Text style={{ color: selectedIndex === current.correct ? "#fff" : colors.text, fontWeight: "800" }}>
            {selectedIndex === current.correct ? "¡Correcto! ✅" : "Respuesta correcta ✅"}
          </Text>
          {selectedIndex !== current.correct ? (
            <Text style={{ color: colors.text, marginTop: space.xs, fontWeight: "700" }}>
              {current.options[current.correct] ?? "No disponible"}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
