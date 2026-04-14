import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import type { NativeStackNavigationProp, NativeStackScreenProps } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { AppIcon } from "../components/AppIcon";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { formatVisualResumeLabel, saveLastPlayedGame } from "../lib/continueLearningStorage";
import { showToast } from "../lib/toastBus";
import { completeQuizSession, getVisualQuestions, notifyMissionRewardsFromApiResponse } from "../services/api";
import { playClick, playError, playSuccess, preloadGameFeedbackSounds } from "../services/soundManager";
import type { VisualQuestionItem } from "../types/api";
import type { RootStackParamList } from "../navigation/types";
import { screenEdge, space } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "VisualGame">;
type QuizDifficulty = "EASY" | "MEDIUM" | "HARD";
type VisualCategory =
  | "astronomy"
  | "math"
  | "science"
  | "history"
  | "geography"
  | "creativity"
  | "mixed";

const AUTO_NEXT_MS = 1000;
const QUIZ_REPEAT_HISTORY_LIMIT = 30;
/** Relación ancho/alto del área de imagen (mapas y fotos se ven completos con `contain`). */
const VISUAL_IMAGE_ASPECT_RATIO = 4 / 3;
/** Tope de alto para que en pantallas grandes no ocupe toda la ventana. */
const VISUAL_IMAGE_MAX_HEIGHT = 320;

/** Wikimedia y otros CDNs suelen exigir un User-Agent de navegador; el `Image` de RN no envía cabeceras. */
const REMOTE_IMAGE_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (compatible; EduPlay/1.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
};

function visualSeenKey(category: string, difficulty: QuizDifficulty): string {
  return `visual_seen:${category.toLowerCase()}:${difficulty}`;
}

async function readSeenVisualIds(category: string, difficulty: QuizDifficulty): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(visualSeenKey(category, difficulty));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((x) => String(x)) : [];
  } catch {
    return [];
  }
}

async function storeSeenVisualIds(
  category: string,
  difficulty: QuizDifficulty,
  newIds: string[]
): Promise<void> {
  try {
    const previous = await readSeenVisualIds(category, difficulty);
    const merged = [...new Set([...newIds, ...previous])].slice(0, QUIZ_REPEAT_HISTORY_LIMIT);
    await AsyncStorage.setItem(visualSeenKey(category, difficulty), JSON.stringify(merged));
  } catch {
    // best effort
  }
}

export function VisualGameScreen({ route }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { viewerUserId } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const params = route.params;

  const category: VisualCategory = useMemo(() => {
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

  const [questions, setQuestions] = useState<VisualQuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [imgError, setImgError] = useState(false);
  /** 0 = URI + headers (nativo) / solo URI (web); 1 = solo URI (reintento si Wikimedia rechaza la petición). */
  const [imageSourceAttempt, setImageSourceAttempt] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const answerLockRef = useRef(false);
  const correctRef = useRef(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (loading || questions.length === 0) return;
    void preloadGameFeedbackSounds();
  }, [loading, questions.length]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      setIndex(0);
      setSelectedIndex(null);
      setImgError(false);
      try {
        const seenIds = await readSeenVisualIds(category, difficulty);
        const rows = await getVisualQuestions({ category, difficulty, excludeIds: seenIds });
        if (!mounted) return;
        setQuestions(rows);
        if (rows.length > 0) {
          void saveLastPlayedGame({
            kind: "visual",
            category,
            difficulty,
            label: formatVisualResumeLabel(category, difficulty),
          });
        }
        void storeSeenVisualIds(
          category,
          difficulty,
          rows.map((q) => q.id)
        );
        correctRef.current = 0;
      } catch {
        if (!mounted) return;
        setError("No se pudo cargar el juego visual.");
        setQuestions([]);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [category, difficulty]);

  const question = questions[index];
  const answered = selectedIndex != null;
  const isCorrectSelection = answered && question != null && selectedIndex === question.correct;
  const isIncorrectSelection = answered && question != null && selectedIndex !== question.correct;
  const progress = useMemo(
    () => (questions.length > 0 ? `${index + 1}/${questions.length}` : "0/0"),
    [index, questions.length]
  );

  useEffect(() => {
    setImgError(false);
    setImageSourceAttempt(0);
  }, [question?.id, question?.imageUrl]);

  const imageUri = (question?.imageUrl ?? "").trim();
  const imageSource = useMemo(() => {
    if (!imageUri) return { uri: "" };
    if (Platform.OS === "web") return { uri: imageUri };
    if (imageSourceAttempt === 0) return { uri: imageUri, headers: REMOTE_IMAGE_HEADERS };
    return { uri: imageUri };
  }, [imageUri, imageSourceAttempt]);

  const layoutWidth = Math.max(windowWidth, Dimensions.get("window").width, 320);
  const horizontalPad = screenEdge.horizontal * 2;
  let imageFrameWidth = Math.max(200, layoutWidth - horizontalPad);
  let imageFrameHeight = imageFrameWidth / VISUAL_IMAGE_ASPECT_RATIO;
  if (imageFrameHeight > VISUAL_IMAGE_MAX_HEIGHT) {
    imageFrameHeight = VISUAL_IMAGE_MAX_HEIGHT;
    imageFrameWidth = imageFrameHeight * VISUAL_IMAGE_ASPECT_RATIO;
  }

  const onImageError = useCallback(() => {
    if (Platform.OS !== "web" && imageSourceAttempt === 0 && imageUri.length > 0) {
      setImageSourceAttempt(1);
      return;
    }
    setImgError(true);
  }, [imageSourceAttempt, imageUri]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error || !question) {
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
          {error ?? "No hay preguntas visuales disponibles."}
        </Text>
      </View>
    );
  }

  const onAnswer = (optionIdx: number) => {
    if (answerLockRef.current || selectedIndex != null) return;
    answerLockRef.current = true;
    playClick();
    setSelectedIndex(optionIdx);
    const gotIt = optionIdx === question.correct;
    if (gotIt) correctRef.current += 1;
    if (gotIt) {
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
                mode: "visual",
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
              // resultado local válido
            }
          }
          navigation.replace("QuizResult", {
            score: finalScore,
            total: totalQ,
            xpGained,
            category,
            difficulty,
            gameMode: "visual",
          });
        })();
        return;
      }
      setIndex((prev) => prev + 1);
    }, AUTO_NEXT_MS);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + space.sm }}>
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: screenEdge.horizontal,
          paddingBottom: insets.bottom + space.lg,
          flexGrow: 1,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={{ color: colors.textMuted, fontWeight: "800", marginBottom: space.sm }}>
          Pregunta {progress}
        </Text>

        <View
          style={{
            width: imageFrameWidth,
            height: imageFrameHeight,
            alignSelf: "center",
            borderRadius: 12,
            overflow: "hidden",
            marginBottom: space.lg,
            backgroundColor: colors.card,
            borderWidth: 3,
            borderColor: isCorrectSelection ? colors.success : isIncorrectSelection ? colors.error : colors.borderSubtle,
          }}
        >
          {!imgError && imageUri.length > 0 ? (
            <View style={{ width: "100%", height: "100%" }}>
              <Image
                key={`${question.id}-${imageSourceAttempt}`}
                source={imageSource}
                style={{ width: "100%", height: "100%" }}
                resizeMode="contain"
                onError={onImageError}
                accessibilityLabel="Imagen de la pregunta"
              />
              {isIncorrectSelection ? (
                <View
                  style={{
                    position: "absolute",
                    inset: 0,
                    backgroundColor: "rgba(220, 38, 38, 0.18)",
                  }}
                />
              ) : null}
              {isCorrectSelection ? (
                <View
                  style={{
                    position: "absolute",
                    top: space.sm,
                    right: space.sm,
                    width: 34,
                    height: 34,
                    borderRadius: 999,
                    backgroundColor: colors.success,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <AppIcon name="checkmark" size="md" color="#fff" />
                </View>
              ) : null}
            </View>
          ) : (
            <View
              style={{
                width: "100%",
                height: "100%",
                alignItems: "center",
                justifyContent: "center",
                padding: space.md,
                gap: space.sm,
                backgroundColor: colors.background,
              }}
              accessibilityRole="image"
              accessibilityLabel="Imagen no disponible"
            >
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors.card,
                  borderWidth: 1,
                  borderColor: colors.borderSubtle,
                }}
              >
                <AppIcon name="image-outline" size={40} color={colors.textMuted} />
              </View>
              <Text style={{ color: colors.textMuted, fontWeight: "600", textAlign: "center", fontSize: 15 }}>
                Imagen no disponible
              </Text>
            </View>
          )}
        </View>

        <Text
          style={{
            color: colors.text,
            fontSize: 20,
            fontWeight: "800",
            lineHeight: 28,
            marginBottom: space.md,
          }}
        >
          {question.question}
        </Text>

        <View style={{ gap: space.sm }}>
          {question.options.slice(0, 4).map((opt, optIdx) => {
            const isCorrect = optIdx === question.correct;
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
                key={`${question.id}-${optIdx}`}
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
                accessibilityLabel={`Opción ${optIdx + 1}: ${opt}`}
              >
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <Text style={{ color: textColor, fontSize: 16, fontWeight: "700", flex: 1 }}>{opt}</Text>
                  {answered && isCorrect ? <AppIcon name="checkmark-circle" size="md" color="#fff" /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
