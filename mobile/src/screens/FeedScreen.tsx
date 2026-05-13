import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp, BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ContinueLearningSection } from "../components/ContinueLearningSection";
import { ContentCard, type ContentCardCategory, type ContentCardDifficulty } from "../components/ContentCard";
import { AnimatedFeedItem } from "../components/AnimatedFeedItem";
import { AppIcon } from "../components/AppIcon";
import { BrandEmptyState } from "../components/BrandEmptyState";
import { BrandLogo } from "../components/BrandLogo";
import { FeedPostTypeLabel } from "../components/FeedPostTypeLabel";
import { PostCategoryTag } from "../components/PostCategoryTag";
import { PostReactionBar } from "../components/PostReactionBar";
import { ReadOnlyBanner } from "../components/ReadOnlyBanner";
import { TimeUsageBar } from "../components/TimeUsageBar";
import { VIEWER_USER_ID } from "../config";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { usePostOnboarding } from "../contexts/PostOnboardingContext";
import { READ_ONLY_TOAST_MSG, useScreenTime } from "../contexts/ScreenTimeContext";
import { showToast } from "../lib/toastBus";
import { trackEvent } from "../services/analytics";
import {
  createReaction,
  createUserPost,
  getAvailableMissions,
  getContentFeed,
  getContentRecommended,
  getPosts,
  type ApiRecommendedContentCard,
  type ContentFeedResponse,
  type ReactionType,
} from "../services/api";
import { getRarityBadgeVisual } from "../lib/achievementRarityUi";
import {
  categoryDisplayLabel,
  CONTENT_CATEGORIES_UI,
  getCategoryChrome,
  getCategoryUi,
} from "../lib/contentCategoryUi";
import { bumpReactionOptimistic, getReactionCounts } from "../lib/reactionCounts";
import type { FeedPost } from "../types/api";
import type { MainTabParamList, RootStackParamList } from "../navigation/types";
import { evaluateFeedInactivityReminder, touchChildLastActiveAt } from "../lib/activityReminders";
import {
  loadContinueLearning,
  pickMostRecentResumeTarget,
  type LastContentOpened,
  type LastGamePlayed,
} from "../lib/continueLearningStorage";
import { feedLabelFromPostType } from "../lib/feedLabels";
import { interleaveFeedPostsByType } from "../lib/feedMix";
import { formatFeedTime } from "../lib/feedTime";
import { isRemoteAvatarUrl } from "../lib/avatarDisplay";
import { useFeedStyles } from "./feedScreenStyles";

type Props = BottomTabScreenProps<MainTabParamList, "Feed">;

type QuizCategory = "astronomy" | "math" | "science" | "history" | "geography" | "creativity" | "mixed";

const CREATE_POST_MAX_LENGTH = 200;
const FEED_LOAD_ERROR_MSG = "No se pudo cargar el feed";
const CREATE_POST_ERROR_MSG = "Error al publicar";
const RETRY_HINT_MSG = "Intentalo de nuevo";

type FeedRecommendationCard = {
  id: string;
  title: string;
  description: string;
  type: "learn" | "quiz" | "game" | "mission" | "video" | "reading";
  category: ContentCardCategory;
  difficulty: ContentCardDifficulty;
  duration?: number;
  progress?: number;
  xpReward: number;
  thumbnail?: string;
  isNew?: boolean;
  isCompleted?: boolean;
  contentId?: string;
};

const FALLBACK_RECOMMENDATIONS: FeedRecommendationCard[] = [
  {
    id: "fallback-astronauta",
    title: "🚀 Misión: Astronauta por un Día",
    description: "Explora el sistema solar",
    type: "learn",
    category: "ciencias",
    difficulty: "easy",
    duration: 12,
    xpReward: 20,
    isNew: true,
  },
  {
    id: "fallback-suma-resta",
    title: "🔢 Quiz: Suma y Resta Divertida",
    description: "Matemáticas nivel 1",
    type: "quiz",
    category: "matematicas",
    difficulty: "easy",
    duration: 5,
    xpReward: 15,
  },
  {
    id: "fallback-dinosaurios",
    title: "🦕 Mini Documental: Dinosaurios",
    description: "Historia prehistórica",
    type: "video",
    category: "historia",
    difficulty: "medium",
    duration: 8,
    xpReward: 12,
  },
  {
    id: "fallback-volcan",
    title: "🧪 Experimento: Volcán Casero",
    description: "Ciencias naturales",
    type: "learn",
    category: "ciencias",
    difficulty: "medium",
    duration: 15,
    xpReward: 18,
  },
  {
    id: "fallback-europa",
    title: "🌍 Adivina el País: Europa",
    description: "Geografía visual",
    type: "game",
    category: "geografia",
    difficulty: "medium",
    duration: 7,
    xpReward: 15,
  },
  {
    id: "fallback-luna",
    title: "📖 Cuento: La Aventura de Luna",
    description: "Comprensión lectora",
    type: "reading",
    category: "lenguaje",
    difficulty: "easy",
    duration: 10,
    xpReward: 14,
  },
  {
    id: "fallback-colores",
    title: "🎨 Quiz: Colores y Mezclas",
    description: "Arte y creatividad",
    type: "quiz",
    category: "arte",
    difficulty: "easy",
    duration: 5,
    xpReward: 15,
  },
  {
    id: "fallback-egipto",
    title: "🔍 Detective de Historia: Egipto",
    description: "Historia antigua",
    type: "game",
    category: "historia",
    difficulty: "medium",
    duration: 10,
    xpReward: 18,
  },
  {
    id: "fallback-orquesta",
    title: "🎵 Conoce la Orquesta",
    description: "Música e instrumentos",
    type: "learn",
    category: "arte",
    difficulty: "easy",
    duration: 9,
    xpReward: 12,
  },
  {
    id: "fallback-naturaleza",
    title: "🌱 Guardián de la Naturaleza",
    description: "Ecología y medio ambiente",
    type: "mission",
    category: "ciencias",
    difficulty: "medium",
    duration: 20,
    xpReward: 25,
  },
];

function contentCardDifficulty(raw: string): ContentCardDifficulty {
  if (raw === "HARD") return "hard";
  if (raw === "MEDIUM") return "medium";
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

function contentCardType(item: ApiRecommendedContentCard): FeedRecommendationCard["type"] {
  const badge = item.badge?.toUpperCase();
  const rawType = item.type?.toUpperCase();
  if (badge === "CUESTIONARIO") return "quiz";
  if (badge === "JUEGO") return "game";
  if (badge === "MISIÓN") return "mission";
  if (rawType === "VIDEO") return "video";
  if (rawType === "READING") return "reading";
  return "learn";
}

function apiContentToFeedCard(item: ApiRecommendedContentCard, index: number): FeedRecommendationCard {
  return {
    id: item.id,
    contentId: item.id,
    title: item.title,
    description: item.description,
    type: contentCardType(item),
    category: contentCardCategory(item.category),
    difficulty: contentCardDifficulty(item.difficulty),
    duration: item.type === "VIDEO" ? 6 : 8,
    progress: item.progress?.percentage,
    xpReward: 10,
    thumbnail: item.thumbnail ?? item.imageUrl ?? undefined,
    isNew: index < 3 && !item.progress,
    isCompleted: item.progress?.completed,
  };
}

function RecommendedForYouSection({
  items,
  loading,
  visible,
  readOnly,
  highlighted,
  onOpenEducational,
}: {
  items: FeedRecommendationCard[];
  loading: boolean;
  visible: boolean;
  readOnly: boolean;
  /** Resaltar bloque tras completar onboarding. */
  highlighted?: boolean;
  onOpenEducational?: (contentId: string) => void;
}) {
  const styles = useFeedStyles();
  const { colors } = useTheme();
  const [hScrollViewport, setHScrollViewport] = useState(0);
  const [hScrollContent, setHScrollContent] = useState(0);
  const [hScrollX, setHScrollX] = useState(0);

  const hOverflow = hScrollViewport > 0 && hScrollContent > hScrollViewport + 4;
  const hMaxScroll = Math.max(1, hScrollContent - hScrollViewport);
  const hProgress = hOverflow ? Math.min(1, Math.max(0, hScrollX / hMaxScroll)) : 0;
  const hThumbPct = hOverflow ? Math.max(14, Math.min(100, (hScrollViewport / hScrollContent) * 100)) : 100;
  const hThumbLeftPct = hOverflow ? hProgress * (100 - hThumbPct) : 0;

  const onRecommendedScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setHScrollX(e.nativeEvent.contentOffset.x);
    const vw = e.nativeEvent.layoutMeasurement.width;
    const cw = e.nativeEvent.contentSize.width;
    if (vw > 0) setHScrollViewport(vw);
    if (cw > 0) setHScrollContent(cw);
  }, []);

  useEffect(() => {
    setHScrollX(0);
    setHScrollViewport(0);
    setHScrollContent(0);
  }, [items]);

  if (!visible) return null;

  const highlightRing = highlighted ? styles.recommendedSectionHighlightActive : undefined;

  if (loading && items.length === 0) {
    return (
      <View style={[styles.recommendedSectionOuter, highlightRing]}>
        <View style={[styles.recommendedWrap, styles.recommendedLoadingBox]}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.recommendedLoadingText}>Cargando recomendaciones…</Text>
        </View>
      </View>
    );
  }

  if (items.length === 0) return null;

  return (
    <View style={[styles.recommendedSectionOuter, highlightRing]}>
      <View style={styles.recommendedWrap} accessibilityRole="summary" accessibilityLabel="Recomendado para vos">
        <View style={styles.recommendedGlow} pointerEvents="none" />
        <View style={styles.recommendedInner}>
          <View style={styles.recommendedTitleRow}>
            <AppIcon name="sparkles-outline" color={colors.recTitle} size="lg" />
            <View style={styles.recommendedTitleTextCol}>
              <Text style={styles.recommendedTitle}>✨ Recomendado para vos</Text>
              <Text style={styles.recommendedSubtitle}>Contenido educativo real para seguir aprendiendo</Text>
            </View>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator
            nestedScrollEnabled
            scrollEventThrottle={16}
            contentContainerStyle={styles.recGamesScrollContent}
            onScroll={onRecommendedScroll}
            onLayout={(e) => {
              const w = e.nativeEvent.layout.width;
              if (w > 0) setHScrollViewport(w);
            }}
            onContentSizeChange={(w) => {
              if (w > 0) setHScrollContent(w);
            }}
          >
            {items.map((item) => (
              <ContentCard
                key={item.id}
                {...item}
                compact
                onPress={() => {
                  if (readOnly) {
                    showToast(READ_ONLY_TOAST_MSG, "error");
                    return;
                  }
                  if (item.contentId) {
                    onOpenEducational?.(item.contentId);
                    return;
                  }
                  if (item.type === "quiz") {
                    showToast("Abrí Explorar para jugar este cuestionario.", "success");
                    return;
                  }
                  if (item.type === "mission") {
                    showToast("Misión disponible en Explorar.", "success");
                  }
                }}
                style={styles.recGameChip}
              />
            ))}
          </ScrollView>
          {hOverflow ? (
            <View
              style={styles.recHorizontalScrollTrack}
              accessibilityElementsHidden={false}
              importantForAccessibility="yes"
              accessibilityRole="scrollbar"
              accessibilityLabel="Avance horizontal en recomendados"
              accessibilityValue={{
                min: 0,
                max: 100,
                now: Math.round(hProgress * 100),
              }}
            >
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: `${hThumbLeftPct}%`,
                  width: `${hThumbPct}%`,
                  height: "100%",
                  borderRadius: 2,
                  backgroundColor: colors.primary,
                }}
              />
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function FeedPostCardHeader({
  username,
  avatarUrl,
  category,
  feedLabel,
  postType,
  createdAt,
  createdAtFormatted,
}: {
  username: string;
  avatarUrl: string | null;
  category?: string;
  feedLabel?: string;
  postType?: string;
  createdAt: string;
  createdAtFormatted?: string;
}) {
  const styles = useFeedStyles();
  const initial = username.trim().charAt(0).toUpperCase() || "?";
  const [imageFailed, setImageFailed] = useState(false);
  const timeLabel = formatFeedTime(createdAt, createdAtFormatted);
  const typeLabel = feedLabel ?? feedLabelFromPostType(postType);
  const remote = isRemoteAvatarUrl(avatarUrl);
  const glyph = avatarUrl && !remote ? avatarUrl.trim() : null;

  useEffect(() => {
    setImageFailed(false);
  }, [avatarUrl]);

  const showPlaceholder = !avatarUrl || (remote && imageFailed);

  return (
    <View style={styles.cardHeader}>
      <View style={styles.avatarOuterCompact}>
        {glyph ? (
          <View style={styles.avatarPlaceholderCompact}>
            <Text style={styles.avatarEmojiCompact}>{glyph}</Text>
          </View>
        ) : showPlaceholder ? (
          <View style={styles.avatarPlaceholderCompact}>
            <Text style={styles.avatarPlaceholderTextCompact}>{initial}</Text>
          </View>
        ) : (
          <Image
            source={{ uri: avatarUrl as string }}
            style={styles.avatarImageCompact}
            onError={() => setImageFailed(true)}
          />
        )}
      </View>
      <View style={styles.cardHeaderTextCol}>
        <View style={styles.nameTimeRow}>
          <Text style={styles.username} numberOfLines={1}>
            {username}
          </Text>
          {timeLabel ? (
            <>
              <Text style={styles.timeSeparator} accessibilityElementsHidden>
                {" "}
                ·{" "}
              </Text>
              <Text style={styles.timeMeta} numberOfLines={1}>
                {timeLabel}
              </Text>
            </>
          ) : null}
        </View>
        <View style={styles.feedTypeAndCategoryRow}>
          {typeLabel ? <FeedPostTypeLabel label={typeLabel} compact /> : null}
          <PostCategoryTag category={category} compact inline />
        </View>
      </View>
    </View>
  );
}

const POST_ONBOARDING_TOAST_MSG = "Te recomendamos contenido basado en tus intereses 🎯";

export function FeedScreen({ route }: Props) {
  const styles = useFeedStyles();
  const { colors, mode } = useTheme();
  const isDark = mode === "dark";
  const tabNavigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const { viewerUserId: authViewerId, token } = useAuth();
  const { pendingFeedWelcome, consumePendingFeedWelcome } = usePostOnboarding();
  const userId =
    authViewerId?.trim() ||
    route.params?.userId?.trim() ||
    (token ? "" : VIEWER_USER_ID);
  const screenTime = useScreenTime();
  const readOnly = screenTime.readOnlyMode;
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [draftContent, setDraftContent] = useState("");
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  /** Cualquier GET de posts en curso (incluye refresco en silencio). */
  const [fetchingPosts, setFetchingPosts] = useState(false);
  const createPostLockRef = useRef(false);
  const reactionInFlightRef = useRef(false);
  const fetchInFlightRef = useRef(false);
  const [recommendations, setRecommendations] = useState<FeedRecommendationCard[]>(FALLBACK_RECOMMENDATIONS);
  const [apiContinueItem, setApiContinueItem] = useState<ContentFeedResponse["continue"]>(null);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  /** `null` = todas las categorías. */
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  /** Tras onboarding: resaltar sección «Recomendado para vos». */
  const [recommendSectionHighlighted, setRecommendSectionHighlighted] = useState(false);
  /** Recordatorio si el menor estuvo mucho tiempo sin usar la app (ver `activityReminders`). */
  const [inactivityReminder, setInactivityReminder] = useState<{ visible: boolean; text: string }>({
    visible: false,
    text: "",
  });
  const [continueLearning, setContinueLearning] = useState<{
    game: LastGamePlayed | null;
    content: LastContentOpened | null;
  }>({ game: null, content: null });

  const openEducationalFromRec = useCallback(
    (contentId: string) => {
      const root = tabNavigation.getParent() as NativeStackNavigationProp<RootStackParamList> | undefined;
      root?.navigate("ContentDetail", { contentId });
    },
    [tabNavigation]
  );

  const handleResumeLastGame = useCallback(() => {
    if (readOnly) {
      showToast(READ_ONLY_TOAST_MSG, "error");
      return;
    }
    const g = continueLearning.game;
    if (!g) return;
    const root = tabNavigation.getParent() as NativeStackNavigationProp<RootStackParamList> | undefined;
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
    const root = tabNavigation.getParent() as NativeStackNavigationProp<RootStackParamList> | undefined;
    root?.navigate("ContentDetail", { contentId: c.contentId });
  }, [continueLearning.content, readOnly, tabNavigation]);

  const handleContinue = useCallback(() => {
    if (readOnly) {
      showToast(READ_ONLY_TOAST_MSG, "error");
      return;
    }
    if (apiContinueItem?.id) {
      openEducationalFromRec(apiContinueItem.id);
      return;
    }
    const target = pickMostRecentResumeTarget(continueLearning.game, continueLearning.content);
    if (target === "game") handleResumeLastGame();
    else if (target === "content") handleResumeLastContent();
  }, [
    readOnly,
    apiContinueItem,
    openEducationalFromRec,
    continueLearning.game,
    continueLearning.content,
    handleResumeLastGame,
    handleResumeLastContent,
  ]);

  /** Primera vez que el usuario entra al Feed con este `userId` → loader a pantalla completa; después, refresco en silencio. */
  const shouldShowFullScreenLoaderRef = useRef(true);

  useEffect(() => {
    shouldShowFullScreenLoaderRef.current = true;
  }, [userId]);

  useEffect(() => {
    setCategoryFilter(null);
  }, [userId]);

  useEffect(() => {
    if (!pendingFeedWelcome || !userId) return;
    showToast(POST_ONBOARDING_TOAST_MSG, "success");
    consumePendingFeedWelcome();
    setRecommendSectionHighlighted(true);
    const t = setTimeout(() => setRecommendSectionHighlighted(false), 12_000);
    return () => clearTimeout(t);
  }, [pendingFeedWelcome, userId, consumePendingFeedWelcome]);

  const filteredPosts = useMemo(() => {
    const base = !categoryFilter ? posts : posts.filter((p) => p.category === categoryFilter);
    // El API ya intercala el feed completo; solo reintercalamos al filtrar por categoría.
    if (!categoryFilter) return base;
    return interleaveFeedPostsByType(base);
  }, [posts, categoryFilter]);

  type FetchFeedOptions = {
    /** Spinner que tapa la lista (solo 1.er foco o lista vacía). */
    showFullScreenLoading?: boolean;
    /** Indicador pull-to-refresh. */
    isPullToRefresh?: boolean;
  };

  const fetchFeed = useCallback(
    async (opts: FetchFeedOptions = {}): Promise<boolean> => {
      const { showFullScreenLoading = false, isPullToRefresh = false } = opts;
      if (!userId) {
        setError("Falta userId. Define EXPO_PUBLIC_USER_ID o pasa userId en params.");
        setPosts([]);
        setLoading(false);
        setRefreshing(false);
        setFetchingPosts(false);
        return false;
      }
      if (fetchInFlightRef.current && !isPullToRefresh) {
        return false;
      }
      fetchInFlightRef.current = true;
      setError(null);
      setFetchingPosts(true);
      if (isPullToRefresh) {
        setRefreshing(true);
      } else if (showFullScreenLoading) {
        setLoading(true);
      }

      try {
        const data = await getPosts(userId);
        setPosts(data);
        setError(null);
        return true;
      } catch {
        const friendlyFeedError = `${FEED_LOAD_ERROR_MSG}. ${RETRY_HINT_MSG}.`;
        setError(friendlyFeedError);
        setPosts((prev) => {
          if (isPullToRefresh) return prev;
          if (!showFullScreenLoading && prev.length > 0) return prev;
          return [];
        });
        if (isPullToRefresh) {
          showToast(friendlyFeedError, "error");
        }
        return false;
      } finally {
        fetchInFlightRef.current = false;
        setLoading(false);
        setRefreshing(false);
        setFetchingPosts(false);
      }
    },
    [userId]
  );

  const fetchRecommendations = useCallback(async () => {
    if (!userId) {
      setRecommendations(FALLBACK_RECOMMENDATIONS);
      setApiContinueItem(null);
      return;
    }
    setRecommendationsLoading(true);
    try {
      const [recommended, missions, feed] = await Promise.all([
        getContentRecommended().catch(() => ({ contents: [] })),
        getAvailableMissions().catch(() => []),
        getContentFeed().catch(() => null),
      ]);
      const contentCards = recommended.contents.map(apiContentToFeedCard);
      const missionCards: FeedRecommendationCard[] = missions.slice(0, 4).map((mission) => ({
        id: `mission-${mission.id}`,
        title: mission.title.startsWith("🌱") ? mission.title : `🌱 ${mission.title}`,
        description: mission.theme,
        type: "mission",
        category: "ciencias",
        difficulty: "medium",
        duration: mission.stepCount * 4,
        progress: mission.progress?.percentage,
        xpReward: 25,
        isCompleted: mission.progress?.completed,
      }));
      const merged = [...contentCards, ...missionCards];
      setRecommendations(merged.length > 0 ? merged : FALLBACK_RECOMMENDATIONS);
      setApiContinueItem(feed?.continue ?? null);
    } catch {
      setRecommendations(FALLBACK_RECOMMENDATIONS);
      setApiContinueItem(null);
    } finally {
      setRecommendationsLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      if (!userId) {
        setLoading(false);
        setRefreshing(false);
        return;
      }
      trackEvent("screen_open", { screen: "Feed" });
      const full = shouldShowFullScreenLoaderRef.current;
      shouldShowFullScreenLoaderRef.current = false;
      void fetchFeed({ showFullScreenLoading: full, isPullToRefresh: false });
      void fetchRecommendations();

      let cancelled = false;
      void (async () => {
        try {
          const { show, message } = await evaluateFeedInactivityReminder();
          if (!cancelled) setInactivityReminder({ visible: show, text: message });
        } catch {
          if (!cancelled) setInactivityReminder({ visible: false, text: "" });
          void touchChildLastActiveAt();
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [userId, fetchFeed, fetchRecommendations])
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
    }, [])
  );

  const onRefresh = useCallback(() => {
    void fetchFeed({ isPullToRefresh: true, showFullScreenLoading: false });
    void fetchRecommendations();
  }, [fetchFeed, fetchRecommendations]);

  const closeCreateModal = useCallback(() => {
    setCreateOpen(false);
    setDraftContent("");
    setCreateSubmitting(false);
    setCreateError(null);
  }, []);

  const onSubmitCreatePost = useCallback(async () => {
    if (!userId) return;
    if (readOnly) {
      showToast(READ_ONLY_TOAST_MSG, "error");
      return;
    }
    const text = draftContent.trim();
    if (!text || text.length > CREATE_POST_MAX_LENGTH) return;
    if (createPostLockRef.current || createSubmitting) return;
    createPostLockRef.current = true;
    setCreateError(null);
    setCreateSubmitting(true);
    try {
      await createUserPost({
        userId,
        content: text,
        type: "POST",
        visibility: "PUBLIC",
      });
      trackEvent("post_created", { contentLength: text.length, visibility: "PUBLIC" });
      closeCreateModal();
      showToast("Post publicado 🎉", "success");
      const feedOk = await fetchFeed({ showFullScreenLoading: false, isPullToRefresh: false });
      if (!feedOk) {
        showToast(`${FEED_LOAD_ERROR_MSG}. ${RETRY_HINT_MSG}.`, "error");
      }
    } catch {
      const friendlyCreateError = `${CREATE_POST_ERROR_MSG}. ${RETRY_HINT_MSG}.`;
      setCreateError(friendlyCreateError);
      showToast(friendlyCreateError, "error");
    } finally {
      createPostLockRef.current = false;
      setCreateSubmitting(false);
    }
  }, [userId, draftContent, fetchFeed, closeCreateModal, readOnly]);

  const onReact = useCallback(
    async (postId: string, type: ReactionType) => {
      if (!userId) return;
      if (readOnly) {
        showToast(READ_ONLY_TOAST_MSG, "error");
        return;
      }
      if (reactionInFlightRef.current) return;
      reactionInFlightRef.current = true;

      let snapshotPosts: FeedPost[] | undefined;
      setPosts((prev) => {
        const cur = prev.find((p) => p.id === postId);
        if (!cur) return prev;
        if (cur.userReaction === type) return prev;
        snapshotPosts = prev;
        return prev.map((p) => (p.id === postId ? bumpReactionOptimistic(p, type) : p));
      });

      if (snapshotPosts === undefined) {
        reactionInFlightRef.current = false;
        return;
      }

      const key = `${postId}:${type}`;
      setPendingKey(key);
      try {
        await createReaction({ userId, postId, type });
        trackEvent("reaction", { postId, type, context: "feed" });
        showToast("Reacción agregada ❤️", "success");
      } catch {
        if (snapshotPosts !== undefined) setPosts(snapshotPosts);
        showToast("No se pudo enviar la reacción. Intentalo de nuevo.", "error");
      } finally {
        reactionInFlightRef.current = false;
        setPendingKey(null);
      }
    },
    [userId, readOnly]
  );

  if (!userId && !loading) {
    return (
      <View style={styles.centered}>
        <AppIcon name="people-outline" color={colors.textMuted} size="lg" />
        <Text style={styles.errorText}>
          {token ? (
            <>
              Tu cuenta de tutor no tiene ningún menor vinculado en la base de datos. Hace falta un usuario hijo
              asociado a tu cuenta para ver el feed.
            </>
          ) : (
            <>
              En la carpeta <Text style={styles.mono}>mobile</Text>, editá{" "}
              <Text style={styles.mono}>.env</Text> y poné{" "}
              <Text style={styles.mono}>EXPO_PUBLIC_USER_ID</Text> con el UUID de un menor, o iniciá sesión con un
              tutor que tenga hijos cargados.
            </>
          )}
        </Text>
      </View>
    );
  }

  if (loading && posts.length === 0) {
    return (
      <View style={styles.centered}>
        <AppIcon name="newspaper-outline" color={colors.primary} size="lg" />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingHint}>Cargando publicaciones…</Text>
      </View>
    );
  }

  if (error && posts.length === 0) {
    return (
      <View style={styles.centered}>
        <AppIcon name="cloud-offline-outline" color={colors.error} size="lg" />
        <Text style={styles.errorText}>{error}</Text>
        <Pressable
          style={styles.retryBtn}
          onPress={() => void fetchFeed({ showFullScreenLoading: true, isPullToRefresh: false })}
          accessibilityRole="button"
          accessibilityLabel="Intentalo de nuevo"
        >
          <AppIcon name="refresh" color={colors.textOnPrimary} size="md" />
          <Text style={styles.retryBtnText}>Intentalo de nuevo</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <Modal
        visible={createOpen}
        animationType="slide"
        transparent
        onRequestClose={createSubmitting ? undefined : closeCreateModal}
      >
        <View style={styles.modalRoot}>
          <Pressable
            style={styles.modalDismissArea}
            onPress={createSubmitting ? undefined : closeCreateModal}
            disabled={createSubmitting}
            accessibilityLabel="Cerrar"
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.modalKb}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalTitleRow}>
                <AppIcon name="create-outline" color={colors.primary} size="md" />
                <Text style={styles.modalTitle}>Nuevo post</Text>
              </View>
              <Text style={styles.modalSubtitle}>Compartí algo que hayas aprendido con tus amigos.</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="¿Qué aprendiste hoy?"
                placeholderTextColor={colors.placeholder}
                multiline
                maxLength={CREATE_POST_MAX_LENGTH}
                value={draftContent}
                onChangeText={setDraftContent}
                editable={!createSubmitting}
                textAlignVertical="top"
                accessibilityLabel="Texto del post"
              />
              <View style={styles.modalCounterRow}>
                <Text
                  style={[
                    styles.modalCounter,
                    draftContent.length >= CREATE_POST_MAX_LENGTH && styles.modalCounterFull,
                  ]}
                >
                  {draftContent.length}/{CREATE_POST_MAX_LENGTH}
                </Text>
              </View>
              {createError ? (
                <View style={styles.modalInlineError}>
                  <Text style={styles.modalInlineErrorText}>{createError}</Text>
                  <Pressable
                    style={({ pressed }) => [styles.modalInlineRetryBtn, pressed && styles.modalInlineRetryPressed]}
                    onPress={() => void onSubmitCreatePost()}
                    disabled={createSubmitting || draftContent.trim().length === 0}
                    accessibilityRole="button"
                    accessibilityLabel="Intentalo de nuevo"
                  >
                    <Text style={styles.modalInlineRetryText}>Intentalo de nuevo</Text>
                  </Pressable>
                </View>
              ) : null}
              <View style={styles.modalActions}>
                <Pressable
                  style={[styles.modalBtn, styles.modalBtnGhost]}
                  onPress={closeCreateModal}
                  disabled={createSubmitting}
                >
                  <Text style={styles.modalBtnGhostText}>Cancelar</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.modalBtn,
                    styles.modalBtnPrimary,
                    (createSubmitting || draftContent.trim().length === 0) && styles.modalBtnDisabled,
                  ]}
                  onPress={() => void onSubmitCreatePost()}
                  disabled={createSubmitting || draftContent.trim().length === 0}
                  accessibilityState={{
                    disabled: createSubmitting || draftContent.trim().length === 0,
                  }}
                >
                  {createSubmitting ? (
                    <View style={styles.modalBtnLoadingRow}>
                      <ActivityIndicator color={colors.textOnPrimary} size="small" />
                      <Text style={styles.modalBtnPrimaryText}>Publicando…</Text>
                    </View>
                  ) : (
                    <Text style={styles.modalBtnPrimaryText}>Publicar</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <FlatList
        data={filteredPosts}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            enabled={!readOnly}
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        contentContainerStyle={filteredPosts.length === 0 ? styles.emptyList : styles.list}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            {screenTime.enabled ? <TimeUsageBar /> : null}
            {readOnly ? <ReadOnlyBanner /> : null}
            {inactivityReminder.visible && inactivityReminder.text ? (
              <View
                style={styles.inactivityReminderBanner}
                accessibilityRole="alert"
                accessibilityLabel={inactivityReminder.text}
              >
                <Text style={styles.inactivityReminderText}>{inactivityReminder.text}</Text>
              </View>
            ) : null}
            <ContinueLearningSection
              game={continueLearning.game}
              content={continueLearning.content}
              apiItem={apiContinueItem}
              readOnly={readOnly}
              onContinue={handleContinue}
            />
            {error && posts.length > 0 ? (
              <View style={styles.inlineErrorBanner}>
                <BrandLogo width={24} height={24} />
                <Text style={styles.inlineErrorText}>{error}</Text>
                <Pressable
                  onPress={() => void fetchFeed({ showFullScreenLoading: false, isPullToRefresh: false })}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Intentalo de nuevo"
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  <AppIcon name="refresh" color={colors.link} size="sm" />
                  <Text style={styles.inlineErrorDismiss}>Intentalo de nuevo</Text>
                </Pressable>
              </View>
            ) : null}
            {fetchingPosts && !loading && !refreshing && posts.length > 0 ? (
              <View style={styles.fetchingBanner}>
                <BrandLogo width={20} height={20} />
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.fetchingBannerText}>Actualizando feed…</Text>
              </View>
            ) : null}
            <RecommendedForYouSection
              items={recommendations}
              loading={recommendationsLoading}
              visible={Boolean(userId)}
              readOnly={readOnly}
              highlighted={recommendSectionHighlighted}
              onOpenEducational={openEducationalFromRec}
            />
            <Pressable
              style={({ pressed }) => [
                styles.createPostBtn,
                pressed && !fetchingPosts && !readOnly && styles.createPostBtnPressed,
                (fetchingPosts || readOnly) && styles.createPostBtnDisabled,
              ]}
              onPress={() => {
                if (readOnly) {
                  showToast(READ_ONLY_TOAST_MSG, "error");
                  return;
                }
                setCreateOpen(true);
              }}
              disabled={fetchingPosts}
              accessibilityState={{ disabled: fetchingPosts }}
            >
              {fetchingPosts ? (
                <ActivityIndicator color={colors.textOnPrimary} size="small" />
              ) : (
                <View style={styles.createPostBtnInner}>
                  <AppIcon name="add-circle-outline" color={colors.textOnPrimary} size="md" />
                  <Text style={styles.createPostBtnText}>Publicar</Text>
                </View>
              )}
            </Pressable>
            {posts.length > 0 ? (
              <>
                <View style={styles.categoryFilterTitleRow}>
                  <AppIcon name="options-outline" color={colors.categoryFilterTitle} size="md" />
                  <Text style={styles.categoryFilterTitle}>Filtrar por categoría</Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryFilterScroll}
                >
                  <Pressable
                    onPress={() => {
                      if (readOnly) {
                        showToast(READ_ONLY_TOAST_MSG, "error");
                        return;
                      }
                      setCategoryFilter(null);
                    }}
                    style={({ pressed }) => [
                      styles.categoryFilterChip,
                      categoryFilter === null && styles.categoryFilterChipActive,
                      pressed && !readOnly && styles.categoryFilterChipPressed,
                      readOnly && styles.categoryFilterChipReadOnly,
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: categoryFilter === null }}
                    accessibilityLabel="Mostrar todas las categorías"
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <AppIcon
                        name="color-palette-outline"
                        color={categoryFilter === null ? colors.chipTextActive : colors.chipText}
                        size="sm"
                      />
                      <Text
                        style={[
                          styles.categoryFilterChipText,
                          categoryFilter === null && styles.categoryFilterChipTextActive,
                        ]}
                      >
                        Todas
                      </Text>
                    </View>
                  </Pressable>
                  {CONTENT_CATEGORIES_UI.map((c) => {
                    const selected = categoryFilter === c.id;
                    return (
                      <Pressable
                        key={c.id}
                        onPress={() => {
                          if (readOnly) {
                            showToast(READ_ONLY_TOAST_MSG, "error");
                            return;
                          }
                          setCategoryFilter(selected ? null : c.id);
                        }}
                        style={({ pressed }) => [
                          styles.categoryFilterChip,
                          selected
                            ? { backgroundColor: c.softBg, borderWidth: 2, borderColor: c.highlight }
                            : { borderColor: colors.chipBorder },
                          pressed && !readOnly && styles.categoryFilterChipPressed,
                          readOnly && styles.categoryFilterChipReadOnly,
                        ]}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        accessibilityLabel={`Filtrar por ${c.label}`}
                      >
                        <Text
                          style={[styles.categoryFilterChipText, selected && { color: c.accent, fontWeight: "800" }]}
                          numberOfLines={1}
                        >
                          {categoryDisplayLabel(c)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          posts.length === 0 ? (
            <BrandEmptyState
              emoji="📰"
              title="Todavía no hay publicaciones"
              subtitle="Creá tu primer post y empezá a compartir en EduPlay."
            />
          ) : (
            <BrandEmptyState
              emoji="🎨"
              title="No hay publicaciones en esta categoría"
              subtitle="Elegí otra categoría o tocá «Todas» para ver más contenido."
            />
          )
        }
        ItemSeparatorComponent={() => <View style={styles.postSeparator} />}
        renderItem={({ item }) => {
          const postReactionBusy = pendingKey?.startsWith(`${item.id}:`) ?? false;
          const postCat = getCategoryUi(item.category);
          const chrome = getCategoryChrome(item.category);
          const rarityVis = item.badge ? getRarityBadgeVisual(item.badge.rarity, isDark) : null;
          return (
            <AnimatedFeedItem itemId={item.id}>
              <Pressable
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                onPress={() => {}}
                accessibilityRole="none"
              >
                <View
                  style={[
                    styles.cardInner,
                    postCat && { borderLeftWidth: 4, borderLeftColor: chrome.stripe },
                  ]}
                >
                <FeedPostCardHeader
                  username={item.user.username}
                  avatarUrl={item.user.avatarUrl}
                  category={item.category}
                  feedLabel={item.feedLabel}
                  postType={item.type}
                  createdAt={item.createdAt}
                  createdAtFormatted={item.createdAtFormatted}
                />
                <View style={styles.cardBody}>
                  {item.content ? <Text style={styles.content}>{item.content}</Text> : null}
                  {item.badge && rarityVis ? (
                    <View style={styles.badgeBlock}>
                      <View
                        style={[
                          styles.badgeIconWrap,
                          {
                            borderColor: chrome.ring,
                            borderWidth: 3,
                          },
                        ]}
                      >
                        <Text style={styles.badgeIcon}>{item.badge.icon}</Text>
                      </View>
                      <View
                        style={[
                          styles.rarityPill,
                          {
                            borderColor: rarityVis.border,
                            backgroundColor: rarityVis.softBg,
                            borderWidth: rarityVis.borderWidth,
                          },
                        ]}
                      >
                        <Text style={[styles.rarityText, { color: rarityVis.accent }]}>{item.badge.rarity}</Text>
                      </View>
                    </View>
                  ) : null}
                </View>
                <View style={styles.cardFooter}>
                  <PostReactionBar
                    postId={item.id}
                    counts={getReactionCounts(item)}
                    userReaction={item.userReaction ?? null}
                    pending={postReactionBusy}
                    readOnly={readOnly}
                    onReact={(pid, t) => void onReact(pid, t)}
                  />
                </View>
              </View>
            </Pressable>
            </AnimatedFeedItem>
          );
        }}
      />
    </>
  );
}
