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
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp, BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ContinueLearningSection } from "../components/ContinueLearningSection";
import { AnimatedFeedItem } from "../components/AnimatedFeedItem";
import { AppIcon } from "../components/AppIcon";
import { BrandEmptyState } from "../components/BrandEmptyState";
import { BrandLogo } from "../components/BrandLogo";
import { FeedPostTypeLabel } from "../components/FeedPostTypeLabel";
import { PostCategoryTag } from "../components/PostCategoryTag";
import { PostReactionBar } from "../components/PostReactionBar";
import { ReadOnlyBanner } from "../components/ReadOnlyBanner";
import { VIEWER_USER_ID } from "../config";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { usePostOnboarding } from "../contexts/PostOnboardingContext";
import { READ_ONLY_TOAST_MSG, useScreenTime } from "../contexts/ScreenTimeContext";
import { showToast } from "../lib/toastBus";
import { trackEvent } from "../services/analytics";
import { createReaction, createUserPost, getPosts, getUserRecommendations, type ReactionType } from "../services/api";
import { getRarityBadgeVisual } from "../lib/achievementRarityUi";
import {
  categoryDisplayLabel,
  CONTENT_CATEGORIES_UI,
  getCategoryChrome,
  getCategoryUi,
} from "../lib/contentCategoryUi";
import { bumpReactionOptimistic, getReactionCounts } from "../lib/reactionCounts";
import type { FeedPost, RecommendationsResponse } from "../types/api";
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

const MAX_RECOMMENDED_POSTS_IN_FEED = 5;

function RecommendedForYouSection({
  data,
  loading,
  visible,
  onReact,
  readOnly,
  pendingKey,
  highlighted,
  onOpenEducational,
}: {
  data: RecommendationsResponse | null;
  loading: boolean;
  visible: boolean;
  onReact: (postId: string, type: ReactionType) => void;
  readOnly: boolean;
  pendingKey: string | null;
  /** Resaltar bloque tras completar onboarding. */
  highlighted?: boolean;
  onOpenEducational?: (contentId: string) => void;
}) {
  const styles = useFeedStyles();
  const { colors, mode } = useTheme();
  const isDark = mode === "dark";
  if (!visible) return null;

  const games = data?.recommendedGames ?? [];
  const recEdu = data?.recommendedEducationalContent ?? [];
  const recPosts = (data?.recommendedPosts ?? []).slice(0, MAX_RECOMMENDED_POSTS_IN_FEED);
  const hasSomething = games.length > 0 || recPosts.length > 0 || recEdu.length > 0;
  const noFriends =
    data != null && typeof data.acceptedFriendCount === "number" && data.acceptedFriendCount === 0;

  const highlightRing = highlighted ? styles.recommendedSectionHighlightActive : undefined;

  if (loading && !data) {
    return (
      <View style={[styles.recommendedSectionOuter, highlightRing]}>
        <View style={[styles.recommendedWrap, styles.recommendedLoadingBox]}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.recommendedLoadingText}>Cargando recomendaciones…</Text>
        </View>
      </View>
    );
  }

  if (!hasSomething && !noFriends) return null;

  return (
    <View style={[styles.recommendedSectionOuter, highlightRing]}>
      {noFriends ? (
        <View
          style={styles.friendsEmptyBanner}
          accessibilityRole="text"
          accessibilityLabel="Agregá amigos para ver más contenido"
        >
          <Text style={styles.friendsEmptyText}>Agregá amigos para ver más contenido</Text>
        </View>
      ) : null}
      {hasSomething ? (
    <View style={styles.recommendedWrap} accessibilityRole="summary" accessibilityLabel="Recomendado para vos">
      <View style={styles.recommendedGlow} pointerEvents="none" />
      <View style={styles.recommendedInner}>
        <View style={styles.recommendedTitleRow}>
          <AppIcon name="sparkles-outline" color={colors.recTitle} size="lg" />
          <View style={styles.recommendedTitleTextCol}>
            <Text style={styles.recommendedTitle}>✨ Recomendado para vos</Text>
            <Text style={styles.recommendedSubtitle}>Basado en tus intereses</Text>
          </View>
        </View>

        {games.length > 0 ? (
          <>
            <Text style={styles.recommendedBlockLabel}>🎮 Juegos</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recGamesScrollContent}
            >
              {games.map((g) => {
                const cat = getCategoryUi(g.category);
                const chipInner = (
                  <>
                    <Text style={styles.recGameName} numberOfLines={2}>
                      {g.name}
                    </Text>
                    <View style={styles.recGameMetaRow}>
                      {cat ? (
                        <AppIcon name={cat.icon} color={cat.accent} size="sm" />
                      ) : null}
                      <Text style={styles.recGameMeta} numberOfLines={1}>
                        {cat ? `${cat.label} · ${g.difficulty}` : `${g.category} · ${g.difficulty}`}
                      </Text>
                    </View>
                  </>
                );
                return readOnly ? (
                  <Pressable
                    key={g.id}
                    onPress={() => showToast(READ_ONLY_TOAST_MSG, "error")}
                    style={({ pressed }) => [
                      styles.recGameChip,
                      styles.recGameChipReadOnly,
                      pressed && styles.recGameChipReadOnlyPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Juego no disponible en modo lectura"
                  >
                    {chipInner}
                  </Pressable>
                ) : (
                  <View key={g.id} style={styles.recGameChip}>
                    {chipInner}
                  </View>
                );
              })}
            </ScrollView>
          </>
        ) : null}

        {recEdu.length > 0 ? (
          <>
            <Text
              style={[styles.recommendedBlockLabel, games.length > 0 ? styles.recommendedBlockSpacer : undefined]}
            >
              📚 Aprender
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recGamesScrollContent}
            >
              {recEdu.map((item) => {
                const inner = (
                  <>
                    <Text style={styles.recGameName} numberOfLines={2}>
                      {item.title}
                    </Text>
                    <View style={styles.recGameMetaRow}>
                      <Text style={styles.recGameMeta} numberOfLines={1}>
                        {item.category} · {item.difficulty}
                      </Text>
                    </View>
                  </>
                );
                return readOnly ? (
                  <Pressable
                    key={item.id}
                    onPress={() => showToast(READ_ONLY_TOAST_MSG, "error")}
                    style={({ pressed }) => [
                      styles.recGameChip,
                      styles.recGameChipReadOnly,
                      pressed && styles.recGameChipReadOnlyPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Contenido no disponible en modo lectura"
                  >
                    {inner}
                  </Pressable>
                ) : (
                  <Pressable
                    key={item.id}
                    onPress={() => onOpenEducational?.(item.id)}
                    style={({ pressed }) => [styles.recGameChip, pressed && styles.cardPressed]}
                    accessibilityRole="button"
                    accessibilityLabel={`Abrir ${item.title}`}
                  >
                    {inner}
                  </Pressable>
                );
              })}
            </ScrollView>
          </>
        ) : null}

        {recPosts.length > 0 ? (
          <>
            <Text
              style={[
                styles.recommendedBlockLabel,
                games.length > 0 || recEdu.length > 0 ? styles.recommendedBlockSpacer : undefined,
              ]}
            >
              📰 Publicaciones
            </Text>
            {recPosts.map((item) => {
              const postReactionBusy = pendingKey?.startsWith(`${item.id}:`) ?? false;
              const recCat = getCategoryUi(item.category);
              const chrome = getCategoryChrome(item.category);
              const rarityVis = item.badge ? getRarityBadgeVisual(item.badge.rarity, isDark) : null;
              return (
                <Pressable
                  key={item.id}
                  style={({ pressed }) => [{ width: "100%" }, pressed && styles.cardPressed]}
                  onPress={() => {}}
                  accessibilityRole="none"
                >
                  <View
                    style={[styles.recPostCard, recCat && { borderLeftWidth: 4, borderLeftColor: chrome.stripe }]}
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
                  <View style={styles.recPostBody}>
                    {item.content ? (
                      <Text style={styles.recPostContent} numberOfLines={4}>
                        {item.content}
                      </Text>
                    ) : null}
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
                  <View style={styles.recPostFooter}>
                    <PostReactionBar
                      postId={item.id}
                      counts={getReactionCounts(item)}
                      userReaction={item.userReaction ?? null}
                      pending={postReactionBusy}
                      readOnly={readOnly}
                      onReact={onReact}
                    />
                  </View>
                  </View>
                </Pressable>
              );
            })}
          </>
        ) : null}
      </View>
    </View>
      ) : null}
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
  const [recommendations, setRecommendations] = useState<RecommendationsResponse | null>(null);
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
    const target = pickMostRecentResumeTarget(continueLearning.game, continueLearning.content);
    if (target === "game") handleResumeLastGame();
    else if (target === "content") handleResumeLastContent();
  }, [readOnly, continueLearning.game, continueLearning.content, handleResumeLastGame, handleResumeLastContent]);

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
      setRecommendations(null);
      return;
    }
    setRecommendationsLoading(true);
    try {
      const r = await getUserRecommendations(userId);
      setRecommendations(r);
    } catch {
      setRecommendations(null);
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
      let snapshotRec: RecommendationsResponse | undefined;

      setPosts((prev) => {
        const cur = prev.find((p) => p.id === postId);
        if (!cur) return prev;
        if (cur.userReaction === type) return prev;
        snapshotPosts = prev;
        return prev.map((p) => (p.id === postId ? bumpReactionOptimistic(p, type) : p));
      });

      setRecommendations((prev) => {
        if (!prev) return prev;
        const cur = prev.recommendedPosts.find((p) => p.id === postId);
        if (!cur) return prev;
        if (cur.userReaction === type) return prev;
        snapshotRec = prev;
        return {
          ...prev,
          recommendedPosts: prev.recommendedPosts.map((p) =>
            p.id === postId ? bumpReactionOptimistic(p, type) : p
          ),
        };
      });

      if (snapshotPosts === undefined && snapshotRec === undefined) {
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
        if (snapshotRec !== undefined) setRecommendations(snapshotRec);
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
              data={recommendations}
              loading={recommendationsLoading}
              visible={Boolean(userId)}
              onReact={(pid, t) => void onReact(pid, t)}
              readOnly={readOnly}
              pendingKey={pendingKey}
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
