import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { ContinueLearningSection } from "../components/ContinueLearningSection";
import { BrandEmptyState } from "../components/BrandEmptyState";
import { FeedPostTypeLabel } from "../components/FeedPostTypeLabel";
import { PostCategoryTag } from "../components/PostCategoryTag";
import { PostReactionBar } from "../components/PostReactionBar";
import { ReadOnlyBanner } from "../components/ReadOnlyBanner";
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
  getUserProfile,
  getUserRecommendations,
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
type QuizCategory = "astronomy" | "math" | "science" | "history" | "geography" | "creativity" | "mixed";

const QUIZ_GAME_ENTRIES: Array<{
  category: QuizCategory;
  icon: string;
  title: string;
  description: string;
}> = [
  {
    category: "mixed",
    icon: "🎯",
    title: "Modo desafío",
    description: "Preguntas mezcladas de todas las categorías.",
  },
  {
    category: "astronomy",
    icon: "🌌",
    title: "Quiz de Astronomía",
    description: "Planetas, estrellas y el sistema solar.",
  },
  {
    category: "math",
    icon: "➗",
    title: "Quiz de Matemáticas",
    description: "Números, operaciones y razonamiento.",
  },
  {
    category: "science",
    icon: "🧪",
    title: "Quiz de Ciencia",
    description: "Experimentos, energía y estados de la materia.",
  },
  {
    category: "history",
    icon: "📜",
    title: "Quiz de Historia",
    description: "Civilizaciones, épocas y hechos importantes.",
  },
  {
    category: "geography",
    icon: "🌍",
    title: "Quiz de Geografía",
    description: "Países, continentes y mapas.",
  },
  {
    category: "creativity",
    icon: "🎨",
    title: "Quiz de Creatividad",
    description: "Arte, colores e imaginación.",
  },
];

const VISUAL_GAME_ENTRIES: Array<{
  category: "astronomy" | "geography";
  title: string;
  description: string;
}> = [
  {
    category: "astronomy",
    title: "Adiviná el planeta 🌌",
    description: "Mirá la imagen y elegí el planeta correcto.",
  },
  {
    category: "geography",
    title: "Identificá el país 🌍",
    description: "Banderas y mapas: ¿reconocés el lugar?",
  },
];

const PAGE_SIZE = 15;
/** Evita disparos múltiples de `onEndReached` seguidos. */
const LOAD_MORE_THROTTLE_MS = 650;
function interleaveExploreForYou(
  content: RecommendedEducationalItem[],
  games: RecommendedGameMixItem[]
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
  const allowed: QuizCategory[] = ["astronomy", "math", "science", "history", "geography", "creativity", "mixed"];
  return allowed.includes(c as QuizCategory) ? (c as QuizCategory) : "mixed";
}

function toVisualCategoryFromApi(raw: string): "astronomy" | "geography" {
  return raw.trim().toLowerCase() === "geography" ? "geography" : "astronomy";
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
          <View style={[styles.exploreAvatarOuter, { width: av, height: av, borderRadius: av / 2 }]}>
            {glyph ? (
              <View
                style={[styles.exploreAvatarPh, { width: av, height: av, borderRadius: av / 2, borderColor: chrome.accent }]}
              >
                <Text style={[styles.exploreAvatarPhText, { fontSize: Math.round(av * 0.48) }]}>{glyph}</Text>
              </View>
            ) : showRemoteImage ? (
              <Image
                source={{ uri: avUrl as string }}
                style={[styles.exploreAvatarImg, { width: av, height: av, borderRadius: av / 2 }]}
                onError={() => setImgFail(true)}
              />
            ) : (
              <View style={[styles.exploreAvatarPh, { width: av, height: av, borderRadius: av / 2, borderColor: chrome.accent }]}>
                <Text style={[styles.exploreAvatarPhText, { fontSize: Math.round(av * 0.38) }]}>{initial}</Text>
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
              {typeLabel ? <FeedPostTypeLabel label={typeLabel} postType={item.type} compact /> : null}
              <PostCategoryTag category={item.category} compact inline />
            </View>
          </View>
        </View>

        {item.content ? <Text style={styles.exploreContent}>{item.content}</Text> : null}

        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.explorePostImage} resizeMode="cover" />
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
              <Text style={[styles.exploreRarityText, { color: rarityVis.accent }]}>{item.badge.rarity}</Text>
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
    const root = tabNavigation.getParent() as NativeStackNavigationProp<RootStackParamList> | undefined;
    root?.navigate("Settings");
  }, [tabNavigation]);

  const openChat = useCallback(() => {
    const root = tabNavigation.getParent() as NativeStackNavigationProp<RootStackParamList> | undefined;
    root?.navigate("ChatInbox");
  }, [tabNavigation]);

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [learningContent, setLearningContent] = useState<EducationalContentItem[]>([]);
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
    }, [loadViewerLevel])
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

  const recommendedDifficulty = useMemo(
    () => (viewerLevel != null ? difficultyFromUserLevel(viewerLevel) : "EASY"),
    [viewerLevel]
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
    if (rec.length === 0) return learningContent;
    const seen = new Set(rec.map((r) => r.id));
    const rest = learningContent.filter((c) => !seen.has(c.id));
    return [...rec, ...rest];
  }, [recommendations?.recommendedEducationalContent, learningContent]);

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
        const contentRows = await getEducationalContent();
        setLearningContent(contentRows);
      } catch {
        // No bloquea Explore si falla la sección educativa.
        setLearningContent([]);
      }
    } catch {
      setError("No se pudo cargar Explorar.");
      setPosts([]);
      setHasMore(false);
      setLearningContent([]);
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
    }, [userId, fetchInitial])
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
        const contentRows = await getEducationalContent();
        setLearningContent(contentRows);
      } catch {
        setLearningContent([]);
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
    [userId, readOnly]
  );

  const openContentDetail = useCallback(
    (contentId: string) => {
      const root = tabNavigation.getParent() as NativeStackNavigationProp<RootStackParamList> | undefined;
      root?.navigate("ContentDetail", { contentId });
    },
    [tabNavigation]
  );

  const openQuiz = useCallback(() => {
    const root = tabNavigation.getParent() as NativeStackNavigationProp<RootStackParamList> | undefined;
    root?.navigate("Quiz", { category: "astronomy", difficulty: recommendedDifficulty });
  }, [tabNavigation, recommendedDifficulty]);

  const openQuizByCategory = useCallback(
    (category: QuizCategory) => {
      const root = tabNavigation.getParent() as NativeStackNavigationProp<RootStackParamList> | undefined;
      root?.navigate("GameCategory", { category, difficulty: recommendedDifficulty });
    },
    [tabNavigation, recommendedDifficulty]
  );

  const openQuizAreas = useCallback(() => {
    const root = tabNavigation.getParent() as NativeStackNavigationProp<RootStackParamList> | undefined;
    root?.navigate("QuizAreas");
  }, [tabNavigation]);

  const openVisualGame = useCallback(
    (category: "astronomy" | "geography") => {
      const root = tabNavigation.getParent() as NativeStackNavigationProp<RootStackParamList> | undefined;
      root?.navigate("VisualGame", { category, difficulty: recommendedDifficulty });
    },
    [tabNavigation, recommendedDifficulty]
  );

  const openMiniGamesHub = useCallback(() => {
    const root = tabNavigation.getParent() as NativeStackNavigationProp<RootStackParamList> | undefined;
    root?.navigate("MiniGamesHub");
  }, [tabNavigation]);

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
    const target = pickMostRecentResumeTarget(continueLearning.game, continueLearning.content);
    if (target === "game") handleResumeLastGame();
    else if (target === "content") handleResumeLastContent();
  }, [readOnly, continueLearning.game, continueLearning.content, handleResumeLastGame, handleResumeLastContent]);

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
          {readOnly ? <ReadOnlyBanner /> : null}
          <View style={styles.exploreBrandRow} accessibilityRole="header" accessibilityLabel={APP_TAGLINE}>
            <BrandLogo width={36} height={36} />
            <View style={styles.exploreBrandTextCol}>
              <Text style={[styles.exploreBrandTitle, { color: colors.text }]}>EduPlay</Text>
              <Text style={[styles.exploreBrandTagline, { color: colors.textMuted }]}>{appTaglineSubtitle()}</Text>
            </View>
          </View>
          <View style={styles.heroTitleRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm, flex: 1, minWidth: 0 }}>
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

          {error ? (
            <Text style={styles.inlineErr}>{error}</Text>
          ) : null}

          {exploreForYouLoading && !exploreForYou ? (
            <View style={[styles.recForYouSection, { alignItems: "flex-start" }]}>
              <Text style={styles.recForYouTitle}>⭐ Recomendado para vos</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: space.sm, marginTop: space.sm }}>
                <ActivityIndicator color={colors.primary} />
                <Text style={[styles.recForYouSubtitle, { marginBottom: 0 }]}>Cargando ideas para vos…</Text>
              </View>
            </View>
          ) : exploreForYouMixed.length > 0 ? (
            <View style={styles.recForYouSection}>
              <Text style={styles.recForYouTitle}>⭐ Recomendado para vos</Text>
              <Text style={styles.recForYouSubtitle}>Contenido y juegos mezclados según tus intereses</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.recForYouScroll}
              >
                {exploreForYouMixed.map((row) => {
                  if (row.kind === "content") {
                    const item = row.item;
                    return (
                      <Pressable
                        key={`c-${item.id}`}
                        onPress={() => {
                          if (readOnly) {
                            showToast(READ_ONLY_TOAST_MSG, "error");
                            return;
                          }
                          openContentDetail(item.id);
                        }}
                        style={({ pressed }) => [styles.recForYouLearnCard, pressed && styles.learnCardPressed]}
                        accessibilityRole="button"
                        accessibilityLabel={`Abrir ${item.title}`}
                      >
                        <View style={styles.recForYouMixedBadge}>
                          <Text style={styles.recForYouMixedBadgeText}>📚 Aprender</Text>
                        </View>
                        <Text numberOfLines={2} style={styles.recForYouLearnTitle}>
                          {item.title}
                        </Text>
                        <Text style={styles.recForYouLearnMeta}>
                          {item.category} · {item.difficulty}
                        </Text>
                      </Pressable>
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
                        style={({ pressed }) => [styles.recForYouGameCard, pressed && styles.gameCardPressed]}
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
                      style={({ pressed }) => [styles.recForYouGameCard, pressed && styles.gameCardPressed]}
                      accessibilityRole="button"
                      accessibilityLabel={`Juego visual: ${g.question}`}
                    >
                      <View style={styles.recForYouMixedBadge}>
                        <Text style={styles.recForYouMixedBadgeText}>🖼️ Visual</Text>
                      </View>
                      {g.imageUrl ? (
                        <Image source={{ uri: g.imageUrl }} style={styles.recForYouMixedThumb} resizeMode="cover" />
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
              style={({ pressed }) => [styles.quizCtaBtn, { marginBottom: space.md }, pressed && styles.quizCtaBtnPressed]}
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
              {viewerLevel != null ? (
                <>
                  Recomendado:{" "}
                  <Text style={{ fontWeight: "800", color: colors.primary }}>{recommendedDifficulty}</Text>
                  {" · nivel "}
                  {viewerLevel}
                  {" · podés elegir otra dificultad"}
                </>
              ) : (
                <>
                  Recomendado:{" "}
                  <Text style={{ fontWeight: "800", color: colors.primary }}>{recommendedDifficulty}</Text>
                  {" · iniciá sesión para ajustar según tu nivel"}
                </>
              )}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gamesCardsRow}>
              {orderedQuizEntries.map((entry) => (
                <Pressable
                  key={entry.category}
                  onPress={() => openQuizByCategory(entry.category)}
                  style={({ pressed }) => [styles.gameCard, pressed && styles.gameCardPressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`Abrir ${entry.title}`}
                >
                  <Text style={styles.gameCardTitle}>
                    {entry.icon} {entry.title}
                  </Text>
                  <Text style={styles.gameCardMeta}>{entry.description}</Text>
                  <View style={styles.gameDifficultyRow}>
                    <View style={[styles.gameDifficultyChip, styles.gameDifficultyChipRecommended]}>
                      <Text style={[styles.gameDifficultyChipText, styles.gameDifficultyChipTextRecommended]}>
                        {recommendedDifficulty}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          <View style={styles.gamesSection}>
            <Text style={styles.gamesSectionTitle}>🎮 Juegos visuales</Text>
            <Text style={styles.gamesDifficultyHint}>
              Preguntas con imagen · dificultad recomendada según tu nivel (
              <Text style={{ fontWeight: "800", color: colors.primary }}>{recommendedDifficulty}</Text>)
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gamesCardsRow}>
              {VISUAL_GAME_ENTRIES.map((entry) => (
                <Pressable
                  key={`visual-${entry.category}`}
                  onPress={() => openVisualGame(entry.category)}
                  style={({ pressed }) => [styles.gameCard, pressed && styles.gameCardPressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`Abrir juego visual: ${entry.title}`}
                >
                  <Text style={styles.gameCardTitle}>{entry.title}</Text>
                  <Text style={styles.gameCardMeta}>{entry.description}</Text>
                  <View style={styles.gameDifficultyRow}>
                    <View style={[styles.gameDifficultyChip, styles.gameDifficultyChipRecommended]}>
                      <Text style={[styles.gameDifficultyChipText, styles.gameDifficultyChipTextRecommended]}>
                        {recommendedDifficulty}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          <View style={styles.learnSection}>
            <Text style={styles.learnSectionTitle}>📚 Aprender</Text>
            <Pressable
              onPress={openQuiz}
              style={({ pressed }) => [styles.quizCtaBtn, pressed && styles.quizCtaBtnPressed]}
              accessibilityRole="button"
              accessibilityLabel="Abrir quiz"
            >
              <Text style={styles.quizCtaText}>🧠 Quiz rápido</Text>
            </Pressable>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.learnCardsRow}>
              {learnRowsForExplore.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => openContentDetail(item.id)}
                  style={({ pressed }) => [styles.learnCard, pressed && styles.learnCardPressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`Abrir contenido ${item.title}`}
                >
                  <Text numberOfLines={2} style={styles.learnCardTitle}>
                    {item.title}
                  </Text>
                  <Text style={styles.learnCardMeta}>
                    {item.category} · {item.difficulty}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      }
      ListEmptyComponent={
        <BrandEmptyState
          emoji="🧭"
          title={error ? "No se pudo cargar Explorar" : "Todavía no hay nada para mostrar"}
          subtitle={error ? "Probá tirar para actualizar." : "Volvé en un momento para descubrir más publicaciones."}
        />
      }
      ItemSeparatorComponent={() => <View style={styles.postSeparator} />}
      ListFooterComponent={
        loadingMore ? (
          <View style={styles.footerLoad}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.footerLoadText}>Cargando más…</Text>
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
