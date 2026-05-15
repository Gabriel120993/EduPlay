import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { emitCelebration } from "../../lib/celebrationBus";
import { playWhoosh } from "../../services/soundManager";
import { screenEdge, space, typography } from "../../theme/tokens";

const GRADIENT = ["#4A90D9", "#5BA3E8", "#7BB8F0"] as const;

const COPY = {
  child: {
    title: "¡Todo listo!",
    subtitle: "Ya podés empezar a aprender y divertirte",
    button: "¡Empezar! 🚀",
    celebration: { title: "¡Primeros pasos!", icon: "🎉" as const },
    rewards: [
      { icon: "🏆", title: "Logro desbloqueado", value: "Primeros pasos" },
      { icon: "⭐", title: "Experiencia", value: "Sumá XP con cada juego" },
      { icon: "🪙", title: "Monedas", value: "Ganalas en retos y tienda" },
    ],
  },
  parent: {
    title: "¡Todo listo!",
    subtitle: "Ya podés ver el progreso de tu hijo y usar el panel del tutor.",
    button: "Ir al dashboard 🚀",
    celebration: { title: "¡Configuración lista!", icon: "🚀" as const },
    rewards: [
      { icon: "👤", title: "Perfil tutor", value: "Listo" },
      { icon: "👨‍👧", title: "Perfil hijo", value: "Agregado" },
      { icon: "📊", title: "Panel", value: "A tu disposición" },
    ],
  },
} as const;

export type OnboardingCompleteVariant = keyof typeof COPY;

type Props = {
  onContinue: () => void | Promise<void>;
  variant?: OnboardingCompleteVariant;
};

function RewardItem({ icon, title, value }: { icon: string; title: string; value: string }) {
  return (
    <View style={styles.rewardItem}>
      <Text style={styles.rewardIcon} accessibilityElementsHidden>
        {icon}
      </Text>
      <View style={styles.rewardTextCol}>
        <Text style={styles.rewardTitle}>{title}</Text>
        <Text style={styles.rewardValue}>{value}</Text>
      </View>
    </View>
  );
}

export function OnboardingCompleteScreen({ onContinue, variant = "child" }: Props) {
  const insets = useSafeAreaInsets();
  const copy = COPY[variant];
  const scaleAnim = useRef(new Animated.Value(0.5)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    emitCelebration({
      kind: "achievement",
      title: copy.celebration.title,
      icon: copy.celebration.icon,
    });
  }, [copy.celebration.icon, copy.celebration.title]);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [opacityAnim, scaleAnim]);

  return (
    <LinearGradient
      colors={[...GRADIENT]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.2, y: 1 }}
      style={[
        styles.gradient,
        { paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.md },
      ]}
    >
      <Animated.View style={[styles.content, { opacity: opacityAnim }]}>
        <Animated.Text
          style={[styles.emoji, { transform: [{ scale: scaleAnim }] }]}
          accessibilityLabel="Celebración"
        >
          🎉
        </Animated.Text>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.subtitle}>{copy.subtitle}</Text>

        <View style={styles.rewards} accessibilityRole="summary">
          {copy.rewards.map((r) => (
            <RewardItem key={r.title} icon={r.icon} title={r.title} value={r.value} />
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={() => {
            playWhoosh();
            void Promise.resolve(onContinue());
          }}
          accessibilityRole="button"
          accessibilityLabel={copy.button}
        >
          <Text style={styles.buttonText}>{copy.button}</Text>
        </Pressable>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    paddingHorizontal: screenEdge.horizontal + space.xs,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    maxWidth: 440,
    width: "100%",
    alignSelf: "center",
  },
  emoji: {
    fontSize: 72,
    textAlign: "center",
    marginBottom: space.md,
  },
  title: {
    fontSize: typography.title + 2,
    fontWeight: "900",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: space.sm,
    letterSpacing: -0.5,
    textShadowColor: "rgba(0,0,0,0.15)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: typography.bodyLarge,
    lineHeight: typography.bodyLarge + space.sm,
    color: "rgba(255,255,255,0.95)",
    textAlign: "center",
    marginBottom: space.lg + space.sm,
    fontWeight: "600",
  },
  rewards: {
    gap: space.sm + space.xs,
    marginBottom: space.lg + space.md,
  },
  rewardItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
  },
  rewardIcon: {
    fontSize: 28,
  },
  rewardTextCol: {
    flex: 1,
    minWidth: 0,
  },
  rewardTitle: {
    fontSize: typography.body,
    fontWeight: "700",
    color: "rgba(255,255,255,0.9)",
    marginBottom: 2,
  },
  rewardValue: {
    fontSize: typography.bodyLarge,
    fontWeight: "800",
    color: "#ffffff",
  },
  button: {
    backgroundColor: "#ffffff",
    borderRadius: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonPressed: {
    opacity: 0.92,
  },
  buttonText: {
    fontSize: typography.bodyLarge,
    fontWeight: "800",
    color: "#1e40af",
  },
});
