import { useCallback, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { useTheme } from "../../contexts/ThemeContext";
import { space } from "../../theme/tokens";

export type TutorialStep = { title: string; body: string };

type Props = {
  steps: TutorialStep[];
  /** Al terminar (o saltar) */
  onDone: () => void;
};

export function TutorialOverlay({ steps, onDone }: Props) {
  const { colors } = useTheme();
  const [idx, setIdx] = useState(0);
  const step = steps[idx] ?? steps[0]!;
  const isLast = idx >= steps.length - 1;

  const progress = useMemo(() => ((idx + 1) / steps.length) * 100, [idx, steps.length]);

  const next = useCallback(() => {
    if (isLast) onDone();
    else setIdx((i) => i + 1);
  }, [isLast, onDone]);

  return (
    <View
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.72)",
        padding: space.lg,
        justifyContent: "center",
        zIndex: 50,
      }}
    >
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: 16,
          padding: space.lg,
          borderWidth: 1,
          borderColor: colors.borderSubtle,
        }}
      >
        <Text style={{ color: colors.textMuted, fontWeight: "800", marginBottom: space.xs }}>
          Tutorial · ~30 s
        </Text>
        <View
          style={{
            height: 6,
            backgroundColor: colors.ghostBg,
            borderRadius: 99,
            overflow: "hidden",
            marginBottom: space.md,
          }}
        >
          <View
            style={{ width: `${progress}%`, height: "100%", backgroundColor: colors.primary }}
          />
        </View>
        <Text
          style={{ color: colors.text, fontSize: 20, fontWeight: "900", marginBottom: space.sm }}
        >
          {step.title}
        </Text>
        <Text
          style={{
            color: colors.textSecondary,
            fontWeight: "600",
            lineHeight: 22,
            marginBottom: space.lg,
          }}
        >
          {step.body}
        </Text>
        <View style={{ flexDirection: "row", gap: space.sm, justifyContent: "flex-end" }}>
          <Pressable
            onPress={onDone}
            style={{ paddingVertical: 10, paddingHorizontal: 14 }}
            accessibilityRole="button"
            accessibilityLabel="Saltar tutorial"
          >
            <Text style={{ color: colors.link, fontWeight: "800" }}>Saltar</Text>
          </Pressable>
          <Pressable
            onPress={next}
            style={{
              backgroundColor: colors.primary,
              paddingVertical: 10,
              paddingHorizontal: 18,
              borderRadius: 12,
            }}
            accessibilityRole="button"
            accessibilityLabel={isLast ? "Empezar" : "Siguiente"}
          >
            <Text style={{ color: colors.textOnPrimary, fontWeight: "900" }}>
              {isLast ? "¡A jugar!" : "Siguiente"}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
