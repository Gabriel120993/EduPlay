import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { AppIcon } from "../components/AppIcon";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useAuth } from "../contexts/AuthContext";
import { showToast } from "../lib/toastBus";
import { saveLastOpenedContent } from "../lib/continueLearningStorage";
import { completeEducationalContent, getEducationalContentById, notifyMissionRewardsFromApiResponse } from "../services/api";
import type { EducationalContentItem } from "../types/api";
import { useTheme } from "../contexts/ThemeContext";
import { screenEdge, space } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "ContentDetail">;

function categoryEmoji(category: string): string {
  const c = category.trim().toLowerCase();
  if (c === "astronomy") return "🌌";
  if (c === "science") return "🧪";
  if (c === "math") return "➗";
  if (c === "history") return "📜";
  return "📚";
}

function splitSentences(content: string): string[] {
  return content
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function importantWordsByCategory(category: string): string[] {
  const c = category.trim().toLowerCase();
  if (c === "astronomy") return ["sistema solar", "sol", "planetas", "tierra"];
  if (c === "science") return ["materia", "sólido", "líquido", "gaseoso", "energía"];
  if (c === "math") return ["fracción", "suma", "resta", "partes", "cantidades"];
  if (c === "history") return ["antiguo egipto", "edad media", "civilización", "faraones"];
  return [];
}

export function ContentDetailScreen({ route }: Props) {
  const { colors } = useTheme();
  const { viewerUserId } = useAuth();
  const [item, setItem] = useState<EducationalContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [learned, setLearned] = useState(false);
  const [saving, setSaving] = useState(false);
  const completeLockRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
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
        <Text style={{ color: colors.error, textAlign: "center", fontWeight: "600" }}>
          {error ?? "Contenido no encontrado."}
        </Text>
      </View>
    );
  }

  const emoji = categoryEmoji(item.category);
  const sentences = splitSentences(item.content);
  const paragraphs = sentences.slice(0, 2);
  const bulletPoints = sentences.slice(2);
  const importantWords = importantWordsByCategory(item.category);
  const wordsPattern = importantWords.length > 0 ? new RegExp(`(${importantWords.join("|")})`, "gi") : null;

  return (
    <ScrollView
      contentContainerStyle={{
        paddingHorizontal: screenEdge.horizontal,
        paddingVertical: space.lg + space.xs,
        gap: space.md + space.xs,
        backgroundColor: colors.background,
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
        </View>
      </View>
      {paragraphs.map((paragraph, idx) => (
        <Text key={`p-${idx}`} style={{ color: colors.text, fontSize: 16, lineHeight: 24 }}>
          {(wordsPattern ? paragraph.split(wordsPattern) : [paragraph]).map((part, i) => {
            const isImportant = importantWords.some((w) => w.toLowerCase() === part.toLowerCase());
            if (!isImportant) return <Text key={`t-${idx}-${i}`}>{part}</Text>;
            return (
              <Text key={`t-${idx}-${i}`} style={{ color: colors.primary, fontWeight: "800" }}>
                {part}
              </Text>
            );
          })}
        </Text>
      ))}
      {bulletPoints.length > 0 ? (
        <View style={{ gap: space.xs }}>
          {bulletPoints.map((point, idx) => (
            <Text key={`b-${idx}`} style={{ color: colors.text, fontSize: 15, lineHeight: 23 }}>
              {"• "}
              {point}
            </Text>
          ))}
        </View>
      ) : null}
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
                  result.dailyChallengeBonus.badgeUnlocked ? " · insignia «Campeón del día»" : ""
                }`
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
        accessibilityLabel="Marcar como aprendido"
      >
        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 15 }}>
          {saving ? "Guardando..." : learned ? "Aprendido ✅" : "Entendí / Aprendido ✅"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
