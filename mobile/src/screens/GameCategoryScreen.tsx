import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../contexts/ThemeContext";
import type { RootStackParamList } from "../navigation/types";
import { playClick, playGameStart } from "../services/soundManager";
import { screenEdge, space } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "GameCategory">;
type QuizDifficulty = "EASY" | "MEDIUM" | "HARD";

const CATEGORY_META: Record<
  string,
  { label: string; icon: string; color: string; soft: string }
> = {
  astronomy: { label: "Astronomía", icon: "🌌", color: "#6366F1", soft: "#EEF2FF" },
  math: { label: "Matemáticas", icon: "➗", color: "#06B6D4", soft: "#ECFEFF" },
  science: { label: "Ciencia", icon: "🧪", color: "#10B981", soft: "#ECFDF5" },
  history: { label: "Historia", icon: "📜", color: "#D97706", soft: "#FFFBEB" },
  geography: { label: "Geografía", icon: "🌍", color: "#0EA5E9", soft: "#F0F9FF" },
  creativity: { label: "Creatividad", icon: "🎨", color: "#EC4899", soft: "#FDF2F8" },
  mixed: { label: "Modo desafío", icon: "🎯", color: "#7C3AED", soft: "#F5F3FF" },
};

export function GameCategoryScreen({ route, navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const category = route.params.category;
  const initialDifficulty = route.params.difficulty ?? "EASY";
  const [difficulty, setDifficulty] = useState<QuizDifficulty>(initialDifficulty);

  const categoryMeta = useMemo(
    () => CATEGORY_META[category] ?? { label: category, icon: "🎮", color: colors.primary, soft: colors.primarySoft },
    [category, colors.primary, colors.primarySoft]
  );

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top + space.md,
        paddingBottom: insets.bottom + space.md,
        paddingHorizontal: screenEdge.horizontal,
      }}
    >
      <Text style={{ color: colors.textMuted, fontWeight: "700", marginBottom: space.xs }}>Categoría</Text>
      <View
        style={{
          backgroundColor: categoryMeta.soft,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: categoryMeta.color,
          paddingHorizontal: space.md,
          paddingVertical: space.sm,
          marginBottom: space.lg,
        }}
      >
        <Text style={{ color: categoryMeta.color, fontSize: 28, fontWeight: "900" }}>
          {categoryMeta.icon} {categoryMeta.label}
        </Text>
      </View>

      <Text style={{ color: colors.textMuted, fontWeight: "700", marginBottom: space.sm }}>Dificultad</Text>
      <View style={{ flexDirection: "row", gap: space.sm, marginBottom: space.xl }}>
        {(["EASY", "MEDIUM", "HARD"] as const).map((opt) => {
          const active = opt === difficulty;
          return (
            <Pressable
              key={opt}
              onPress={() => {
                playClick();
                setDifficulty(opt);
              }}
              style={({ pressed }) => ({
                borderRadius: 999,
                borderWidth: active ? 2 : 1,
                borderColor: active ? categoryMeta.color : colors.borderSubtle,
                backgroundColor: active ? categoryMeta.soft : colors.card,
                paddingVertical: space.xs + 2,
                paddingHorizontal: space.md,
                opacity: pressed ? 0.92 : 1,
              })}
              accessibilityRole="button"
              accessibilityLabel={`Seleccionar dificultad ${opt}`}
            >
              <Text style={{ color: active ? categoryMeta.color : colors.text, fontWeight: "800" }}>{opt}</Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={() => {
          playGameStart();
          navigation.navigate("Quiz", { category, difficulty });
        }}
        style={({ pressed }) => ({
          borderRadius: 12,
          backgroundColor: categoryMeta.color,
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: space.sm + space.xs,
          opacity: pressed ? 0.9 : 1,
        })}
        accessibilityRole="button"
        accessibilityLabel="Jugar"
      >
        <Text style={{ color: "#fff", fontWeight: "900", fontSize: 16 }}>
          {categoryMeta.icon} Jugar
        </Text>
      </Pressable>

      <Pressable
        onPress={() => {
          playGameStart();
          navigation.navigate("VisualGame", { category, difficulty });
        }}
        style={({ pressed }) => ({
          marginTop: space.md,
          borderRadius: 12,
          borderWidth: 2,
          borderColor: categoryMeta.color,
          backgroundColor: categoryMeta.soft,
          alignItems: "center",
          justifyContent: "center",
          paddingVertical: space.sm + space.xs,
          opacity: pressed ? 0.9 : 1,
        })}
        accessibilityRole="button"
        accessibilityLabel="Jugar con imágenes"
      >
        <Text style={{ color: categoryMeta.color, fontWeight: "900", fontSize: 16 }}>🖼️ Jugar con imágenes</Text>
      </Pressable>
    </View>
  );
}
