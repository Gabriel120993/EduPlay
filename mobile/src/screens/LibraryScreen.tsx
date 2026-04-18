import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Dimensions, Modal, Pressable, ScrollView, Share, Switch, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { AppIcon } from "../components/AppIcon";
import { BrandLogo } from "../components/BrandLogo";
import { APP_TAGLINE, appTaglineSubtitle } from "../constants/brand";
import { useTheme } from "../contexts/ThemeContext";
import type { MainTabParamList, RootStackParamList } from "../navigation/types";
import { radius, screenEdge, space, typography } from "../theme/tokens";
import {
  CURIOSITY_CARDS,
  HOME_EXPERIMENTS,
  INTERACTIVE_STORIES,
  MINI_DOCUMENTARIES,
  SUBJECT_LABELS,
  type AgeBand,
  type CuriosityCard,
  type Difficulty,
  type DurationBucket,
  type MiniDocumentary,
  type SubjectTag,
} from "./libraryMediaCatalog";

const FAV_KEY = "@eduplay/library_favorites_v1";
const OFFLINE_KEY = "@eduplay/library_offline_docs_v1";
const SUBTITLES_KEY = "@eduplay/library_subtitles_pref";

type FavoritesPayload = {
  videos: string[];
  stories: string[];
  facts: string[];
};

type SectionTab = "docs" | "stories" | "experiments" | "facts";

type TabNav = BottomTabNavigationProp<MainTabParamList>;
type RootNav = NativeStackNavigationProp<RootStackParamList>;

function matchesSearch(text: string, q: string): boolean {
  if (!q.trim()) return true;
  return text.toLowerCase().includes(q.trim().toLowerCase());
}

export function LibraryScreen() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const tabNav = useNavigation<TabNav>();
  const rootNav = tabNav.getParent() as RootNav | undefined;

  const [section, setSection] = useState<SectionTab>("docs");
  const [search, setSearch] = useState("");
  const [age, setAge] = useState<AgeBand | "all">("all");
  const [subject, setSubject] = useState<SubjectTag | "all">("all");
  const [duration, setDuration] = useState<DurationBucket | "all">("all");
  const [difficulty, setDifficulty] = useState<Difficulty | "all">("all");
  const [sortBy, setSortBy] = useState<"popular" | "new">("popular");
  const [favorites, setFavorites] = useState<FavoritesPayload>({ videos: [], stories: [], facts: [] });
  const [offlineDocs, setOfflineDocs] = useState<string[]>([]);
  const [subtitlesDefault, setSubtitlesDefault] = useState(true);
  const [factIndex, setFactIndex] = useState(0);
  const [dictOpen, setDictOpen] = useState(false);
  const [dictWord, setDictWord] = useState<string | null>(null);

  const width = Dimensions.get("window").width;
  const cardW = Math.min(width - screenEdge.horizontal * 2, 360);

  useEffect(() => {
    setFactIndex(0);
  }, [section, age, subject, duration, difficulty, search, sortBy]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [f, o, s] = await Promise.all([
          AsyncStorage.getItem(FAV_KEY),
          AsyncStorage.getItem(OFFLINE_KEY),
          AsyncStorage.getItem(SUBTITLES_KEY),
        ]);
        if (cancelled) return;
        if (f) setFavorites(JSON.parse(f) as FavoritesPayload);
        if (o) setOfflineDocs(JSON.parse(o) as string[]);
        if (s === "0") setSubtitlesDefault(false);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persistFavorites = useCallback(async (next: FavoritesPayload) => {
    setFavorites(next);
    await AsyncStorage.setItem(FAV_KEY, JSON.stringify(next));
  }, []);

  const toggleFavVideo = useCallback(
    async (id: string) => {
      const set = new Set(favorites.videos);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      await persistFavorites({ ...favorites, videos: [...set] });
    },
    [favorites, persistFavorites]
  );

  const toggleFavStory = useCallback(
    async (id: string) => {
      const set = new Set(favorites.stories);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      await persistFavorites({ ...favorites, stories: [...set] });
    },
    [favorites, persistFavorites]
  );

  const toggleFavFact = useCallback(
    async (id: string) => {
      const set = new Set(favorites.facts);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      await persistFavorites({ ...favorites, facts: [...set] });
    },
    [favorites, persistFavorites]
  );

  const toggleOfflineDoc = useCallback(
    async (id: string) => {
      const set = new Set(offlineDocs);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      const next = [...set];
      setOfflineDocs(next);
      await AsyncStorage.setItem(OFFLINE_KEY, JSON.stringify(next));
    },
    [offlineDocs]
  );

  const persistSubtitles = useCallback(async (on: boolean) => {
    setSubtitlesDefault(on);
    await AsyncStorage.setItem(SUBTITLES_KEY, on ? "1" : "0");
  }, []);

  const filteredDocs = useMemo(() => {
    let rows = [...MINI_DOCUMENTARIES];
    if (age !== "all") rows = rows.filter((r) => r.ageBand === age);
    if (subject !== "all") rows = rows.filter((r) => r.subject === subject);
    if (duration !== "all") rows = rows.filter((r) => r.durationBucket === duration);
    if (difficulty !== "all") rows = rows.filter((r) => r.difficulty === difficulty);
    rows = rows.filter((r) => matchesSearch(`${r.title} ${r.synopsis}`, search));
    rows.sort((a, b) => (sortBy === "new" ? (a.isNew === b.isNew ? b.popularityScore - a.popularityScore : a.isNew ? -1 : 1) : b.popularityScore - a.popularityScore));
    return rows;
  }, [age, subject, duration, difficulty, search, sortBy]);

  const filteredStories = useMemo(() => {
    let rows = [...INTERACTIVE_STORIES];
    if (age !== "all") rows = rows.filter((r) => r.ageBand === age);
    if (subject !== "all") rows = rows.filter((r) => r.subject === subject);
    if (difficulty !== "all") rows = rows.filter((r) => r.difficulty === difficulty);
    rows = rows.filter((r) => matchesSearch(`${r.title} ${r.blurb} ${r.genre}`, search));
    rows.sort((a, b) => (sortBy === "new" ? (a.isNew === b.isNew ? b.popularityScore - a.popularityScore : a.isNew ? -1 : 1) : b.popularityScore - a.popularityScore));
    return rows;
  }, [age, subject, difficulty, search, sortBy]);

  const filteredExperiments = useMemo(() => {
    let rows = [...HOME_EXPERIMENTS];
    if (age !== "all") rows = rows.filter((r) => r.ageBand === age);
    if (subject !== "all") rows = rows.filter((r) => r.subject === subject);
    if (difficulty !== "all") rows = rows.filter((r) => r.difficulty === difficulty);
    rows = rows.filter((r) => matchesSearch(`${r.title} ${r.materialsSummary}`, search));
    return rows;
  }, [age, subject, difficulty, search]);

  const filteredFacts = useMemo(() => {
    let rows = [...CURIOSITY_CARDS];
    if (age !== "all") rows = rows.filter((r) => r.ageBand === age);
    if (subject !== "all") rows = rows.filter((r) => r.subject === subject);
    rows = rows.filter((r) => matchesSearch(`${r.fact} ${r.category}`, search));
    rows.sort((a, b) => (sortBy === "new" ? (a.isNew === b.isNew ? b.popularityScore - a.popularityScore : a.isNew ? -1 : 1) : b.popularityScore - a.popularityScore));
    return rows;
  }, [age, subject, search, sortBy]);

  const openSettings = () => rootNav?.navigate("Settings");
  const openChat = () => rootNav?.navigate("ChatInbox");

  const shareFact = async (card: CuriosityCard) => {
    try {
      await Share.share({ message: `${card.fact}\n\n— EduPlay Biblioteca`, title: "Dato curioso" });
    } catch {
      /* cancel */
    }
  };

  const chip = (active: boolean, label: string, onPress: () => void) => (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: space.md,
        paddingVertical: space.sm,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? colors.chipActiveBorder : colors.chipBorder,
        backgroundColor: active ? colors.chipActiveBg : colors.chipBg,
        marginRight: space.sm,
      }}
    >
      <Text style={{ color: active ? colors.chipTextActive : colors.chipText, fontWeight: "700", fontSize: typography.secondary }}>{label}</Text>
    </Pressable>
  );

  const renderDoc = ({ item }: { item: MiniDocumentary }) => {
    const fav = favorites.videos.includes(item.id);
    const off = offlineDocs.includes(item.id);
    return (
      <View
        style={{
          marginHorizontal: screenEdge.horizontal,
          marginBottom: space.md,
          padding: space.md,
          borderRadius: radius.cardSm,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.borderSubtle,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: space.md }}>
          <Text style={{ fontSize: 36 }}>{item.thumbnailEmoji}</Text>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: colors.text, fontWeight: "900", fontSize: typography.bodyLarge }} numberOfLines={2}>
              {item.title}
            </Text>
            <Text style={{ color: colors.textSecondary, marginTop: 4, fontWeight: "600" }} numberOfLines={2}>
              {item.synopsis}
            </Text>
            <Text style={{ color: colors.textMuted, marginTop: 6, fontSize: typography.secondary, fontWeight: "700" }}>
              {SUBJECT_LABELS[item.subject]} · {item.ageBand} años · {item.durationMin} min · Subtítulos: {item.hasSubtitles ? "opcionales" : "no"}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm, marginTop: space.md }}>
              <Pressable
                onPress={() => void toggleFavVideo(item.id)}
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                accessibilityRole="button"
                accessibilityLabel={fav ? "Quitar de favoritos" : "Guardar en favoritos"}
              >
                <AppIcon name={fav ? "heart" : "heart-outline"} size="sm" color={colors.primary} />
                <Text style={{ color: colors.link, fontWeight: "800" }}>Favorito</Text>
              </Pressable>
              <Pressable
                onPress={() => void toggleOfflineDoc(item.id)}
                style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                accessibilityRole="button"
                accessibilityLabel={off ? "Quitar descarga offline" : "Descargar para offline"}
              >
                <AppIcon name={off ? "checkmark-circle" : "cloud-download-outline"} size="sm" color={colors.link} />
                <Text style={{ color: colors.link, fontWeight: "800" }}>{off ? "En biblioteca offline" : "Descargar"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderStory = ({ item }: { item: (typeof INTERACTIVE_STORIES)[number] }) => {
    const fav = favorites.stories.includes(item.id);
    return (
      <Pressable
        onPress={() => {
          setDictWord("palabra");
          setDictOpen(true);
        }}
        style={{
          marginHorizontal: screenEdge.horizontal,
          marginBottom: space.md,
          padding: space.md,
          borderRadius: radius.cardSm,
          backgroundColor: colors.cardElevated,
          borderWidth: 1,
          borderColor: colors.borderSubtle,
        }}
      >
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1, paddingRight: space.sm }}>
            <Text style={{ color: colors.text, fontWeight: "900", fontSize: typography.bodyLarge }}>{item.title}</Text>
            <Text style={{ color: colors.primary, fontWeight: "800", marginTop: 4, fontSize: typography.secondary }}>{item.genre}</Text>
            <Text style={{ color: colors.textSecondary, marginTop: 6, fontWeight: "600" }}>{item.blurb}</Text>
            <Text style={{ color: colors.textMuted, marginTop: 8, fontSize: typography.secondary, fontWeight: "700" }}>
              Preguntas cada {item.comprehensionEveryPages} páginas · {item.pages} páginas · Diccionario: tocá el cuento
            </Text>
            <Text style={{ color: colors.textMuted, marginTop: 4, fontSize: typography.secondary, fontWeight: "700" }}>
              Modos: leer solo · leer con audio
            </Text>
          </View>
          <Pressable onPress={() => void toggleFavStory(item.id)} accessibilityRole="button">
            <AppIcon name={fav ? "heart" : "heart-outline"} size="md" color={colors.primary} />
          </Pressable>
        </View>
      </Pressable>
    );
  };

  const renderExperiment = ({ item }: { item: (typeof HOME_EXPERIMENTS)[number] }) => (
    <View
      style={{
        marginHorizontal: screenEdge.horizontal,
        marginBottom: space.md,
        padding: space.md,
        borderRadius: radius.cardSm,
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
      }}
    >
      <Text style={{ color: colors.text, fontWeight: "900", fontSize: typography.bodyLarge }}>{item.title}</Text>
      <Text style={{ color: colors.textSecondary, marginTop: 6, fontWeight: "600" }}>Materiales: {item.materialsSummary}</Text>
      <Text style={{ color: colors.textMuted, marginTop: 6, fontSize: typography.secondary, fontWeight: "700" }}>
        {item.stepsCount} pasos · {item.demoVideoLabel}
      </Text>
      <View style={{ marginTop: space.sm, padding: space.sm, borderRadius: radius.cardSm, backgroundColor: colors.warnBannerBg, borderWidth: 1, borderColor: colors.warnBannerBorder }}>
        <Text style={{ color: colors.warnBannerText, fontWeight: "800" }}>Preguntá a tu padre o madre: supervisión obligatoria.</Text>
      </View>
      <Text style={{ color: colors.textBody, marginTop: space.sm, fontWeight: "600" }}>Ciencia: {item.scienceExplanation}</Text>
      <Text style={{ color: colors.textMuted, marginTop: space.sm, fontSize: typography.secondary, fontWeight: "600" }}>
        Galería: {item.galleryNote}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: space.sm }}>
        {[1, 2, 3].map((i) => (
          <View
            key={i}
            style={{
              width: 64,
              height: 64,
              borderRadius: 12,
              marginRight: space.sm,
              backgroundColor: colors.ghostBg,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: colors.borderSubtle,
            }}
          >
            <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: "800", textAlign: "center" }}>Aprobación{"\n"}tutor</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  const factData = filteredFacts;
  const currentFact = factData[factIndex] ?? factData[0];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <ScrollView stickyHeaderIndices={[1]} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + space.xl }}>
        <View style={{ paddingHorizontal: screenEdge.horizontal, paddingTop: space.sm }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: space.md }}>
            <BrandLogo width={36} height={36} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: "900", fontSize: typography.title }}>Biblioteca</Text>
              <Text style={{ color: colors.textMuted, fontWeight: "600", fontSize: typography.secondary }}>{APP_TAGLINE}</Text>
            </View>
            <Pressable onPress={openChat} hitSlop={10}>
              <AppIcon name="chatbubbles-outline" size="md" color={colors.link} />
            </Pressable>
            <Pressable onPress={openSettings} hitSlop={10}>
              <AppIcon name="settings-outline" size="md" color={colors.link} />
            </Pressable>
          </View>
          <Text style={{ color: colors.textSecondary, marginTop: space.sm, fontWeight: "600" }}>{appTaglineSubtitle()}</Text>
        </View>

        <View style={{ backgroundColor: colors.background, paddingTop: space.sm, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle }}>
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar título, tema o palabra…"
            placeholderTextColor={colors.placeholder}
            style={{
              marginHorizontal: screenEdge.horizontal,
              marginBottom: space.sm,
              paddingHorizontal: space.md,
              paddingVertical: space.sm,
              borderRadius: radius.cardSm,
              borderWidth: 1,
              borderColor: colors.inputBorder,
              color: colors.inputText,
              backgroundColor: colors.card,
              fontWeight: "600",
            }}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: screenEdge.horizontal, paddingBottom: space.sm }}>
            {chip(section === "docs", "Mini documentales", () => setSection("docs"))}
            {chip(section === "stories", "Cuentos", () => setSection("stories"))}
            {chip(section === "experiments", "Experimentos", () => setSection("experiments"))}
            {chip(section === "facts", "Datos curiosos", () => setSection("facts"))}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: screenEdge.horizontal, paddingBottom: space.md }}>
            <Text style={{ alignSelf: "center", color: colors.textMuted, fontWeight: "800", marginRight: space.sm }}>Edad</Text>
            {chip(age === "all", "Todas", () => setAge("all"))}
            {chip(age === "5-7", "5-7", () => setAge("5-7"))}
            {chip(age === "8-10", "8-10", () => setAge("8-10"))}
            {chip(age === "11-15", "11-15", () => setAge("11-15"))}
            <Text style={{ alignSelf: "center", color: colors.textMuted, fontWeight: "800", marginHorizontal: space.sm }}>|</Text>
            <Text style={{ alignSelf: "center", color: colors.textMuted, fontWeight: "800", marginRight: space.sm }}>Materia</Text>
            {chip(subject === "all", "Todas", () => setSubject("all"))}
            {(Object.keys(SUBJECT_LABELS) as SubjectTag[]).map((s) => chip(subject === s, SUBJECT_LABELS[s], () => setSubject(s)))}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: screenEdge.horizontal, paddingBottom: space.md }}>
            <Text style={{ alignSelf: "center", color: colors.textMuted, fontWeight: "800", marginRight: space.sm }}>Duración</Text>
            {chip(duration === "all", "Todas", () => setDuration("all"))}
            {chip(duration === "corto", "< 5 min", () => setDuration("corto"))}
            {chip(duration === "medio", "5-15 min", () => setDuration("medio"))}
            {chip(duration === "largo", "> 15 min", () => setDuration("largo"))}
            <Text style={{ alignSelf: "center", color: colors.textMuted, fontWeight: "800", marginHorizontal: space.sm }}>|</Text>
            <Text style={{ alignSelf: "center", color: colors.textMuted, fontWeight: "800", marginRight: space.sm }}>Dificultad</Text>
            {chip(difficulty === "all", "Todas", () => setDifficulty("all"))}
            {chip(difficulty === "facil", "Fácil", () => setDifficulty("facil"))}
            {chip(difficulty === "medio", "Media", () => setDifficulty("medio"))}
            {chip(difficulty === "avanzado", "Avanzada", () => setDifficulty("avanzado"))}
            <Text style={{ alignSelf: "center", color: colors.textMuted, fontWeight: "800", marginHorizontal: space.sm }}>|</Text>
            {chip(sortBy === "popular", "Popularidad", () => setSortBy("popular"))}
            {chip(sortBy === "new", "Novedades", () => setSortBy("new"))}
          </ScrollView>
          {section === "docs" ? (
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: screenEdge.horizontal, paddingBottom: space.sm }}>
              <Text style={{ color: colors.textSecondary, fontWeight: "700" }}>Subtítulos por defecto</Text>
              <Switch value={subtitlesDefault} onValueChange={(v) => void persistSubtitles(v)} />
            </View>
          ) : null}
        </View>

        {section === "docs" ? (
          <View style={{ marginTop: space.md }}>
            <Text style={{ color: colors.textMuted, fontWeight: "800", paddingHorizontal: screenEdge.horizontal, marginBottom: space.sm }}>
              Mini documentales ({filteredDocs.length} de {MINI_DOCUMENTARIES.length}) · voz clara y animaciones
            </Text>
            {filteredDocs.map((item) => (
              <View key={item.id}>{renderDoc({ item })}</View>
            ))}
          </View>
        ) : null}

        {section === "stories" ? (
          <View style={{ marginTop: space.md }}>
            <Text style={{ color: colors.textMuted, fontWeight: "800", paddingHorizontal: screenEdge.horizontal, marginBottom: space.sm }}>
              Cuentos interactivos · decisiones · comprensión cada 3 páginas
            </Text>
            {filteredStories.map((item) => (
              <View key={item.id}>{renderStory({ item })}</View>
            ))}
          </View>
        ) : null}

        {section === "experiments" ? (
          <View style={{ marginTop: space.md }}>
            <Text style={{ color: colors.textMuted, fontWeight: "800", paddingHorizontal: screenEdge.horizontal, marginBottom: space.sm }}>
              Experimentos en casa · guías y video demo
            </Text>
            {filteredExperiments.map((item) => (
              <View key={item.id}>{renderExperiment({ item })}</View>
            ))}
          </View>
        ) : null}

        {section === "facts" && currentFact ? (
          <View style={{ marginTop: space.md, alignItems: "center" }}>
            <Text style={{ color: colors.textMuted, fontWeight: "800", marginBottom: space.sm, paddingHorizontal: screenEdge.horizontal, alignSelf: "stretch" }}>
              Datos curiosos · deslizá como tarjetas
            </Text>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={{ width }}
              decelerationRate="fast"
              onMomentumScrollEnd={(e) => {
                const x = e.nativeEvent.contentOffset.x;
                const idx = Math.round(x / width);
                setFactIndex(Math.max(0, Math.min(factData.length - 1, idx)));
              }}
            >
              {factData.map((item) => (
                <View key={item.id} style={{ width, alignItems: "center", paddingHorizontal: screenEdge.horizontal }}>
                  <View
                    style={{
                      width: cardW,
                      minHeight: 220,
                      padding: space.lg,
                      borderRadius: radius.card,
                      backgroundColor: mode === "dark" ? colors.cardElevated : colors.primarySoft,
                      borderWidth: 2,
                      borderColor: colors.primarySoftBorder,
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ color: colors.primaryStrong, fontWeight: "900", fontSize: typography.secondary, marginBottom: space.sm }}>{item.category}</Text>
                    <Text style={{ color: colors.text, fontWeight: "900", fontSize: typography.title, lineHeight: 26 }}>{item.fact}</Text>
                    <Text style={{ color: colors.textMuted, fontWeight: "700", marginTop: space.md }}>{SUBJECT_LABELS[item.subject]} · {item.ageBand}</Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: space.lg, marginTop: space.lg }}>
                    <Pressable onPress={() => void shareFact(item)} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <AppIcon name="share-social-outline" size="md" color={colors.link} />
                      <Text style={{ color: colors.link, fontWeight: "800" }}>Compartir</Text>
                    </Pressable>
                    <Pressable onPress={() => void toggleFavFact(item.id)} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <AppIcon name={favorites.facts.includes(item.id) ? "heart" : "heart-outline"} size="md" color={colors.primary} />
                      <Text style={{ color: colors.primary, fontWeight: "800" }}>Guardar</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </ScrollView>
            <Text style={{ color: colors.textMuted, marginTop: space.sm, fontWeight: "700" }}>
              {factIndex + 1} / {factData.length}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={dictOpen} transparent animationType="fade" onRequestClose={() => setDictOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: colors.modalOverlay, justifyContent: "center", padding: space.lg }} onPress={() => setDictOpen(false)}>
          <Pressable style={{ borderRadius: radius.sheet, backgroundColor: colors.modalCard, padding: space.lg }} onPress={(e) => e.stopPropagation()}>
            <Text style={{ color: colors.text, fontWeight: "900", fontSize: typography.title }}>Diccionario</Text>
            <Text style={{ color: colors.textSecondary, marginTop: space.sm, fontWeight: "600" }}>
              Tocá una palabra desconocida en el cuento para ver definición simple, sinónimos y ejemplo. (Demo: “{dictWord}”)
            </Text>
            <Pressable onPress={() => setDictOpen(false)} style={{ marginTop: space.lg, alignSelf: "flex-end" }}>
              <Text style={{ color: colors.link, fontWeight: "900" }}>Cerrar</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
