import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import { useTheme } from "../contexts/ThemeContext";
import {
  consumeNextCelebration,
  subscribeCelebration,
  type CelebrationEvent,
} from "../lib/celebrationBus";
import { playLevelUp, playReward } from "../services/soundManager";
import { radius, space, typography } from "../theme/tokens";

const CONFETTI_COLORS = [
  "#f472b6",
  "#34d399",
  "#60a5fa",
  "#fbbf24",
  "#a78bfa",
  "#fb7185",
  "#38bdf8",
  "#c084fc",
];

type ConfettiPieceConfig = {
  left: number;
  delay: number;
  duration: number;
  color: string;
  size: number;
  drift: number;
};

function ConfettiBurst({ active }: { active: boolean }) {
  const { width, height } = useWindowDimensions();
  const pieces = useMemo<ConfettiPieceConfig[]>(() => {
    return Array.from({ length: 42 }, (_, i) => ({
      left: Math.random() * width,
      delay: Math.random() * 350,
      duration: 1900 + Math.random() * 900,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length]!,
      size: 6 + Math.random() * 5,
      drift: (Math.random() - 0.5) * 120,
    }));
  }, [width, active]);

  if (!active) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { overflow: "hidden" }]} pointerEvents="none">
      {pieces.map((p, i) => (
        <ConfettiPiece key={`c-${i}-${p.left}`} {...p} height={height} />
      ))}
    </View>
  );
}

function ConfettiPiece(
  p: ConfettiPieceConfig & {
    height: number;
  },
) {
  const y = useRef(new Animated.Value(-30)).current;
  const x = useRef(new Animated.Value(0)).current;
  const rot = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    y.setValue(-30);
    x.setValue(0);
    rot.setValue(0);
    const anim = Animated.parallel([
      Animated.timing(y, {
        toValue: p.height * 0.72,
        duration: p.duration,
        delay: p.delay,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(x, {
        toValue: p.drift,
        duration: p.duration,
        delay: p.delay,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
      Animated.timing(rot, {
        toValue: 1,
        duration: p.duration,
        delay: p.delay,
        useNativeDriver: true,
      }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [p.delay, p.duration, p.drift, p.height]);

  const spin = rot.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "720deg"],
  });

  return (
    <Animated.View
      style={{
        position: "absolute",
        left: p.left,
        top: 0,
        width: p.size,
        height: p.size * 0.55,
        backgroundColor: p.color,
        borderRadius: 2,
        opacity: 0.95,
        transform: [{ translateY: y }, { translateX: x }, { rotate: spin }],
      }}
    />
  );
}

function celebrationCopy(e: CelebrationEvent): { title: string; subtitle: string } {
  if (e.kind === "level_up") {
    return {
      title: "¡Subiste de nivel!",
      subtitle: `Nivel ${e.newLevel} · seguí sumando XP 🚀`,
    };
  }
  return {
    title: "¡Logro desbloqueado!",
    subtitle: e.icon ? `${e.icon} ${e.title}` : e.title,
  };
}

/**
 * Modal global con confeti y animación al subir de nivel o desbloquear logros (quiz / contenido).
 */
export function CelebrationHost() {
  const { colors } = useTheme();
  const visibleRef = useRef(false);
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState<CelebrationEvent | null>(null);
  const scale = useRef(new Animated.Value(0.88)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const openNext = useCallback(() => {
    if (visibleRef.current) return;
    const next = consumeNextCelebration();
    if (!next) return;
    visibleRef.current = true;
    setCurrent(next);
    setVisible(true);
  }, []);

  const dismiss = useCallback(() => {
    visibleRef.current = false;
    setVisible(false);
    setCurrent(null);
    setTimeout(() => openNext(), 240);
  }, [openNext]);

  useEffect(() => subscribeCelebration(openNext), [openNext]);

  useEffect(() => {
    if (!visible || !current) return;
    if (current.kind === "level_up") playLevelUp();
    else playReward();
  }, [visible, current]);

  useEffect(() => {
    if (!visible || !current) return;
    scale.setValue(0.88);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        friction: 7,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, current]);

  const copy = current ? celebrationCopy(current) : { title: "", subtitle: "" };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={dismiss}>
      <View style={styles.modalRoot}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={dismiss}
          accessibilityRole="button"
          accessibilityLabel="Cerrar"
        />
        <View style={[StyleSheet.absoluteFill, { overflow: "hidden" }]} pointerEvents="none">
          <ConfettiBurst active={visible && !!current} />
        </View>
        <View style={styles.cardWrap} pointerEvents="box-none">
          <Animated.View
            style={[
              styles.card,
              {
                backgroundColor: colors.cardElevated,
                borderColor: colors.borderSubtle,
                transform: [{ scale }],
                opacity,
              },
            ]}
          >
            <Text style={[styles.title, { color: colors.text }]}>{copy.title}</Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>{copy.subtitle}</Text>
            <Pressable
              onPress={dismiss}
              style={({ pressed }) => [
                styles.btn,
                { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Genial"
            >
              <Text style={[styles.btnText, { color: colors.textOnPrimary }]}>¡Genial!</Text>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  cardWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    padding: space.lg,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    borderRadius: radius.sheet,
    borderWidth: 1,
    padding: space.lg,
    alignItems: "center",
  },
  title: {
    fontSize: typography.bodyLarge + 4,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: space.sm,
  },
  subtitle: {
    fontSize: typography.body,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: space.md,
  },
  btn: {
    marginTop: space.xs,
    paddingVertical: space.sm + space.xs,
    paddingHorizontal: space.xl,
    borderRadius: radius.cardSm,
    minWidth: 160,
    alignItems: "center",
  },
  btnText: {
    fontWeight: "800",
    fontSize: typography.bodyLarge,
  },
});
