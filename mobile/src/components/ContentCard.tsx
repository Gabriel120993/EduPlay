import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { useMemo, useRef } from "react";
import {
  Alert,
  Animated,
  Image,
  PanResponder,
  Share,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { showToast } from "../lib/toastBus";
import { useTheme } from "../contexts/ThemeContext";
import { SafePressable } from "./SafePressable";

export type ContentCardType = "learn" | "quiz" | "game" | "mission" | "video" | "reading";
export type ContentCardCategory = "matematicas" | "ciencias" | "historia" | "geografia" | "arte" | "lenguaje" | string;
export type ContentCardDifficulty = "easy" | "medium" | "hard";

export type ContentCardProps = {
  id: string;
  title: string;
  description: string;
  type: ContentCardType;
  category: ContentCardCategory;
  difficulty: ContentCardDifficulty;
  duration?: number;
  progress?: number;
  xpReward: number;
  thumbnail?: string;
  isNew?: boolean;
  isCompleted?: boolean;
  onPress?: () => void;
  onFavorite?: (id: string) => void;
  onHide?: (id: string) => void;
  style?: StyleProp<ViewStyle>;
  compact?: boolean;
};

const FAVORITES_KEY = "@eduplay/content_card_favorites_v1";
const HIDDEN_KEY = "@eduplay/content_card_hidden_v1";

const TYPE_META: Record<ContentCardType, { label: string; icon: string; bg: string; text: string }> = {
  learn: { label: "APRENDER", icon: "📚", bg: "#DCFCE7", text: "#15803D" },
  quiz: { label: "CUESTIONARIO", icon: "🎯", bg: "#DBEAFE", text: "#1D4ED8" },
  game: { label: "JUEGO", icon: "🎮", bg: "#EDE9FE", text: "#6D28D9" },
  mission: { label: "MISIÓN", icon: "🚀", bg: "#FFEDD5", text: "#C2410C" },
  video: { label: "VIDEO", icon: "🎬", bg: "#FEE2E2", text: "#B91C1C" },
  reading: { label: "LECTURA", icon: "📖", bg: "#FEF3C7", text: "#A16207" },
};

const DIFFICULTY_META: Record<ContentCardDifficulty, { label: string; bg: string; text: string }> = {
  easy: { label: "FÁCIL", bg: "#DCFCE7", text: "#166534" },
  medium: { label: "MEDIO", bg: "#FEF3C7", text: "#A16207" },
  hard: { label: "DIFÍCIL", bg: "#FEE2E2", text: "#B91C1C" },
};

const CATEGORY_META: Record<string, { color: string; emoji: string }> = {
  matematicas: { color: "#4F46E5", emoji: "🔢" },
  math: { color: "#4F46E5", emoji: "🔢" },
  ciencias: { color: "#059669", emoji: "🧪" },
  science: { color: "#059669", emoji: "🧪" },
  historia: { color: "#D97706", emoji: "🏺" },
  history: { color: "#D97706", emoji: "🏺" },
  geografia: { color: "#D97706", emoji: "🌍" },
  geography: { color: "#D97706", emoji: "🌍" },
  arte: { color: "#DB2777", emoji: "🎨" },
  creativity: { color: "#DB2777", emoji: "🎨" },
  lenguaje: { color: "#DC2626", emoji: "📖" },
  education: { color: "#DC2626", emoji: "📖" },
  puzzle: { color: "#7C3AED", emoji: "🧩" },
  astronomy: { color: "#2563EB", emoji: "🚀" },
};

function clampProgress(value: number | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null;
  return Math.max(0, Math.min(100, value));
}

async function addToStoredSet(key: string, id: string): Promise<void> {
  const raw = await AsyncStorage.getItem(key);
  const values = raw ? (JSON.parse(raw) as string[]) : [];
  const next = Array.from(new Set([...values, id]));
  await AsyncStorage.setItem(key, JSON.stringify(next));
}

export function ContentCard({
  id,
  title,
  description,
  type,
  category,
  difficulty,
  duration,
  progress,
  xpReward,
  thumbnail,
  isNew = false,
  isCompleted = false,
  onPress,
  onFavorite,
  onHide,
  style,
  compact = false,
}: ContentCardProps) {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const translateX = useRef(new Animated.Value(0)).current;
  const typeMeta = TYPE_META[type];
  const difficultyMeta = DIFFICULTY_META[difficulty];
  const categoryMeta = CATEGORY_META[String(category).toLowerCase()] ?? { color: colors.primary, emoji: "📚" };
  const normalizedProgress = clampProgress(progress);
  const showProgress = normalizedProgress != null && normalizedProgress > 0 && !isCompleted;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 18 && Math.abs(gesture.dy) < 12,
        onPanResponderMove: (_, gesture) => {
          translateX.setValue(Math.max(-90, Math.min(90, gesture.dx)));
        },
        onPanResponderRelease: (_, gesture) => {
          const complete = async () => {
            if (gesture.dx > 70) {
              await addToStoredSet(FAVORITES_KEY, id);
              onFavorite?.(id);
              showToast("Marcado como favorito", "success");
            } else if (gesture.dx < -70) {
              await addToStoredSet(HIDDEN_KEY, id);
              onHide?.(id);
              showToast("Oculto de recomendados", "success");
            }
          };
          void complete();
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        },
      }),
    [id, onFavorite, onHide, translateX]
  );

  const defaultPress = () => {
    if (onPress) {
      onPress();
      return;
    }
    if (type === "learn" || type === "video" || type === "reading") {
      navigation.navigate("ContentDetail", { contentId: id });
      return;
    }
    if (type === "quiz") {
      navigation.navigate("QuizAreas");
      return;
    }
    if (type === "game") {
      navigation.navigate("MiniGamesHub");
      return;
    }
    navigation.navigate("Main", { screen: "Explore" });
  };

  const openOptions = () => {
    Alert.alert(title, "Opciones del contenido", [
      {
        text: "Compartir",
        onPress: () => void Share.share({ title, message: `${title}\n\n${description}` }),
      },
      {
        text: "Guardar",
        onPress: () => {
          void addToStoredSet(FAVORITES_KEY, id).then(() => {
            onFavorite?.(id);
            showToast("Contenido guardado", "success");
          });
        },
      },
      {
        text: "Reportar",
        style: "destructive",
        onPress: () => showToast("Reporte recibido para revisión", "success"),
      },
      { text: "Cancelar", style: "cancel" },
    ]);
  };

  return (
    <Animated.View style={[{ transform: [{ translateX }] }, style]} {...panResponder.panHandlers}>
      <SafePressable
        onPress={defaultPress}
        onLongPress={openOptions}
        style={({ pressed }) => [
          styles.card,
          compact && styles.cardCompact,
          compact && { width: "100%" },
          { backgroundColor: `${categoryMeta.color}14`, borderColor: categoryMeta.color },
          pressed && styles.cardPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${typeMeta.label}: ${title}`}
      >
        {isNew ? (
          <View style={styles.newBadge}>
            <Text style={styles.newBadgeText}>NUEVO</Text>
          </View>
        ) : null}

        <View style={styles.mainRow}>
          {thumbnail ? (
            <Image source={{ uri: thumbnail }} style={styles.thumbnail} resizeMode="cover" />
          ) : (
            <View style={[styles.emojiThumb, { backgroundColor: `${categoryMeta.color}1A` }]}>
              <Text style={styles.emojiThumbText}>{categoryMeta.emoji}</Text>
            </View>
          )}

          <View style={styles.body}>
            <View style={styles.badgeRow}>
              <View style={[styles.typeBadge, { backgroundColor: typeMeta.bg }]}>
                <Text style={[styles.typeBadgeText, { color: typeMeta.text }]}>
                  {typeMeta.icon} {typeMeta.label}
                </Text>
              </View>
              <View style={[styles.difficultyBadge, { backgroundColor: difficultyMeta.bg }]}>
                <Text style={[styles.difficultyText, { color: difficultyMeta.text }]}>
                  {difficultyMeta.label}
                </Text>
              </View>
            </View>

            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
                {title}
              </Text>
              {isCompleted ? <Text style={styles.completedCheck}>✓</Text> : null}
            </View>

            <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
              {description}
            </Text>

            <View style={styles.metaRow}>
              {duration != null ? (
                <Text style={[styles.metaText, { color: colors.textMuted }]}>{duration} min</Text>
              ) : null}
              <Text style={[styles.metaText, { color: colors.textMuted }]}>+{xpReward} XP</Text>
            </View>

            {showProgress ? (
              <View style={styles.progressWrap}>
                <View style={[styles.progressTrack, { backgroundColor: colors.borderSubtle }]}>
                  <View
                    style={[
                      styles.progressFill,
                      { backgroundColor: categoryMeta.color, width: `${normalizedProgress}%` },
                    ]}
                  />
                </View>
                <Text style={[styles.progressText, { color: colors.textMuted }]}>{normalizedProgress}%</Text>
              </View>
            ) : null}
          </View>
        </View>
      </SafePressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderLeftWidth: 5,
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardCompact: {
    width: 240,
    minHeight: 176,
  },
  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  newBadge: {
    position: "absolute",
    right: 10,
    top: 10,
    zIndex: 2,
    borderRadius: 999,
    backgroundColor: "#111827",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  newBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },
  mainRow: {
    flexDirection: "row",
    gap: 12,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: 16,
  },
  emojiThumb: {
    width: 64,
    height: 64,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiThumbText: {
    fontSize: 32,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingRight: 54,
  },
  typeBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: "900",
  },
  difficultyBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  difficultyText: {
    fontSize: 10,
    fontWeight: "900",
  },
  titleRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 20,
  },
  completedCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#16A34A",
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 24,
    fontWeight: "900",
  },
  description: {
    marginTop: 5,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
  metaRow: {
    marginTop: 8,
    flexDirection: "row",
    gap: 10,
  },
  metaText: {
    fontSize: 12,
    fontWeight: "800",
  },
  progressWrap: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  progressTrack: {
    flex: 1,
    height: 7,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
  },
  progressText: {
    minWidth: 36,
    textAlign: "right",
    fontSize: 11,
    fontWeight: "900",
  },
});
