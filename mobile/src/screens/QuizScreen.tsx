import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, Pressable, Text, View } from "react-native";
import type { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

import { AppIcon } from "../components/AppIcon";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { formatQuizResumeLabel, saveLastPlayedGame } from "../lib/continueLearningStorage";
import { showToast } from "../lib/toastBus";
import {
  completeQuizSession,
  getQuizQuestions,
  getQuizWalletApi,
  notifyMissionRewardsFromApiResponse,
  unlockQuizHintApi,
} from "../services/api";
import {
  playClick,
  playError,
  playSuccess,
  playTimerTick,
  preloadGameFeedbackSounds,
} from "../services/soundManager";
import type { QuizKnowledgeArea, QuizQuestionItem, QuizQuestionType } from "../types/api";
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

const DEFAULT_TIMER = 12;
const AUTO_NEXT_MS = 1100;
const AUTO_NEXT_MS_EXPL = 2400;
const QUIZ_REPEAT_HISTORY_LIMIT = 30;

function quizSeenKey(parts: { category: string; difficulty: QuizDifficulty; area?: string }): string {
  if (parts.area) return `quiz_seen:area:${parts.area}:${parts.difficulty}`;
  return `quiz_seen:${parts.category.toLowerCase()}:${parts.difficulty}`;
}

async function readSeenQuestionIds(key: string): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((x) => String(x)) : [];
  } catch {
    return [];
  }
}

async function storeSeenQuestionIds(key: string, newIds: string[]): Promise<void> {
  try {
    const previous = await readSeenQuestionIds(key);
    const merged = [...new Set([...newIds, ...previous])].slice(0, QUIZ_REPEAT_HISTORY_LIMIT);
    await AsyncStorage.setItem(key, JSON.stringify(merged));
  } catch {
    // best effort
  }
}

function qType(q: QuizQuestionItem): QuizQuestionType {
  return q.questionType ?? "MULTIPLE_CHOICE";
}

function triggerHaptic(kind: "success" | "error" | "light"): void {
  try {
    if (kind === "success") {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (kind === "error") {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  } catch {
    // sin módulo nativo o web
  }
}

function buildRecommendations(score: number, total: number, area?: QuizKnowledgeArea): string[] {
  const pct = total > 0 ? score / total : 0;
  const rec: string[] = [];
  if (pct < 0.5) {
    rec.push("Repasá las explicaciones de las preguntas falladas y probá el modo flashcards.");
  }
  if (pct >= 0.8) {
    rec.push("¡Excelente! Subí la dificultad o activá el modo adaptativo en otra área.");
  }
  if (area === "mathematics") {
    rec.push("Practicá operaciones en papel 10 minutos al día.");
  }
  if (rec.length === 0) {
    rec.push("Jugá el desafío del día para mantener la racha.");
  }
  return rec.slice(0, 4);
}

export function QuizScreen({ route }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { viewerUserId } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const params = route.params;

  const knowledgeArea = params?.knowledgeArea;
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
    return knowledgeArea ? "math" : "astronomy";
  }, [params?.category, knowledgeArea]);

  const difficulty: QuizDifficulty = useMemo(() => {
    const raw = params?.difficulty;
    if (raw === "EASY" || raw === "MEDIUM" || raw === "HARD") return raw;
    return "EASY";
  }, [params?.difficulty]);

  const timerSecondsParam = params?.timerSeconds;
  const useTimer = timerSecondsParam !== 0;
  const questionTimerSeconds =
    typeof timerSecondsParam === "number" && timerSecondsParam > 0 ? timerSecondsParam : DEFAULT_TIMER;

  const maxLives = params?.challengeLives ?? 0;
  const adaptive = Boolean(params?.adaptive);

  const storageKey = useMemo(
    () =>
      quizSeenKey({
        category,
        difficulty,
        ...(knowledgeArea ? { area: knowledgeArea } : {}),
      }),
    [category, difficulty, knowledgeArea]
  );

  const [questions, setQuestions] = useState<QuizQuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(questionTimerSeconds);
  const [orderTap, setOrderTap] = useState<number[]>([]);
  const [livesLeft, setLivesLeft] = useState(maxLives > 0 ? maxLives : 0);
  const [hintUsedForQuestionId, setHintUsedForQuestionId] = useState<string | null>(null);
  const [coins, setCoins] = useState<number | null>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onAnswerRef = useRef<(optionIdx: number) => void>(() => {});
  const answerLockRef = useRef(false);
  const correctRef = useRef(0);
  const wrongIdsRef = useRef<string[]>([]);
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

  useEffect(() => {
    if (!viewerUserId) return;
    void (async () => {
      try {
        const w = await getQuizWalletApi();
        setCoins(w.coins);
      } catch {
        setCoins(null);
      }
    })();
  }, [viewerUserId]);

  const loadQuizQuestions = useMemo(
    () => async (mountedRef: { current: boolean }) => {
      setLoading(true);
      setError(null);
      setIndex(0);
      setSelectedIndex(null);
      setOrderTap([]);
      setSecondsLeft(questionTimerSeconds);
      try {
        const seenIds = await readSeenQuestionIds(storageKey);
        const rows = knowledgeArea
          ? await getQuizQuestions({
              area: knowledgeArea,
              difficulty,
              topicSlug: params?.topicSlug,
              quizLevel: params?.quizLevel,
              excludeIds: seenIds,
              adaptive,
            })
          : await getQuizQuestions({
              category,
              difficulty,
              excludeIds: seenIds,
            });
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
          storageKey,
          rows.map((q) => q.id)
        );
        correctRef.current = 0;
        wrongIdsRef.current = [];
      } catch {
        if (!mountedRef.current) return;
        setError("No se pudo cargar el quiz.");
        setQuestions([]);
      } finally {
        if (!mountedRef.current) return;
        setLoading(false);
      }
    },
    [
      adaptive,
      category,
      difficulty,
      knowledgeArea,
      params?.quizLevel,
      params?.topicSlug,
      questionTimerSeconds,
      storageKey,
    ]
  );

  useEffect(() => {
    const mountedRef = { current: true };
    void loadQuizQuestions(mountedRef);
    return () => {
      mountedRef.current = false;
    };
  }, [loadQuizQuestions]);

  const current = questions[index];

  const progress = useMemo(() => (questions.length > 0 ? `${index + 1}/${questions.length}` : "0/0"), [index, questions.length]);
  const progressPct = useMemo(() => (questions.length > 0 ? (index + 1) / questions.length : 0), [index, questions.length]);
  const timerPct = useMemo(
    () => Math.max(0, Math.min(1, secondsLeft / questionTimerSeconds)),
    [secondsLeft, questionTimerSeconds]
  );

  const finishSession = useCallback(
    (finalScore: number, totalQ: number) => {
      void (async () => {
        let xpGained: number | undefined;
        if (viewerUserId) {
          try {
            const res = await completeQuizSession({
              userId: viewerUserId,
              category,
              correct: finalScore,
              total: totalQ,
              knowledgeArea,
              wrongQuestionIds: wrongIdsRef.current,
            });
            xpGained = res.xpGained;
            if (typeof res.quizCoins === "number") setCoins(res.quizCoins);
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
            // seguimos con UI local
          }
        }
        const recommendations = buildRecommendations(finalScore, totalQ, knowledgeArea);
        navigation.replace("QuizResult", {
          score: finalScore,
          total: totalQ,
          xpGained,
          category,
          difficulty,
          gameMode: "quiz",
          recommendations,
          knowledgeArea,
        });
      })();
    },
    [viewerUserId, category, knowledgeArea, navigation]
  );

  const advanceOrFinish = useCallback(
    (_gotIt: boolean, afterMs: number) => {
      timerRef.current = setTimeout(() => {
        setSelectedIndex(null);
        setOrderTap([]);
        setIndex((prev) => {
          const isLast = prev === questions.length - 1;
          if (!isLast) {
            answerLockRef.current = false;
            return prev + 1;
          }
          const finalScore = correctRef.current;
          const totalQ = questions.length;
          finishSession(finalScore, totalQ);
          return prev;
        });
      }, afterMs);
    },
    [finishSession, questions.length]
  );

  const onAnswer = (optionIdx: number) => {
    if (!current) return;
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
    if (gotIt) {
      correctRef.current += 1;
      triggerHaptic("success");
      setTimeout(() => playSuccess(), 55);
    } else {
      if (current?.id) wrongIdsRef.current.push(current.id);
      if (maxLives > 0 && livesLeft > 0) {
        setLivesLeft((v) => Math.max(0, v - 1));
      }
      triggerHaptic("error");
      if (optionIdx === -1) {
        playError();
      } else {
        setTimeout(() => playError(), 55);
      }
    }
    const expl = (current.explanation ?? "").trim();
    const delay = expl.length > 0 ? AUTO_NEXT_MS_EXPL : AUTO_NEXT_MS;
    if (maxLives > 0 && !gotIt && livesLeft <= 1) {
      advanceOrFinish(false, delay);
      return;
    }
    advanceOrFinish(gotIt, delay);
  };

  onAnswerRef.current = onAnswer;

  const onOrderTap = (optIdx: number) => {
    if (!current || answerLockRef.current || selectedIndex != null) return;
    const seq = current.orderTapSequence;
    if (!seq || seq.length === 0) return;
    if (orderTap.includes(optIdx)) return;
    triggerHaptic("light");
    const next = [...orderTap, optIdx];
    setOrderTap(next);
    if (next.length < seq.length) return;
    answerLockRef.current = true;
    if (tickRef.current) clearInterval(tickRef.current);
    const ok = next.every((v, i) => v === seq[i]);
    setSelectedIndex(ok ? current.correct : -2);
    if (ok) {
      correctRef.current += 1;
      triggerHaptic("success");
      playSuccess();
    } else {
      if (current.id) wrongIdsRef.current.push(current.id);
      if (maxLives > 0) setLivesLeft((v) => Math.max(0, v - 1));
      triggerHaptic("error");
      playError();
    }
    const expl = (current.explanation ?? "").trim();
    const delay = expl.length > 0 ? AUTO_NEXT_MS_EXPL : AUTO_NEXT_MS;
    advanceOrFinish(ok, delay);
  };

  useEffect(() => {
    if (loading || questions.length === 0 || selectedIndex != null) return;
    const cur = questions[index];
    if (!cur || qType(cur) === "ORDER" || !useTimer) return;
    if (tickRef.current) clearInterval(tickRef.current);
    setSecondsLeft(questionTimerSeconds);
    tickRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (tickRef.current) clearInterval(tickRef.current);
          onAnswerRef.current(-1);
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
  }, [loading, questions, index, selectedIndex, useTimer, questionTimerSeconds]);

  useEffect(() => {
    setHintUsedForQuestionId(null);
  }, [index]);

  const onHint = useCallback(async () => {
    if (!current || !viewerUserId) {
      showToast("Iniciá sesión para usar pistas con monedas.", "error");
      return;
    }
    if (hintUsedForQuestionId === current.id) {
      showToast("Ya usaste una pista en esta pregunta.", "error");
      return;
    }
    try {
      const r = await unlockQuizHintApi(current.id);
      setHintUsedForQuestionId(current.id);
      setCoins(r.coinsRemaining);
      Alert.alert("Pista", r.hintText);
    } catch {
      showToast("No se pudo desbloquear la pista.", "error");
    }
  }, [current, hintUsedForQuestionId, viewerUserId]);

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

  const qt = qType(current);
  const answered = selectedIndex != null;
  const explanation = (current.explanation ?? "").trim();
  const isCorrectAnswer = answered && selectedIndex === current.correct;
  const isWrongAnswer = answered && selectedIndex !== null && selectedIndex !== current.correct;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top + space.md,
        paddingHorizontal: screenEdge.horizontal,
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: space.sm }}>
        <Text style={{ color: colors.textMuted, fontWeight: "700", flex: 1 }}>
          {knowledgeArea ? `Área · ${knowledgeArea}` : category === "mixed" ? "Modo desafío 🎯" : `Quiz · ${category}`} ·{" "}
          {difficulty}
        </Text>
        {coins != null ? (
          <Text style={{ color: colors.primary, fontWeight: "800" }}>🪙 {coins}</Text>
        ) : null}
      </View>
      {maxLives > 0 ? (
        <Text style={{ color: colors.error, fontWeight: "800", marginBottom: space.xs }}>
          Vidas: {"❤️".repeat(Math.max(0, livesLeft)) || "—"}
        </Text>
      ) : null}
      <Text style={{ color: colors.textMuted, fontWeight: "800", marginBottom: space.xs }}>Pregunta {progress}</Text>
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
      {useTimer && qt !== "ORDER" ? (
        <>
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
        </>
      ) : (
        <Text style={{ color: colors.textMuted, fontWeight: "600", marginBottom: space.md }}>
          Sin temporizador en esta sesión
        </Text>
      )}

      {current.readingPassage ? (
        <View
          style={{
            backgroundColor: colors.ghostBg,
            borderRadius: 12,
            padding: space.sm,
            marginBottom: space.sm,
            borderWidth: 1,
            borderColor: colors.borderSubtle,
          }}
        >
          <Text style={{ color: colors.textSecondary, fontWeight: "700", marginBottom: space.xs }}>Lectura</Text>
          <Text style={{ color: colors.text, fontWeight: "600", lineHeight: 22 }}>{current.readingPassage}</Text>
        </View>
      ) : null}

      <View style={{ flexDirection: "row", justifyContent: "flex-end", marginBottom: space.sm }}>
        <Pressable
          onPress={() => void onHint()}
          disabled={answered}
          style={({ pressed }) => ({
            opacity: answered ? 0.4 : pressed ? 0.85 : 1,
            paddingVertical: 6,
            paddingHorizontal: 10,
            borderRadius: 999,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.borderSubtle,
          })}
        >
          <Text style={{ color: colors.primary, fontWeight: "800" }}>
            💡 Pista ({current.hintCost ?? 5} 🪙)
          </Text>
        </Pressable>
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
        {qt === "ORDER" ? (
          <Text style={{ color: colors.textMuted, marginTop: space.sm, fontWeight: "700" }}>
            Tocá las opciones en el orden correcto (de menor a mayor en esta pregunta).
          </Text>
        ) : null}
      </Animated.View>

      {qt === "ORDER" ? (
        <View style={{ gap: space.sm }}>
          {current.options.map((opt, optIdx) => {
            const tapped = orderTap.includes(optIdx);
            return (
              <Pressable
                key={`${current.id}-ord-${optIdx}`}
                onPress={() => onOrderTap(optIdx)}
                disabled={answered || tapped}
                style={({ pressed }) => ({
                  backgroundColor: tapped ? colors.primarySoft : colors.card,
                  borderColor: tapped ? colors.primary : colors.borderSubtle,
                  borderWidth: 1,
                  borderRadius: 12,
                  paddingVertical: space.sm + space.xs,
                  paddingHorizontal: space.md,
                  opacity: pressed ? 0.92 : 1,
                })}
              >
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: "800" }}>{opt}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <View style={{ gap: space.sm }}>
          {current.options.map((opt, optIdx) => {
            const isCorrect = optIdx === current.correct;
            const isSelected = selectedIndex === optIdx;
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
                  {answered && isCorrect ? <AppIcon name="checkmark-circle" size="md" color="#fff" /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}

      {answered ? (
        <View
          style={{
            marginTop: space.md,
            backgroundColor: isCorrectAnswer ? colors.success : colors.card,
            borderWidth: 1,
            borderColor: isCorrectAnswer ? colors.success : colors.borderSubtle,
            borderRadius: 12,
            padding: space.sm + space.xs,
          }}
        >
          <Text style={{ color: isCorrectAnswer ? "#fff" : colors.text, fontWeight: "800" }}>
            {isCorrectAnswer ? "¡Correcto! ✅" : qt === "ORDER" ? "Orden incorrecto" : "Revisá la respuesta correcta"}
          </Text>
          {isWrongAnswer && qt !== "ORDER" ? (
            <Text style={{ color: colors.text, marginTop: space.xs, fontWeight: "700" }}>
              {current.options[current.correct] ?? "—"}
            </Text>
          ) : null}
          {explanation.length > 0 ? (
            <Text
              style={{
                color: isCorrectAnswer ? "#f8fafc" : colors.textSecondary,
                marginTop: space.sm,
                fontWeight: "600",
                lineHeight: 22,
              }}
            >
              {explanation}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
