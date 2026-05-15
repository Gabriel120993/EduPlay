import { Pressable, ScrollView, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../contexts/ThemeContext";
import type { RootStackParamList } from "../navigation/types";
import { playClick } from "../services/soundManager";
import type { QuizKnowledgeArea } from "../types/api";
import { screenEdge, space } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "QuizAreas">;

const AREAS: Array<{
  area: QuizKnowledgeArea;
  label: string;
  icon: string;
  legacyCategory: string;
}> = [
  { area: "mathematics", label: "Matemáticas", icon: "➗", legacyCategory: "math" },
  { area: "natural_sciences", label: "Ciencias naturales", icon: "🧪", legacyCategory: "science" },
  { area: "social_sciences", label: "Ciencias sociales", icon: "🌍", legacyCategory: "geography" },
  { area: "language", label: "Lenguaje", icon: "📖", legacyCategory: "education" },
  { area: "art_culture", label: "Arte y cultura", icon: "🎨", legacyCategory: "creativity" },
  { area: "logic_thinking", label: "Pensamiento lógico", icon: "🧩", legacyCategory: "puzzle" },
  {
    area: "emotions_values",
    label: "Emociones y valores",
    icon: "💚",
    legacyCategory: "education",
  },
];

export function QuizAreasScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: insets.top + space.md,
        paddingBottom: insets.bottom + space.lg,
        paddingHorizontal: screenEdge.horizontal,
        gap: space.sm,
      }}
    >
      <Text style={{ color: colors.textMuted, fontWeight: "800", marginBottom: space.xs }}>
        Elegí un área · 5 niveles · varios tipos de pregunta
      </Text>
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: "900", marginBottom: space.md }}>
        Quizzes por materia
      </Text>
      {AREAS.map((row) => (
        <Pressable
          key={row.area}
          onPress={() => {
            playClick();
            navigation.navigate("Quiz", {
              knowledgeArea: row.area,
              category: row.legacyCategory,
              difficulty: "MEDIUM",
              adaptive: true,
              timerSeconds: 15,
            });
          }}
          style={({ pressed }) => ({
            backgroundColor: colors.card,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.borderSubtle,
            padding: space.md,
            opacity: pressed ? 0.92 : 1,
          })}
          accessibilityRole="button"
          accessibilityLabel={`Abrir quizzes de ${row.label}`}
        >
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: "800" }}>
            {row.icon} {row.label}
          </Text>
          <Text style={{ color: colors.textMuted, marginTop: space.xs, fontWeight: "600" }}>
            Modo adaptativo · temporizador 15 s
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
