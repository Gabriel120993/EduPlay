import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp, BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { AppIcon } from "../components/AppIcon";
import { BrandLogo } from "../components/BrandLogo";
import {
  ContentCard,
  type ContentCardCategory,
  type ContentCardDifficulty,
} from "../components/ContentCard";
import { ContinueLearningSection } from "../components/ContinueLearningSection";
import { BrandEmptyState } from "../components/BrandEmptyState";
import { FeedPostTypeLabel } from "../components/FeedPostTypeLabel";
import { PostCategoryTag } from "../components/PostCategoryTag";
import { PostReactionBar } from "../components/PostReactionBar";
import { ReadOnlyBanner } from "../components/ReadOnlyBanner";
import { TimeUsageBar } from "../components/TimeUsageBar";
import { APP_TAGLINE, appTaglineSubtitle } from "../constants/brand";
import { VIEWER_USER_ID } from "../config";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { READ_ONLY_TOAST_MSG, useScreenTime } from "../contexts/ScreenTimeContext";
import { getRarityBadgeVisual } from "../lib/achievementRarityUi";
import { getCategoryChrome } from "../lib/contentCategoryUi";
import { touchChildLastActiveAt } from "../lib/activityReminders";
import { isRemoteAvatarUrl } from "../lib/avatarDisplay";
import { applyNotificationPreferencesFromProfile } from "../lib/notificationPreferencesStore";
import {
  loadContinueLearning,
  pickMostRecentResumeTarget,
  type LastContentOpened,
  type LastGamePlayed,
} from "../lib/continueLearningStorage";
import { difficultyFromUserLevel } from "../lib/quizDifficultyFromLevel";
import { showToast } from "../lib/toastBus";
import { trackEvent } from "../services/analytics";
import {
  createReaction,
  getEducationalContent,
  getExploreFeed,
  getExploreRecommendations,
  getQuizzes,
  getUserProfile,
  getUserRecommendations,
  type QuizListItem,
  type ReactionType,
} from "../services/api";
import type {
  EducationalContentItem,
  ExploreRecommendationsResponse,
  FeedPost,
  RecommendedEducationalItem,
  RecommendedGameMixItem,
  RecommendationsResponse,
} from "../types/api";
import type { MainTabParamList, RootStackParamList } from "../navigation/types";
import { feedLabelFromPostType } from "../lib/feedLabels";
import { formatFeedTime } from "../lib/feedTime";
import { bumpReactionOptimistic, getReactionCounts } from "../lib/reactionCounts";
import { avatarSize, space } from "../theme/tokens";
import { useExploreStyles } from "./exploreScreenStyles";

type Props = BottomTabScreenProps<MainTabParamList, "Explore">;
type QuizCategory =
  | "astronomy"
  | "math"
  | "science"
  | "history"
  | "geography"
  | "creativity"
  | "mixed";

const QUIZ_GAME_ENTRIES: Array<{
  category: QuizCategory;
  icon: string;
  title: string;
  description: string;
  difficulty: ContentCardDifficulty;
  ageRange?: string;
  sampleQuestions?: string[];
}> = [
  {
    category: "mixed",
    icon: "🎲",
    title: "Modo desafío",
    description: "Preguntas mezcladas de todas las categorías.",
    difficulty: "medium",
  },
  {
    category: "astronomy",
    icon: "🪐",
    title: "Quiz de Astronomía: Planetas y Estrellas",
    description: "Planetas, estrellas y el sistema solar",
    difficulty: "easy",
    ageRange: "5-8 años",
    sampleQuestions: [
      "¿Cuál es el planeta más grande del sistema solar? (Júpiter)",
      "¿Qué planeta es conocido como el planeta rojo? (Marte)",
      "¿Cuántos planetas hay en el sistema solar? (8)",
      "¿Qué es una estrella fugaz? (Meteoro)",
      "¿La Tierra gira alrededor de...? (El Sol)",
    ],
  },
  {
    category: "math",
    icon: "🔢",
    title: "Quiz de Matemáticas: Sumas y Restas",
    description: "Números, operaciones y razonamiento",
    difficulty: "easy",
    ageRange: "6-9 años",
    sampleQuestions: [
      "15 + 7 = ? (22)",
      "43 - 18 = ? (25)",
      "¿Cuánto es el doble de 12? (24)",
      "Si tengo 30 caramelos y doy 12, ¿cuántos me quedan? (18)",
      "¿Qué número sigue en la serie: 2, 4, 6, 8, ...? (10)",
    ],
  },
  {
    category: "science",
    icon: "🧪",
    title: "Quiz de Ciencia: Estados de la Materia",
    description: "Experimentos, energía y estados de la materia",
    difficulty: "easy",
    ageRange: "7-10 años",
    sampleQuestions: [
      "¿En qué estado está el agua cuando hierve? (Gas)",
      "¿El hielo es agua en estado...? (Sólido)",
      "¿Qué necesita una planta para hacer fotosíntesis? (Sol, agua, aire)",
      "¿Cuál es el estado natural del oxígeno? (Gas)",
      "¿Qué pasa si mezclas aceite y agua? (No se mezclan)",
    ],
  },
  {
    category: "history",
    icon: "🏛️",
    title: "Quiz de Historia: Civilizaciones Antiguas",
    description: "Civilizaciones, épocas y hechos importantes",
    difficulty: "medium",
    ageRange: "9-12 años",
    sampleQuestions: [
      "¿Dónde vivían los faraones? (Egipto)",
      "¿Qué construyeron los romanos para transportar agua? (Acueductos)",
      "¿Quién fue el primer presidente de Argentina? (Bernardino Rivadavia)",
      "¿En qué año llegó Cristóbal Colón a América? (1492)",
      "¿Qué inventaron los egipcios para escribir? (Jeroglíficos)",
    ],
  },
  {
    category: "geography",
    icon: "🌍",
    title: "Quiz de Geografía: Países y Capitales",
    description: "Países, continentes y mapas",
    difficulty: "easy",
    ageRange: "8-11 años",
    sampleQuestions: [
      "¿Cuál es la capital de Francia? (París)",
      "¿En qué continente está Argentina? (América del Sur)",
      "¿Cuál es el río más largo del mundo? (Nilo / Amazonas)",
      "¿Cuántos continentes hay? (6 o 7)",
      "¿Qué país tiene forma de bota? (Italia)",
    ],
  },
  {
    category: "creativity",
    icon: "🎨",
    title: "Quiz de Creatividad: Colores y Arte",
    description: "Arte, colores e imaginación",
    difficulty: "easy",
    ageRange: "6-10 años",
    sampleQuestions: [
      "¿Qué colores son primarios? (Rojo, azul, amarillo)",
      "¿Qué color se forma al mezclar azul y amarillo? (Verde)",
      "¿Quién pintó la Mona Lisa? (Leonardo da Vinci)",
      "¿Qué artista mexicana se pintaba monos? (Frida Kahlo)",
      "¿Cuántos colores tiene el arcoíris? (7)",
    ],
  },
];

const VISUAL_GAME_ENTRIES: Array<{
  gameId: string;
  category: "astronomy" | "geography";
  title: string;
  description: string;
  levels: number;
  difficultyLabel: string;
  xpLabel: string;
  cardCategory: ContentCardCategory;
  cardDifficulty: ContentCardDifficulty;
}> = [
  {
    gameId: "guess-planet",
    category: "astronomy",
    title: "🪐 Adiviná el planeta",
    description: "Mirá la imagen y elegí el planeta correcto",
    levels: 10,
    difficultyLabel: "FÁCIL",
    xpLabel: "10 XP por nivel · bonus 50",
    cardCategory: "ciencias",
    cardDifficulty: "easy",
  },
  {
    gameId: "identify-country",
    category: "geography",
    title: "🗺️ Identificá el país",
    description: "Banderas y mapas: ¿reconocé el lugar?",
    levels: 15,
    difficultyLabel: "FÁCIL a MEDIO",
    xpLabel: "15 XP por nivel · bonus 100",
    cardCategory: "geografia",
    cardDifficulty: "medium",
  },
  {
    gameId: "dino-names",
    category: "geography",
    title: "🦕 Dinosaurios: ¿Sabés su nombre?",
    description: "Imágenes de dinosaurios reales, elegí el nombre correcto",
    levels: 10,
    difficultyLabel: "FÁCIL",
    xpLabel: "12 XP por nivel",
    cardCategory: "historia",
    cardDifficulty: "easy",
  },
  {
    gameId: "color-mix",
    category: "astronomy",
    title: "🎨 ¿Qué color es?",
    description: "Mezclas de colores para identificar el resultado",
    levels: 8,
    difficultyLabel: "FÁCIL",
    xpLabel: "10 XP por nivel",
    cardCategory: "arte",
    cardDifficulty: "easy",
  },
  {
    gameId: "spot-difference",
    category: "geography",
    title: "🔍 Encuentra la Diferencia",
    description: "Dos imágenes casi iguales, encontrá 5 diferencias",
    levels: 5,
    difficultyLabel: "MEDIO",
    xpLabel: "20 XP por nivel",
    cardCategory: "arte",
    cardDifficulty: "medium",
  },
  {
    gameId: "world-puzzle",
    category: "geography",
    title: "🧩 Rompecabezas del Mundo",
    description: "Armá mapas, animales y monumentos en 3 dificultades",
    levels: 12,
    difficultyLabel: "4, 9 y 16 piezas",
    xpLabel: "15 XP por nivel",
    cardCategory: "geografia",
    cardDifficulty: "medium",
  },
];

const PAGE_SIZE = 15;
/** Evita disparos múltiples de `onEndReached` seguidos. */
const LOAD_MORE_THROTTLE_MS = 650;

type ExploreContentCardItem = {
  id: string;
  title: string;
  description: string;
  type: "learn" | "quiz" | "game" | "mission" | "video" | "reading";
  category: ContentCardCategory;
  difficulty: ContentCardDifficulty;
  duration: number;
  xpReward: number;
  progress?: number;
  isNew?: boolean;
  isCompleted?: boolean;
  contentId?: string;
  quizCategory?: QuizCategory;
};

const LEARN_FALLBACK_CARDS: ExploreContentCardItem[] = [
  {
    id: "learn-sistema-solar",
    title: "🌌 El Sistema Solar",
    description: "Video 3 min · Ciencias",
    type: "video",
    category: "ciencias",
    difficulty: "easy",
    duration: 3,
    xpReward: 12,
    isNew: true,
  },
  {
    id: "learn-mariposa",
    title: "🦋 Metamorfosis de la Mariposa",
    description: "Lectura interactiva · Ciencias",
    type: "reading",
    category: "ciencias",
    difficulty: "easy",
    duration: 6,
    xpReward: 14,
  },
  {
    id: "learn-romanos",
    title: "🏛️ Los Romanos y su Imperio",
    description: "Documental 5 min · Historia",
    type: "video",
    category: "historia",
    difficulty: "medium",
    duration: 5,
    xpReward: 16,
  },
  {
    id: "learn-shakespeare",
    title: "🎭 Shakespeare para Niños",
    description: "Cuento adaptado · Lenguaje",
    type: "reading",
    category: "lenguaje",
    difficulty: "medium",
    duration: 8,
    xpReward: 15,
  },
  {
    id: "learn-frida",
    title: "🎨 Frida Kahlo: Vida y Obra",
    description: "Biografía interactiva · Arte",
    type: "reading",
    category: "arte",
    difficulty: "easy",
    duration: 7,
    xpReward: 14,
    isNew: true,
  },
  {
    id: "learn-agua",
    title: "🌊 El Ciclo del Agua",
    description: "Experimento virtual · Ciencias",
    type: "learn",
    category: "ciencias",
    difficulty: "easy",
    duration: 6,
    xpReward: 13,
  },
  {
    id: "learn-mapamundi",
    title: "🗺️ Mapamundi Interactivo",
    description: "Juego de geografía · Geografía",
    type: "game",
    category: "geografia",
    difficulty: "medium",
    duration: 9,
    xpReward: 18,
  },
  {
    id: "learn-tablas",
    title: "🧮 Tablas de Multiplicar",
    description: "Canción + Quiz · Matemáticas",
    type: "quiz",
    category: "matematicas",
    difficulty: "easy",
    duration: 5,
    xpReward: 15,
  },
  {
    id: "learn-selva",
    title: "🦁 Animales de la Selva",
    description: "Tarjetas de vocabulario · Ciencias",
    type: "reading",
    category: "ciencias",
    difficulty: "easy",
    duration: 6,
    xpReward: 12,
  },
  {
    id: "learn-electricidad",
    title: "⚡ Grandes Inventos: La Electricidad",
    description: "Video 4 min · Historia",
    type: "video",
    category: "historia",
    difficulty: "medium",
    duration: 4,
    xpReward: 16,
  },
];

const QUICK_QUIZ_FALLBACK_CARDS: ExploreContentCardItem[] = [
  {
    id: "quick-logica",
    title: "🧠 Quiz Express: Lógica",
    description: "5 preguntas · 3 min",
    type: "quiz",
    category: "matematicas",
    difficulty: "medium",
    duration: 3,
    xpReward: 15,
    quizCategory: "mixed",
    isNew: true,
  },
  {
    id: "quick-tablas",
    title: "🔢 Quiz Express: Tablas",
    description: "10 preguntas · 5 min",
    type: "quiz",
    category: "matematicas",
    difficulty: "easy",
    duration: 5,
    xpReward: 18,
    quizCategory: "math",
  },
  {
    id: "quick-banderas",
    title: "🌍 Quiz Express: Banderas",
    description: "8 preguntas · 4 min",
    type: "quiz",
    category: "geografia",
    difficulty: "medium",
    duration: 4,
    xpReward: 16,
    quizCategory: "geography",
  },
  {
    id: "quick-dinosaurios",
    title: "🦕 Quiz Express: Dinosaurios",
    description: "5 preguntas · 3 min",
    type: "quiz",
    category: "historia",
    difficulty: "easy",
    duration: 3,
    xpReward: 15,
    quizCategory: "history",
  },
  {
    id: "quick-arte",
    title: "🎨 Quiz Express: Arte",
    description: "5 preguntas · 3 min",
    type: "quiz",
    category: "arte",
    difficulty: "easy",
    duration: 3,
    xpReward: 15,
    quizCategory: "creativity",
  },
  {
    id: "quick-ciencia",
    title: "🧪 Quiz Express: Ciencia",
    description: "5 preguntas · 3 min",
    type: "quiz",
    category: "ciencias",
    difficulty: "easy",
    duration: 3,
    xpReward: 15,
    quizCategory: "science",
  },
];

function isPlaceholderTitle(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("demo de recurso") ||
    lower.includes("demostración de recurso") ||
    lower.includes("demostracion de recurso") ||
    lower.includes("recurso demo")
  );
}
function interleaveExploreForYou(
  content: RecommendedEducationalItem[],
  games: RecommendedGameMixItem[],
): Array<
  | { kind: "content"; item: RecommendedEducationalItem }
  | { kind: "game"; item: RecommendedGameMixItem }
> {
  const out: Array<
    | { kind: "content"; item: RecommendedEducationalItem }
    | { kind: "game"; item: RecommendedGameMixItem }
  > = [];
  const n = Math.max(content.length, games.length);
  for (let i = 0; i < n; i++) {
    if (i < content.length) out.push({ kind: "content", item: content[i] });
    if (i < games.length) out.push({ kind: "game", item: games[i] });
  }
  return out;
}

function toQuizCategoryFromApi(raw: string): QuizCategory {
  const c = raw.trim().toLowerCase();
  const allowed: QuizCategory[] = [
    "astronomy",
    "math",
    "science",
    "history",
    "geography",
    "creativity",
    "mixed",
  ];
  return allowed.includes(c as QuizCategory) ? (c as QuizCategory) : "mixed";
}

function toVisualCategoryFromApi(raw: string): "astronomy" | "geography" {
  return raw.trim().toLowerCase() === "geography" ? "geography" : "astronomy";
}

function contentCardDifficulty(raw: string): ContentCardDifficulty {
  if (raw === "HARD" || raw.toLowerCase() === "hard") return "hard";
  if (raw === "MEDIUM" || raw.toLowerCase() === "medium") return "medium";
  return "easy";
}

function contentCardCategory(raw: string): ContentCardCategory {
  const category = raw.toLowerCase();
  const map: Record<string, ContentCardCategory> = {
    math: "matematicas",
    science: "ciencias",
    history: "historia",
    geography: "geografia",
    creativity: "arte",
    education: "lenguaje",
  };
  return map[category] ?? category;
}

function contentTypeToCardType(item: EducationalContentItem): ExploreContentCardItem["type"] {
  if (item.contentType === "VIDEO") return "video";
  if (item.contentType === "READING") return "reading";
  if (item.contentType === "INTERACTIVE") return "game";
  return "learn";
}

function educationalContentToCard(
  item: EducationalContentItem,
  index: number,
): ExploreContentCardItem {
  return {
    id: item.id,
    contentId: item.id,
    title: item.title,
    description: item.description,
    type: contentTypeToCardType(item),
    category: contentCardCategory(item.category),
    difficulty: contentCardDifficulty(item.difficulty),
    duration: item.contentType === "VIDEO" ? 4 : 8,
    xpReward: item.difficulty === "HARD" ? 20 : item.difficulty === "MEDIUM" ? 16 : 12,
    isNew: index < 3,
  };
}

function quizToQuickCard(item: QuizListItem, index: number): ExploreContentCardItem {
  const categories: QuizCategory[] = [
    "mixed",
    "math",
    "geography",
    "history",
    "creativity",
    "science",
  ];
  const category = categories[index % categories.length] ?? "mixed";
  return {
    id: item.id,
    title: item.title,
    description: `${item.questionCount} preguntas · ${Math.max(3, Math.ceil(item.questionCount / 2))} min`,
    type: "quiz",
    category: contentCardCategory(category),
    difficulty: contentCardDifficulty(item.difficulty),
    duration: Math.max(3, Math.ceil(item.questionCount / 2)),
    xpReward: item.difficulty === "HARD" ? 22 : item.difficulty === "MEDIUM" ? 18 : 15,
    quizCategory: category,
    isNew: index < 2,
  };
}

function mergeExplorePostsDedupe(existing: FeedPost[], incoming: FeedPost[]): FeedPost[] {
  const seen = new Set(existing.map((p) => p.id));
  const out = [...existing];
  for (const p of incoming) {
    if (!seen.has(p.id)) {
      seen.add(p.id);
      out.push(p);
    }
  }
  return out;
}

function ExplorePostCard({
  item,
  pendingKey,
  actionsBlocked,
  onReact,
}: {
  item: FeedPost;
  pendingKey: string | null;
  actionsBlocked: boolean;
  onReact: (postId: string, type: ReactionType) => void;
}) {
  const styles = useExploreStyles();
  const { mode } = useTheme();
  const isDark = mode === "dark";
  const chrome = getCategoryChrome(item.category);
  const rarityVis = item.badge ? getRarityBadgeVisual(item.badge.rarity, isDark) : null;
  const busy = pendingKey?.startsWith(`${item.id}:`) ?? false;
  const initial = item.user.username.trim().charAt(0).toUpperCase() || "?";
  const [imgFail, setImgFail] = useState(false);
  const timeLabel = formatFeedTime(item.createdAt, item.createdAtFormatted);
  const typeLabel = item.feedLabel ?? feedLabelFromPostType(item.type);
  const av = avatarSize.feedCompact;
  const avUrl = item.user.avatarUrl;
  const remote = isRemoteAvatarUrl(avUrl);
  const glyph = avUrl && !remote ? avUrl.trim() : null;
  const showRemoteImage = remote && !!avUrl && !imgFail;

  useEffect(() => {
    setImgFail(false);
  }, [item.user.avatarUrl]);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.exploreCard,
        { borderLeftColor: chrome.stripe },
        pressed && styles.exploreCardPressed,
      ]}
      onPress={() => {}}
      accessibilityRole="none"
    >
      <View style={styles.exploreCardInner}>
        <View style={styles.exploreCardHeader}>
          <View
            style={[styles.exploreAvatarOuter, { width: av, height: av, borderRadius: av / 2 }]}
          >
            {glyph ? (
              <View
                style={[
                  styles.exploreAvatarPh,
                  { width: av, height: av, borderRadius: av / 2, borderColor: chrome.accent },
                ]}
              >
                <Text style={[styles.exploreAvatarPhText, { fontSize: Math.round(av * 0.48) }]}>
                  {glyph}
                </Text>
              </View>
            ) : showRemoteImage ? (
              <Image
                source={{ uri: avUrl as string }}
                style={[styles.exploreAvatarImg, { width: av, height: av, borderRadius: av / 2 }]}
                onError={() => setImgFail(true)}
              />
            ) : (
              <View
                style={[
                  styles.exploreAvatarPh,
                  { width: av, height: av, borderRadius: av / 2, borderColor: chrome.accent },
                ]}
              >
                <Text style={[styles.exploreAvatarPhText, { fontSize: Math.round(av * 0.38) }]}>
                  {initial}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.exploreHeaderTextCol}>
            <View style={styles.exploreNameTimeRow}>
              <Text style={styles.exploreUsername} numberOfLines={1}>
                {item.user.username}
              </Text>
              {timeLabel ? (
                <>
                  <Text style={styles.exploreTimeSep} accessibilityElementsHidden>
                    {" "}
                    ·{" "}
                  </Text>
                  <Text style={styles.exploreTimeMeta} numberOfLines={1}>
                    {timeLabel}
                  </Text>
                </>
              ) : null}
            </View>
            <View style={styles.exploreTypeAndCategoryRow}>
              {typeLabel ? (
                <FeedPostTypeLabel label={typeLabel} postType={item.type} compact />
              ) : null}
              <PostCategoryTag category={item.category} compact inline />
            </View>
          </View>
        </View>

        {item.content ? <Text style={styles.exploreContent}>{item.content}</Text> : null}

        {item.imageUrl ? (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.explorePostImage}
            resizeMode="cover"
          />
        ) : null}

        {item.badge && rarityVis ? (
          <View style={styles.exploreBadgeRow}>
            <View
              style={[
                styles.exploreBadgeIconWrap,
                {
                  borderColor: chrome.ring,
                  borderWidth: 3,
                },
              ]}
            >
              <Text style={styles.exploreBadgeIcon}>{item.badge.icon}</Text>
            </View>
            <View
              style={[
                styles.exploreRarityPill,
                {
                  borderColor: rarityVis.border,
                  backgroundColor: rarityVis.softBg,
                  borderWidth: rarityVis.borderWidth,
                },
              ]}
            >
              <Text style={[styles.exploreRarityText, { color: rarityVis.accent }]}>
                {item.badge.rarity}
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.exploreFooter}>
          <PostReactionBar
            postId={item.id}
            counts={getReactionCounts(item)}
            userReaction={item.userReaction ?? null}
            pending={busy}
            readOnly={actionsBlocked}
            onReact={onReact}
          />
        </View>
      </View>
    </Pressable>
  );
}

export function ExploreScreen({ route }: Props) {
  const { t } = useTranslation();
  const styles = useExploreStyles();
  const { colors } = useTheme();
  const tabNavigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const insets = useSafeAreaInsets();
  const { viewerUserId: authViewerId, token } = useAuth();
  const userId =
    authViewerId?.trim() || route.params?.userId?.trim() || (token ? "" : VIEWER_USER_ID);
  const screenTime = useScreenTime();
  const readOnly = screenTime.readOnlyMode;

  const openSettings = useCallback(() => {
    const root = tabNavigation.getParent() as
      | NativeStackNavigationProp<RootStackParamList>
      | undefined;
    root?.navigate("Settings");
  }, [tabNavigation]);

  const openChat = useCallback(() => {
    const root = tabNavigation.getParent() as
      | NativeStackNavigationProp<RootStackParamList>
      | undefined;
    root?.navigate("ChatInbox");
  }, [tabNavigation]);

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [learningContent, setLearningContent] = useState<EducationalContentItem[]>([]);
  const [quickQuizzes, setQuickQuizzes] = useState<QuizListItem[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationsResponse | null>(null);
  const [exploreForYou, setExploreForYou] = useState<ExploreRecommendationsResponse | null>(null);
  const [exploreForYouLoading, setExploreForYouLoading] = useState(false);
  const [continueLearning, setContinueLearning] = useState<{
    game: LastGamePlayed | null;
    content: LastContentOpened | null;
  }>({ game: null, content: null });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [viewerLevel, setViewerLevel] = useState<number | null>(null);
  const loadingMoreRef = useRef(false);
  const postsRef = useRef<FeedPost[]>([]);
  const hasMoreRef = useRef(true);
  const lastLoadMoreAt = useRef(0);
  const reactionInFlightRef = useRef(false);

  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  const loadViewerLevel = useCallback(async () => {
    if (!userId) {
      setViewerLevel(null);
      return;
    }
    try {
      const data = await getUserProfile(userId);
      void applyNotificationPreferencesFromProfile(data);
      setViewerLevel(data.user.level);
    } catch {
      setViewerLevel(null);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void loadViewerLevel();
    }, [loadViewerLevel]),
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void loadContinueLearning().then((data) => {
        if (!cancelled) setContinueLearning(data);
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const recommendedDifficulty = useMemo(
    () => (viewerLevel != null ? difficultyFromUserLevel(viewerLevel) : "EASY"),
    [viewerLevel],
  );

  const orderedQuizEntries = useMemo(() => {
    const games = recommendations?.recommendedGames ?? [];
    if (games.length === 0) return QUIZ_GAME_ENTRIES;
    const order = new Map(games.map((g, i) => [g.category, i]));
    return [...QUIZ_GAME_ENTRIES].sort((a, b) => {
      const ai = a.category === "mixed" ? 999 : (order.get(a.category) ?? 100);
      const bi = b.category === "mixed" ? 999 : (order.get(b.category) ?? 100);
      return ai - bi;
    });
  }, [recommendations?.recommendedGames]);

  const learnRowsForExplore = useMemo(() => {
    const rec = recommendations?.recommendedEducationalContent ?? [];
    const validLearning = learningContent.filter(
      (c) => !isPlaceholderTitle(`${c.title} ${c.description}`),
    );
    if (rec.length === 0) return validLearning;
    const seen = new Set(rec.map((r) => r.id));
    const rest = validLearning.filter((c) => !seen.has(c.id));
    return [...rec, ...rest];
  }, [recommendations?.recommendedEducationalContent, learningContent]);

  const learnCardsForExplore = useMemo<ExploreContentCardItem[]>(() => {
    const cards = learnRowsForExplore
      .filter((item) => !isPlaceholderTitle(`${item.title} ${item.description}`))
      .map((item, index) => educationalContentToCard(item as EducationalContentItem, index));
    return cards.length > 0 ? cards.slice(0, 10) : LEARN_FALLBACK_CARDS;
  }, [learnRowsForExplore]);

  const quickQuizCards = useMemo<ExploreContentCardItem[]>(() => {
    const cards = quickQuizzes
      .filter((quiz) => !isPlaceholderTitle(`${quiz.title} ${quiz.description}`))
      .map(quizToQuickCard);
    return cards.length > 0 ? cards.slice(0, 6) : QUICK_QUIZ_FALLBACK_CARDS;
  }, [quickQuizzes]);

  const exploreForYouMixed = useMemo(() => {
    if (!exploreForYou) return [];
    return interleaveExploreForYou(exploreForYou.content ?? [], exploreForYou.games ?? []);
  }, [exploreForYou]);

  const fetchInitial = useCallback(async () => {
    if (!userId) return;
    lastLoadMoreAt.current = 0;
    setError(null);
    setLoading(true);
    setExploreForYouLoading(true);
    try {
      const [r, rec, forYou] = await Promise.all([
        getExploreFeed(userId, { limit: PAGE_SIZE }),
        getUserRecommendations(userId).catch(() => null),
        getExploreRecommendations(userId).catch(() => null),
      ]);
      setPosts(r.posts);
      setHasMore(r.hasMore);
      setRecommendations(rec);
      setExploreForYou(forYou);
      try {
        const [contentRows, quizRows] = await Promise.all([
          getEducationalContent(),
          Promise.all(
            QUIZ_GAME_ENTRIES.filter((entry) => entry.category !== "mixed").map((entry) =>
              getQuizzes({ category: entry.category }).catch(() => []),
            ),
          ).then((groups) => groups.flat()),
        ]);
        setLearningContent(contentRows);
        setQuickQuizzes(quizRows);
      } catch {
        // No bloquea Explore si falla la sección educativa.
        setLearningContent([]);
        setQuickQuizzes([]);
      }
    } catch {
      setError("No se pudo cargar Explorar.");
      setPosts([]);
      setHasMore(false);
      setLearningContent([]);
      setQuickQuizzes([]);
      setRecommendations(null);
      setExploreForYou(null);
    } finally {
      setLoading(false);
      setExploreForYouLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      if (!userId) {
        setLoading(false);
        return;
      }
      trackEvent("screen_open", { screen: "Explore" });
      void touchChildLastActiveAt();
      void fetchInitial();
    }, [userId, fetchInitial]),
  );

  const onRefresh = useCallback(async () => {
    if (!userId) return;
    lastLoadMoreAt.current = 0;
    setRefreshing(true);
    setError(null);
    setExploreForYouLoading(true);
    try {
      const [r, rec, forYou] = await Promise.all([
        getExploreFeed(userId, { limit: PAGE_SIZE }),
        getUserRecommendations(userId).catch(() => null),
        getExploreRecommendations(userId).catch(() => null),
      ]);
      setPosts(r.posts);
      setHasMore(r.hasMore);
      setRecommendations(rec);
      setExploreForYou(forYou);
      try {
        const [contentRows, quizRows] = await Promise.all([
          getEducationalContent(),
          Promise.all(
            QUIZ_GAME_ENTRIES.filter((entry) => entry.category !== "mixed").map((entry) =>
              getQuizzes({ category: entry.category }).catch(() => []),
            ),
          ).then((groups) => groups.flat()),
        ]);
        setLearningContent(contentRows);
        setQuickQuizzes(quizRows);
      } catch {
        setLearningContent([]);
        setQuickQuizzes([]);
      }
      void loadContinueLearning().then(setContinueLearning);
    } catch {
      setError("No se pudo actualizar.");
      showToast("No se pudo actualizar Explorar.", "error");
    } finally {
      setRefreshing(false);
      setExploreForYouLoading(false);
    }
  }, [userId]);

  const loadMore = useCallback(async () => {
    if (!userId) return;
    if (readOnly) return;
    if (refreshing) return;
    if (loading) return;
    if (!hasMoreRef.current) return;
    if (loadingMoreRef.current) return;

    const current = postsRef.current;
    if (current.length === 0) return;

    const now = Date.now();
    if (now - lastLoadMoreAt.current < LOAD_MORE_THROTTLE_MS) return;
    lastLoadMoreAt.current = now;

    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const r = await getExploreFeed(userId, {
        limit: PAGE_SIZE,
        excludeIds: current.map((p) => p.id),
      });
      let addedCount = 0;
      setPosts((prev) => {
        const next = mergeExplorePostsDedupe(prev, r.posts);
        addedCount = next.length - prev.length;
        return next;
      });
      setHasMore(r.hasMore && addedCount > 0);
    } catch {
      showToast("No se pudieron cargar más publicaciones.", "error");
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [userId, loading, refreshing, readOnly]);

  const onReact = useCallback(
    async (postId: string, type: ReactionType) => {
      if (!userId) return;
      if (readOnly) {
        showToast(READ_ONLY_TOAST_MSG, "error");
        return;
      }
      if (reactionInFlightRef.current) return;
      reactionInFlightRef.current = true;

      let snapshot: FeedPost[] | undefined;
      setPosts((prev) => {
        const cur = prev.find((p) => p.id === postId);
        if (!cur) return prev;
        if (cur.userReaction === type) return prev;
        snapshot = prev;
        return prev.map((p) => (p.id === postId ? bumpReactionOptimistic(p, type) : p));
      });

      if (snapshot === undefined) {
        reactionInFlightRef.current = false;
        return;
      }

      const key = `${postId}:${type}`;
      setPendingKey(key);
      try {
        await createReaction({ userId, postId, type });
        trackEvent("reaction", { postId, type, context: "explore" });
        showToast("Reacción agregada ❤️", "success");
      } catch {
        setPosts(snapshot);
        showToast("No se pudo enviar la reacción.", "error");
      } finally {
        reactionInFlightRef.current = false;
        setPendingKey(null);
      }
    },
    [userId, readOnly],
  );

  const openContentDetail = useCallback(
    (contentId: string) => {
      const root = tabNavigation.getParent() as
        | NativeStackNavigationProp<RootStackParamList>
        | undefined;
      root?.navigate("ContentDetail", { contentId });
    },
    [tabNavigation],
  );

  const openQuiz = useCallback(() => {
    const root = tabNavigation.getParent() as
      | NativeStackNavigationProp<RootStackParamList>
      | undefined;
    root?.navigate("Quiz", { category: "astronomy", difficulty: recommendedDifficulty });
  }, [tabNavigation, recommendedDifficulty]);

  const openQuizByCategory = useCallback(
    (category: QuizCategory) => {
      const root = tabNavigation.getParent() as
        | NativeStackNavigationProp<RootStackParamList>
        | undefined;
      root?.navigate("GameCategory", { category, difficulty: recommendedDifficulty });
    },
    [tabNavigation, recommendedDifficulty],
  );

  const openQuizAreas = useCallback(() => {
    const root = tabNavigation.getParent() as
      | NativeStackNavigationProp<RootStackParamList>
      | undefined;
    root?.navigate("QuizAreas");
  }, [tabNavigation]);

  const openVisualGame = useCallback(
    (category: "astronomy" | "geography", gameId?: string) => {
      const root = tabNavigation.getParent() as
        | NativeStackNavigationProp<RootStackParamList>
        | undefined;
      root?.navigate("VisualGame", { category, difficulty: recommendedDifficulty, gameId });
    },
    [tabNavigation, recommendedDifficulty],
  );

  const openMiniGamesHub = useCallback(() => {
    const root = tabNavigation.getParent() as
      | NativeStackNavigationProp<RootStackParamList>
      | undefined;
    root?.navigate("MiniGamesHub");
  }, [tabNavigation]);

  const handleResumeLastGame = useCallback(() => {
    if (readOnly) {
      showToast(READ_ONLY_TOAST_MSG, "error");
      return;
    }
    const g = continueLearning.game;
    if (!g) return;
    const root = tabNavigation.getParent() as
      | NativeStackNavigationProp<RootStackParamList>
      | undefined;
    if (g.kind === "quiz") {
      root?.navigate("Quiz", {
        category: g.category as QuizCategory,
        difficulty: g.difficulty,
      });
    } else {
      root?.navigate("VisualGame", { category: g.category, difficulty: g.difficulty });
    }
  }, [continueLearning.game, readOnly, tabNavigation]);

  const handleResumeLastContent = useCallback(() => {
    if (readOnly) {
      showToast(READ_ONLY_TOAST_MSG, "error");
      return;
    }
    const c = continueLearning.content;
    if (!c) return;
    const root = tabNavigation.getParent() as
      | NativeStackNavigationProp<RootStackParamList>
      | undefined;
    root?.navigate("ContentDetail", { contentId: c.contentId });
  }, [continueLearning.content, readOnly, tabNavigation]);

  const handleContinue = useCallback(() => {
    if (readOnly) {
      showToast(READ_ONLY_TOAST_MSG, "error");
      return;
    }
    const target = pickMostRecentResumeTarget(continueLearning.game, continueLearning.content);
    if (target === "game") handleResumeLastGame();
    else if (target === "content") handleResumeLastContent();
  }, [
    readOnly,
    continueLearning.game,
    continueLearning.content,
    handleResumeLastGame,
    handleResumeLastContent,
  ]);

  if (!userId && !loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>
          {token
            ? "No hay un menor vinculado para explorar contenido."
            : "Definí EXPO_PUBLIC_USER_ID o iniciá sesión."}
        </Text>
      </View>
    );
  }

  if (loading && posts.length === 0) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top, backgroundColor: colors.background }}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: space.sm,
            paddingHorizontal: space.md,
            paddingBottom: space.sm,
          }}
        >
          <Pressable
            onPress={openChat}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Mensajes con amigos"
            style={{ padding: space.xs }}
          >
            <AppIcon name="chatbubbles-outline" color={colors.link} size="md" />
          </Pressable>
          <Pressable
            onPress={openSettings}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Ajustes"
            style={{ padding: space.xs }}
          >
            <AppIcon name="settings-outline" color={colors.link} size="md" />
          </Pressable>
        </View>
        <View style={[styles.centered, { flex: 1, gap: space.md }]}>
          <AppIcon name="compass-outline" color={colors.primary} size="lg" />
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingHint}>Cargando exploración…</Text>
        </View>
      </View>
    );
  }

  return (
    <FlatList
      data={posts}
      keyExtractor={(item) => item.id}
      contentContainerStyle={[
        posts.length === 0 ? styles.emptyList : styles.list,
        {
          paddingTop: posts.length === 0 ? insets.top + space.md : insets.top + space.sm + space.xs,
        },
      ]}
      refreshControl={
        <RefreshControl
          enabled={!readOnly}
          refreshing={refreshing}
          onRefresh={() => void onRefresh()}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
      onEndReached={() => void loadMore()}
      onEndReachedThreshold={0.4}
      ListHeaderComponent={
        <View style={styles.listHeader}>
          {screenTime.enabled ? <TimeUsageBar /> : null}
          {readOnly ? <ReadOnlyBanner /> : null}
          <View
            style={styles.exploreBrandRow}
            accessibilityRole="header"
            accessibilityLabel={APP_TAGLINE}
          >
            <BrandLogo width={36} height={36} />
            <View style={styles.exploreBrandTextCol}>
              <Text style={[styles.exploreBrandTitle, { color: colors.text }]}>EduPlay</Text>
              <Text style={[styles.exploreBrandTagline, { color: colors.textMuted }]}>
                {appTaglineSubtitle()}
              </Text>
            </View>
          </View>
          <View style={styles.heroTitleRow}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: space.sm,
                flex: 1,
                minWidth: 0,
              }}
            >
              <AppIcon name="compass-outline" color={colors.exploreHeroTitle} size="lg" />
              <Text style={styles.heroTitle}>Descubrir</Text>
            </View>
            <View style={styles.heroTitleActions}>
              <AppIcon name="search-outline" color={colors.exploreHeroTitle} size="lg" />
              <Pressable
                onPress={openChat}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Mensajes con amigos"
                style={{ padding: 4 }}
              >
                <AppIcon name="chatbubbles-outline" color={colors.link} size="md" />
              </Pressable>
              <Pressable
                onPress={openSettings}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Ajustes"
                style={{ padding: 4 }}
              >
                <AppIcon name="settings-outline" color={colors.link} size="md" />
              </Pressable>
            </View>
          </View>
          <Text style={styles.heroSubtitle}>✨ Ideas, logros y tendencias mezclados para vos</Text>

          <ContinueLearningSection
            game={continueLearning.game}
            content={continueLearning.content}
            readOnly={readOnly}
            onContinue={handleContinue}
          />

          {error ? <Text style={styles.inlineErr}>{error}</Text> : null}

          {exploreForYouLoading && !exploreForYou ? (
            <View style={[styles.recForYouSection, { alignItems: "flex-start" }]}>
              <Text style={styles.recForYouTitle}>⭐ Recomendado para vos</Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: space.sm,
                  marginTop: space.sm,
                }}
              >
                <ActivityIndicator color={colors.primary} />
                <Text style={[styles.recForYouSubtitle, { marginBottom: 0 }]}>
                  {t("explore.loading")}
                </Text>
              </View>
            </View>
          ) : exploreForYouMixed.length > 0 ? (
            <View style={styles.recForYouSection}>
              <Text style={styles.recForYouTitle}>⭐ Recomendado para vos</Text>
              <Text style={styles.recForYouSubtitle}>
                Contenido y juegos mezclados según tus intereses
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.recForYouScroll}
              >
                {exploreForYouMixed.map((row) => {
                  if (row.kind === "content") {
                    const item = row.item;
                    return (
                      <ContentCard
                        key={`c-${item.id}`}
                        id={item.id}
                        title={item.title}
                        description={item.description}
                        type="learn"
                        category={contentCardCategory(item.category)}
                        difficulty={contentCardDifficulty(item.difficulty)}
                        duration={8}
                        xpReward={10}
                        thumbnail={item.imageUrl ?? undefined}
                        compact
                        onPress={() => {
                          if (readOnly) {
                            showToast(READ_ONLY_TOAST_MSG, "error");
                            return;
                          }
                          openContentDetail(item.id);
                        }}
                        style={styles.recForYouLearnCard}
                      />
                    );
                  }
                  const g = row.item;
                  if (g.kind === "quiz") {
                    return (
                      <Pressable
                        key={`q-${g.id}`}
                        onPress={() => {
                          if (readOnly) {
                            showToast(READ_ONLY_TOAST_MSG, "error");
                            return;
                          }
                          openQuizByCategory(toQuizCategoryFromApi(g.category));
                        }}
                        style={({ pressed }) => [
                          styles.recForYouGameCard,
                          pressed && styles.gameCardPressed,
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={`Quiz: ${g.question}`}
                      >
                        <View style={styles.recForYouMixedBadge}>
                          <Text style={styles.recForYouMixedBadgeText}>🎮 Quiz</Text>
                        </View>
                        <Text style={styles.recForYouGameTitle} numberOfLines={3}>
                          {g.question}
                        </Text>
                        <Text style={styles.recForYouGameMeta} numberOfLines={1}>
                          {g.category} · {g.difficulty}
                        </Text>
                      </Pressable>
                    );
                  }
                  return (
                    <Pressable
                      key={`v-${g.id}`}
                      onPress={() => {
                        if (readOnly) {
                          showToast(READ_ONLY_TOAST_MSG, "error");
                          return;
                        }
                        openVisualGame(toVisualCategoryFromApi(g.category));
                      }}
                      style={({ pressed }) => [
                        styles.recForYouGameCard,
                        pressed && styles.gameCardPressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Juego visual: ${g.question}`}
                    >
                      <View style={styles.recForYouMixedBadge}>
                        <Text style={styles.recForYouMixedBadgeText}>🖼️ Visual</Text>
                      </View>
                      {g.imageUrl ? (
                        <Image
                          source={{ uri: g.imageUrl }}
                          style={styles.recForYouMixedThumb}
                          resizeMode="cover"
                        />
                      ) : null}
                      <Text style={styles.recForYouGameTitle} numberOfLines={2}>
                        {g.question}
                      </Text>
                      <Text style={styles.recForYouGameMeta} numberOfLines={1}>
                        {g.category} · {g.difficulty}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}

          <View style={styles.gamesSection}>
            <Text style={styles.gamesSectionTitle}>🎮 Juegos</Text>
            <Pressable
              onPress={() => {
                if (readOnly) {
                  showToast(READ_ONLY_TOAST_MSG, "error");
                  return;
                }
                openMiniGamesHub();
              }}
              style={({ pressed }) => [
                styles.quizCtaBtn,
                { marginBottom: space.md },
                pressed && styles.quizCtaBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Abrir minijuegos EduPlay"
            >
              <Text style={styles.quizCtaText}>🧩 Minijuegos EduPlay (10 juegos · 22 niveles)</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (readOnly) {
                  showToast(READ_ONLY_TOAST_MSG, "error");
                  return;
                }
                openQuizAreas();
              }}
              style={({ pressed }) => [
                styles.quizCtaBtn,
                { marginBottom: space.md },
                pressed && styles.quizCtaBtnPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Abrir quizzes por área de conocimiento"
            >
              <Text style={styles.quizCtaText}>🧭 Quizzes por área (7 materias)</Text>
            </Pressable>
            <Text style={styles.gamesDifficultyHint}>
              Conectado a /api/quizzes?category=X · fallback con preguntas reales si no hay datos.
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.gamesCardsRow}
            >
              {orderedQuizEntries.map((entry) => (
                <ContentCard
                  key={entry.category}
                  id={`area-${entry.category}`}
                  title={`${entry.icon} ${entry.title}`}
                  description={`${entry.description}${entry.ageRange ? ` · ${entry.ageRange}` : ""}${
                    entry.sampleQuestions?.[0] ? ` · Ej: ${entry.sampleQuestions[0]}` : ""
                  }`}
                  type="quiz"
                  category={contentCardCategory(entry.category)}
                  difficulty={entry.difficulty}
                  duration={entry.category === "mixed" ? 5 : 8}
                  xpReward={entry.difficulty === "medium" ? 18 : 15}
                  onPress={() => openQuizByCategory(entry.category)}
                  compact
                  style={styles.gameCard}
                />
              ))}
            </ScrollView>
          </View>
          <View style={styles.gamesSection}>
            <Text style={styles.gamesSectionTitle}>🎮 Juegos visuales</Text>
            <Text style={styles.gamesDifficultyHint}>
              Imágenes reales, progreso guardado y XP por nivel completado.
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.gamesCardsRow}
            >
              {VISUAL_GAME_ENTRIES.map((entry) => (
                <ContentCard
                  key={`visual-${entry.gameId}`}
                  id={entry.gameId}
                  title={entry.title}
                  description={`${entry.description} · ${entry.levels} niveles · ${entry.xpLabel}`}
                  type="game"
                  category={entry.cardCategory}
                  difficulty={entry.cardDifficulty}
                  duration={entry.levels}
                  xpReward={entry.gameId === "identify-country" ? 15 : 10}
                  onPress={() => openVisualGame(entry.category, entry.gameId)}
                  compact
                  style={styles.gameCard}
                />
              ))}
            </ScrollView>
          </View>
          <View style={styles.learnSection}>
            <Text style={styles.learnSectionTitle}>📚 Aprender</Text>
            <Text style={styles.gamesDifficultyHint}>
              Contenido desde /api/content · fallback educativo si no hay datos.
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.learnCardsRow}
            >
              {learnCardsForExplore.map((item) => (
                <ContentCard
                  key={item.id}
                  {...item}
                  compact
                  onPress={() => {
                    if (item.contentId) {
                      openContentDetail(item.contentId);
                      return;
                    }
                    if (item.type === "quiz") openQuizByCategory(item.quizCategory ?? "math");
                    else if (item.type === "game") openVisualGame("geography");
                  }}
                  style={styles.learnCard}
                />
              ))}
            </ScrollView>
            <Text style={[styles.learnSectionTitle, { marginTop: space.lg }]}>🎯 Quiz rápido</Text>
            <Text style={styles.gamesDifficultyHint}>
              Quizzes desde /api/quizzes · tarjetas express si no hay datos.
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.learnCardsRow}
            >
              {quickQuizCards.map((item) => (
                <ContentCard
                  key={item.id}
                  {...item}
                  compact
                  onPress={() => openQuizByCategory(item.quizCategory ?? "mixed")}
                  style={styles.learnCard}
                />
              ))}
            </ScrollView>
          </View>
        </View>
      }
      ListEmptyComponent={
        <BrandEmptyState
          emoji="🧭"
          title={error ? "No se pudo cargar Explorar" : "Todavía no hay nada para mostrar"}
          subtitle={
            error
              ? "Probá tirar para actualizar."
              : "Volvé en un momento para descubrir más publicaciones."
          }
        />
      }
      ItemSeparatorComponent={() => <View style={styles.postSeparator} />}
      ListFooterComponent={
        loadingMore ? (
          <View style={styles.footerLoad}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.footerLoadText}>{t("explore.loading")}</Text>
          </View>
        ) : !hasMore && posts.length > 0 ? (
          <Text style={styles.footerEndText}>No hay más publicaciones</Text>
        ) : null
      }
      renderItem={({ item }) => (
        <ExplorePostCard
          item={item}
          pendingKey={pendingKey}
          actionsBlocked={readOnly}
          onReact={onReact}
        />
      )}
    />
  );
}
