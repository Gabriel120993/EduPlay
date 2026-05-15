import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppIcon } from "../components/AppIcon";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useAuth } from "../contexts/AuthContext";
import { showToast } from "../lib/toastBus";
import { saveLastOpenedContent } from "../lib/continueLearningStorage";
import {
  completeEducationalContent,
  getEducationalContentById,
  notifyMissionRewardsFromApiResponse,
} from "../services/api";
import type { EducationalContentItem } from "../types/api";
import { useTheme } from "../contexts/ThemeContext";
import { learnMarkdownForTopicSlug } from "../data/learnBodies";
import { educationalMetaToMarkdown } from "../lib/educationalMetaMarkdown";
import { screenEdge, space } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/types";
import { findFallbackEducationalContentById } from "../services/educationalFallbacks";
import {
  findLibraryEducationalContentById,
  isOfflineLibraryContentId,
} from "./libraryMediaCatalog";

type Props = NativeStackScreenProps<RootStackParamList, "ContentDetail">;

function categoryEmoji(category: string | undefined | null): string {
  const c = String(category ?? "")
    .trim()
    .toLowerCase();
  if (c === "astronomy") return "🌌";
  if (c === "science") return "🧪";
  if (c === "math") return "➗";
  if (c === "history") return "📜";
  if (c === "geography") return "🌍";
  if (c === "creativity") return "🎨";
  return "📚";
}

function normalizeMarkdownLines(content: string | null | undefined): string {
  return String(content ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

function resolvedReadingMarkdown(item: EducationalContentItem): string {
  const base = normalizeMarkdownLines(item.content);
  if (base.length > 0) return base;
  const fromSlug = normalizeMarkdownLines(learnMarkdownForTopicSlug(item.topicSlug ?? undefined));
  if (fromSlug.length > 0) return fromSlug;
  return normalizeMarkdownLines(educationalMetaToMarkdown(item.meta));
}

function splitSentences(content: string | null | undefined): string[] {
  return String(content ?? "")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

type ContentBlock =
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "bullets"; items: string[] };

function bulletLikeLine(l: string): boolean {
  return /^([•\-*·]|\d+[.)])\s/.test(l);
}

function parseContentBlocks(content: string | null | undefined): ContentBlock[] {
  const trimmed = normalizeMarkdownLines(content);
  if (!trimmed) return [];
  const blocks: ContentBlock[] = [];
  for (const chunk of trimmed.split(/\n\n+/)) {
    const lines = chunk
      .split("\n")
      .map((l) => String(l ?? "").trim())
      .filter((l) => l.length > 0);
    if (lines.length === 0) continue;
    const first = lines[0]!;

    if (first.startsWith("## ")) {
      blocks.push({ kind: "heading", text: first.slice(3).trim() });
      const rest = lines.slice(1);
      if (rest.length === 0) continue;
      if (rest.every((l) => bulletLikeLine(l))) {
        blocks.push({
          kind: "bullets",
          items: rest.map((l) =>
            String(l ?? "")
              .replace(/^([•\-*·]|\d+[.)])\s*/, "")
              .trim(),
          ),
        });
      } else {
        blocks.push({ kind: "paragraph", text: rest.join("\n\n") });
      }
      continue;
    }

    if (lines.every((l) => bulletLikeLine(l))) {
      blocks.push({
        kind: "bullets",
        items: lines
          .map((l) =>
            String(l ?? "")
              .replace(/^([•\-*·]|\d+[.)])\s*/, "")
              .trim(),
          )
          .filter(Boolean),
      });
      continue;
    }

    blocks.push({ kind: "paragraph", text: lines.join("\n\n") });
  }
  return blocks;
}

function renderHighlightedParts(
  text: string | null | undefined,
  importantWords: string[],
  wordsPattern: RegExp | null,
  accentColor: string,
  keyPrefix: string,
): ReactNode[] {
  const safe = String(text ?? "");
  if (!wordsPattern) return [<Text key={`${keyPrefix}-0`}>{safe}</Text>];
  const parts = safe.split(wordsPattern);
  return parts.map((part, i) => {
    const hit = importantWords.some((w) => w.toLowerCase() === part.toLowerCase());
    if (!hit) return <Text key={`${keyPrefix}-${i}`}>{part}</Text>;
    return (
      <Text key={`${keyPrefix}-${i}`} style={{ color: accentColor, fontWeight: "900" }}>
        {part}
      </Text>
    );
  });
}

function importantWordsByCategory(category: string | undefined | null): string[] {
  const c = String(category ?? "")
    .trim()
    .toLowerCase();
  if (c === "astronomy") {
    return ["gravedad", "órbita", "estrellas", "planetas", "luz", "sistema solar", "galaxia"];
  }
  if (c === "science") {
    return [
      "energía",
      "agua",
      "experimento",
      "observación",
      "hipótesis",
      "evidencia",
      "campo magnético",
    ];
  }
  if (c === "math") {
    return ["número", "fracción", "forma", "medida", "cantidad"];
  }
  if (c === "history") {
    return ["civilización", "cultura", "historia", "comunidad", "tradición", "convivencia"];
  }
  if (c === "geography") {
    return ["continente", "país", "mapa", "océano", "capital", "río"];
  }
  if (c === "creativity") {
    return ["arte", "color", "música", "expresión", "imagen", "pintura"];
  }
  return ["idea", "pregunta", "aprender", "observación"];
}

function contentBlocksOrLegacy(content: string | null | undefined): ContentBlock[] {
  const blocks = parseContentBlocks(content);
  if (blocks.length > 0) return blocks;
  const fallback = splitSentences(content).filter(Boolean);
  return fallback.map((sentence) => ({ kind: "paragraph", text: sentence }));
}

export function ContentDetailScreen({ route }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { viewerUserId } = useAuth();
  const [item, setItem] = useState<EducationalContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [learned, setLearned] = useState(false);
  const [saving, setSaving] = useState(false);
  const completeLockRef = useRef(false);
  const insets = useSafeAreaInsets();
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const localItem = findLibraryEducationalContentById(route.params.contentId);
        if (localItem) {
          if (!mounted) return;
          setItem(localItem);
          return;
        }
        const offlineCurated = findFallbackEducationalContentById(route.params.contentId);
        if (offlineCurated) {
          if (!mounted) return;
          setItem(offlineCurated);
          return;
        }
        const row = await getEducationalContentById(route.params.contentId);
        if (!mounted) return;
        setItem(row);
      } catch {
        if (!mounted) return;
        setError("No se pudo cargar el contenido.");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [route.params.contentId]);

  useEffect(() => {
    if (!item) return;
    void saveLastOpenedContent({ contentId: item.id, title: item.title });
  }, [item?.id, item?.title]);

  useEffect(() => {
    setScrollProgress(0);
  }, [route.params.contentId]);

  const blocks = useMemo(() => {
    if (!item) return [];
    return contentBlocksOrLegacy(resolvedReadingMarkdown(item));
  }, [item]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          gap: space.md,
          backgroundColor: colors.background,
        }}
      >
        <AppIcon name="book-outline" color={colors.primary} size="lg" />
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error || !item) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: space.lg,
          gap: space.sm,
          backgroundColor: colors.background,
        }}
      >
        <AppIcon name="alert-circle-outline" color={colors.error} size="lg" />
        <Text
          style={{ color: colors.error, textAlign: "center", fontWeight: "600" }}
          allowFontScaling
        >
          {error ?? t("content.notFound")}
        </Text>
      </View>
    );
  }

  const emoji = categoryEmoji(item.category);
  const importantWords = importantWordsByCategory(item.category);
  const wordsPattern =
    importantWords.length > 0 ? new RegExp(`(${importantWords.join("|")})`, "gi") : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: screenEdge.horizontal,
          paddingTop: space.lg + space.xs,
          paddingBottom: space.xl + space.lg + insets.bottom,
          gap: space.md + space.xs,
          backgroundColor: colors.background,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
        scrollEventThrottle={16}
        onScroll={(e) => {
          const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
          const visible = layoutMeasurement.height;
          const total = contentSize.height;
          const maxScroll = Math.max(0, total - visible);
          const y = Math.max(0, contentOffset.y);
          const pct = maxScroll <= 8 ? 1 : Math.min(1, Math.max(0, y / maxScroll));
          setScrollProgress(pct);
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: space.sm }}>
          <AppIcon name="school-outline" color={colors.primary} size="md" />
          <View style={{ flex: 1, gap: space.xs }}>
            <Text style={{ color: colors.text, fontSize: 26, fontWeight: "800" }}>
              {emoji} {item.title}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: "700" }}>
              {emoji} {item.category} · {item.difficulty}
            </Text>
            {item.description?.trim() ? (
              <Text
                style={{
                  marginTop: space.sm,
                  color: colors.textSecondary,
                  fontSize: 15,
                  lineHeight: 22,
                  fontWeight: "700",
                }}
              >
                {item.description.trim()}
              </Text>
            ) : null}
          </View>
        </View>

        {blocks.length === 0 ? (
          <Text
            style={{
              marginTop: space.sm,
              color: colors.textSecondary,
              fontSize: 15,
              lineHeight: 22,
              fontWeight: "600",
            }}
          >
            Este recurso no tiene texto de lectura todavía. Si acabás de instalar EduPlay en
            desarrollo, corré la semilla de la base de datos desde el proyecto API.
          </Text>
        ) : null}

        {blocks.map((block, idx) => {
          if (block.kind === "heading") {
            return (
              <Text
                key={`h-${idx}`}
                accessibilityRole="header"
                style={{
                  marginTop: idx === 0 ? 0 : space.md,
                  fontSize: 19,
                  fontWeight: "900",
                  color: colors.primary,
                  letterSpacing: 0.2,
                }}
              >
                {block.text}
              </Text>
            );
          }

          if (block.kind === "paragraph") {
            return (
              <Text
                key={`p-${idx}`}
                selectable
                style={{ color: colors.text, fontSize: 17, lineHeight: 26, fontWeight: "600" }}
              >
                {renderHighlightedParts(
                  block.text,
                  importantWords,
                  wordsPattern,
                  colors.primary,
                  `p-${idx}`,
                )}
              </Text>
            );
          }

          return (
            <View key={`ul-${idx}`} style={{ gap: space.xs }}>
              {block.items.map((line, j) => (
                <Text
                  key={`li-${idx}-${j}`}
                  selectable
                  style={{ color: colors.text, fontSize: 16, lineHeight: 24, fontWeight: "600" }}
                >
                  <Text style={{ color: colors.primary, fontWeight: "900" }}>{"\u2022  "}</Text>
                  {renderHighlightedParts(
                    line,
                    importantWords,
                    wordsPattern,
                    colors.primary,
                    `li-${idx}-${j}`,
                  )}
                </Text>
              ))}
            </View>
          );
        })}
        {isOfflineLibraryContentId(item.id) ? (
          <Text style={{ color: colors.textMuted, fontWeight: "700", marginTop: space.sm }}>
            Vista previa de la biblioteca: el progreso y las recompensas XP se guardan en contenidos
            publicados en el servidor.
          </Text>
        ) : (
          <Pressable
            onPress={async () => {
              if (learned || saving || completeLockRef.current) return;
              if (!viewerUserId) {
                showToast("No hay usuario activo para guardar progreso.", "error");
                return;
              }
              completeLockRef.current = true;
              try {
                setSaving(true);
                const result = await completeEducationalContent(item.id, {
                  userId: viewerUserId,
                  createPost: true,
                });
                setLearned(true);
                notifyMissionRewardsFromApiResponse(result.missionRewards);
                const msg = [`¡Bien hecho! +${result.xpGained} XP`];
                if (result.dailyChallengeBonus) {
                  msg.push(
                    `Reto diario: +${result.dailyChallengeBonus.bonusXp} XP${
                      result.dailyChallengeBonus.badgeUnlocked
                        ? " · insignia «Campeón del día»"
                        : ""
                    }`,
                  );
                }
                showToast(msg.join(" · "), "success");
              } catch {
                showToast("No se pudo guardar el aprendizaje.", "error");
              } finally {
                completeLockRef.current = false;
                setSaving(false);
              }
            }}
            style={({ pressed }) => ({
              marginTop: space.md,
              borderRadius: 12,
              paddingVertical: space.sm + space.xs,
              paddingHorizontal: space.md,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: learned ? colors.success : colors.primary,
              opacity: pressed ? 0.9 : 1,
            })}
            accessibilityRole="button"
            accessibilityLabel={t("content.complete")}
          >
            <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }} allowFontScaling>
              {saving
                ? t("content.saving")
                : learned
                  ? `${t("content.learned")} ✅`
                  : `${t("content.complete")} ✅`}
            </Text>
          </Pressable>
        )}
      </ScrollView>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel="Progreso de lectura"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(scrollProgress * 100) }}
        style={{
          paddingHorizontal: screenEdge.horizontal,
          paddingBottom: Math.max(insets.bottom, space.sm),
          paddingTop: space.xs,
          backgroundColor: colors.background,
        }}
      >
        <View
          style={{
            height: 4,
            borderRadius: 2,
            overflow: "hidden",
            backgroundColor: colors.borderSubtle,
          }}
        >
          <View
            style={{
              width: `${Math.round(scrollProgress * 1000) / 10}%`,
              height: "100%",
              borderRadius: 2,
              backgroundColor: colors.primary,
            }}
          />
        </View>
      </View>
    </View>
  );
}
