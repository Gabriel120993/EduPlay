import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppIcon } from "../components/AppIcon";
import { useTheme } from "../contexts/ThemeContext";
import { getCategoryUi } from "../lib/contentCategoryUi";
import { pickSuggestedOtherCategory } from "../lib/quizResultSuggestions";
import type { RootStackParamList } from "../navigation/types";
import { getEducationalContent } from "../services/api";
import type { EducationalContentItem } from "../types/api";
import { space } from "../theme/tokens";
import { playError, playReward, playSuccess } from "../services/soundManager";
import { useQuizResultStyles } from "./quizResultScreenStyles";

type Props = NativeStackScreenProps<RootStackParamList, "QuizResult">;

function getQuizFeedbackMessage(score: number, total: number): string {
  if (total <= 0) return "¡Bien! Vas por buen camino 👍";
  if (score === total) return "¡Perfecto! 🏆 Sos un experto";
  const pct = score / total;
  if (pct < 0.4) return "Podés mejorar 💪 Intentá de nuevo";
  if (pct < 0.7) return "¡Bien! Vas por buen camino 👍";
  return "¡Muy bien! 🚀";
}

export function QuizResultScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useQuizResultStyles();
  const { score, total, xpGained, category, difficulty, gameMode, recommendations } = route.params;
  const message = getQuizFeedbackMessage(score, total);
  const pct = total > 0 ? Math.max(0, Math.min(1, score / total)) : 0;
  const stars = Math.max(1, Math.round(pct * 5));
  const fillColor = pct >= 0.7 ? colors.success : pct >= 0.4 ? colors.primary : colors.error;

  const [suggestedContent, setSuggestedContent] = useState<EducationalContentItem | null>(null);
  const [suggestedContentLoading, setSuggestedContentLoading] = useState(true);
  const resultSoundPlayed = useRef(false);

  useEffect(() => {
    if (resultSoundPlayed.current) return;
    resultSoundPlayed.current = true;
    if (total <= 0) {
      playSuccess();
      return;
    }
    if (score === total) playReward();
    else if (pct < 0.4) playError();
    else playSuccess();
  }, [score, total, pct]);

  const otherGameCategory = useMemo(() => pickSuggestedOtherCategory(category), [category]);
  const otherGameUi = useMemo(() => getCategoryUi(otherGameCategory), [otherGameCategory]);
  const headlineUi = useMemo(() => getCategoryUi(category), [category]);
  const suggestHeading = `Te puede interesar esto ${headlineUi?.emoji ?? "✨"}`;

  const diffLabel = difficulty ?? "EASY";
  const otherGameTitle = useMemo(() => {
    const label = otherGameUi?.label ?? otherGameCategory;
    return gameMode === "visual"
      ? `Juego visual · ${label} · ${diffLabel}`
      : `Quiz · ${label} · ${diffLabel}`;
  }, [gameMode, otherGameCategory, otherGameUi?.label, diffLabel]);

  useEffect(() => {
    let cancelled = false;
    setSuggestedContentLoading(true);
    void (async () => {
      try {
        const c = category?.trim().toLowerCase();
        const list =
          c && c !== "mixed"
            ? await getEducationalContent({ category: c })
            : await getEducationalContent();
        if (!cancelled) setSuggestedContent(list[0] ?? null);
      } catch {
        if (!cancelled) setSuggestedContent(null);
      } finally {
        if (!cancelled) setSuggestedContentLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [category]);

  const onPlayAgain = useCallback(() => {
    const cat = category ?? "astronomy";
    const diff = difficulty ?? "EASY";
    if (gameMode === "visual") {
      navigation.replace("VisualGame", { category: cat, difficulty: diff });
    } else {
      navigation.replace("Quiz", { category: cat, difficulty: diff });
    }
  }, [category, difficulty, gameMode, navigation]);

  const onGoFeed = useCallback(() => {
    navigation.navigate("Main", { screen: "Feed", params: {} });
  }, [navigation]);

  const onOpenSuggestedContent = useCallback(() => {
    if (suggestedContent) {
      navigation.navigate("ContentDetail", { contentId: suggestedContent.id });
      return;
    }
    navigation.navigate("Main", { screen: "Explore", params: {} });
  }, [navigation, suggestedContent]);

  const onOpenSuggestedGame = useCallback(() => {
    const diff = difficulty ?? "EASY";
    if (gameMode === "visual") {
      navigation.replace("VisualGame", { category: otherGameCategory, difficulty: diff });
    } else {
      navigation.replace("Quiz", { category: otherGameCategory, difficulty: diff });
    }
  }, [difficulty, gameMode, navigation, otherGameCategory]);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: space.sm, paddingBottom: insets.bottom + space.lg },
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.circleWrap}>
        <View style={styles.circleOuter}>
          <View
            style={[
              styles.circleFill,
              { height: `${Math.round(pct * 100)}%`, backgroundColor: fillColor },
            ]}
          />
          <Text style={styles.scoreInCircle}>
            {score}/{total}
          </Text>
        </View>
      </View>

      <View style={styles.starsRow}>
        {Array.from({ length: 5 }).map((_, i) => (
          <AppIcon
            key={`star-${i}`}
            name={i < stars ? "star" : "star-outline"}
            color={colors.primary}
            size="lg"
          />
        ))}
      </View>

      <Text style={styles.feedbackText}>{message}</Text>

      {recommendations && recommendations.length > 0 ? (
        <View style={[styles.statsCard, { marginBottom: space.md }]}>
          <Text style={[styles.statLabel, { marginBottom: space.sm }]}>Recomendaciones</Text>
          {recommendations.map((line, i) => (
            <Text key={`rec-${i}`} style={[styles.statHint, { marginBottom: space.xs }]}>
              • {line}
            </Text>
          ))}
        </View>
      ) : null}

      <View style={styles.statsCard}>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Puntaje</Text>
          <Text style={styles.statValue}>
            {score} / {total}
          </Text>
        </View>
        <View style={[styles.statRow, styles.statRowDivider]}>
          <Text style={styles.statLabel}>XP ganados</Text>
          {xpGained != null ? (
            <Text style={styles.statValueAccent}>+{xpGained}</Text>
          ) : (
            <Text style={styles.statValue}>—</Text>
          )}
        </View>
        {xpGained == null ? (
          <Text style={styles.statHint}>Iniciá sesión para registrar XP en tu perfil.</Text>
        ) : null}
      </View>

      <View style={styles.suggestSection}>
        <Text style={styles.suggestHeading}>{suggestHeading}</Text>

        {suggestedContentLoading ? (
          <View style={[styles.suggestCard, styles.loadingRow]}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={styles.suggestHint}>Buscando contenido relacionado…</Text>
          </View>
        ) : (
          <Pressable
            onPress={onOpenSuggestedContent}
            style={({ pressed }) => [styles.suggestCard, pressed && styles.suggestCardPressed]}
            accessibilityRole="button"
            accessibilityLabel={
              suggestedContent
                ? `Abrir contenido: ${suggestedContent.title}`
                : "Explorar más contenido"
            }
          >
            <View style={styles.suggestIconWrap}>
              <AppIcon name="book-outline" color={colors.primary} size="md" />
            </View>
            <View style={styles.suggestTextCol}>
              <Text style={styles.suggestKicker}>Contenido relacionado</Text>
              <Text style={styles.suggestTitle} numberOfLines={2}>
                {suggestedContent?.title ?? "Explorar más en la sección Aprender"}
              </Text>
              {!suggestedContent ? (
                <Text style={styles.suggestHint}>Tocá para ir a Explorar</Text>
              ) : null}
            </View>
            <AppIcon name="chevron-forward" color={colors.textMuted} size="sm" />
          </Pressable>
        )}

        <Pressable
          onPress={onOpenSuggestedGame}
          style={({ pressed }) => [styles.suggestCard, pressed && styles.suggestCardPressed]}
          accessibilityRole="button"
          accessibilityLabel={`Otro juego: ${otherGameTitle}`}
        >
          <View style={styles.suggestIconWrap}>
            <AppIcon
              name={gameMode === "visual" ? "images-outline" : "game-controller-outline"}
              color={colors.primary}
              size="md"
            />
          </View>
          <View style={styles.suggestTextCol}>
            <Text style={styles.suggestKicker}>Otro juego</Text>
            <Text style={styles.suggestTitle} numberOfLines={2}>
              {otherGameTitle}
            </Text>
            <Text style={styles.suggestHint}>Misma dificultad · otra categoría</Text>
          </View>
          <AppIcon name="chevron-forward" color={colors.textMuted} size="sm" />
        </Pressable>
      </View>

      <View style={styles.buttonCol}>
        <Pressable
          onPress={onPlayAgain}
          style={({ pressed }) => [styles.btnPrimary, pressed && styles.btnPrimaryPressed]}
          accessibilityRole="button"
          accessibilityLabel="Jugar de nuevo"
        >
          <Text style={styles.btnPrimaryText}>Jugar de nuevo</Text>
        </Pressable>

        <Pressable
          onPress={onGoFeed}
          style={({ pressed }) => [styles.btnGhost, pressed && { opacity: 0.85 }]}
          accessibilityRole="button"
          accessibilityLabel="Ir al feed"
        >
          <Text style={styles.btnGhostText}>Ir al feed</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
