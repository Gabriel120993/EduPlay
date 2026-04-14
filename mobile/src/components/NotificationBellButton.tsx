import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { clearNotificationBell, subscribeNotificationBell } from "../lib/notificationBellBus";
import { space } from "../theme/tokens";

/**
 * Campana 🔔 en el header con punto de aviso y animación ligera al recibir notificaciones de logro.
 */
export function NotificationBellButton() {
  const [badgeCount, setBadgeCount] = useState(0);
  const bellScale = useRef(new Animated.Value(1)).current;
  const dotScale = useRef(new Animated.Value(1)).current;
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => subscribeNotificationBell(setBadgeCount), []);

  useEffect(() => {
    stopRef.current?.();
    stopRef.current = null;
    if (badgeCount <= 0) {
      bellScale.setValue(1);
      dotScale.setValue(1);
      return;
    }
    const wobble = Animated.loop(
      Animated.sequence([
        Animated.timing(bellScale, { toValue: 1.1, duration: 120, useNativeDriver: true }),
        Animated.timing(bellScale, { toValue: 1, duration: 120, useNativeDriver: true }),
        Animated.timing(bellScale, { toValue: 1.06, duration: 100, useNativeDriver: true }),
        Animated.timing(bellScale, { toValue: 1, duration: 160, useNativeDriver: true }),
      ])
    );
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(dotScale, { toValue: 1.3, duration: 520, useNativeDriver: true }),
        Animated.timing(dotScale, { toValue: 1, duration: 520, useNativeDriver: true }),
      ])
    );
    wobble.start();
    pulse.start();
    stopRef.current = () => {
      wobble.stop();
      pulse.stop();
    };
    return () => stopRef.current?.();
  }, [badgeCount, bellScale, dotScale]);

  return (
    <Pressable
      onPress={() => clearNotificationBell()}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Notificaciones"
      accessibilityHint="Limpia el aviso de nuevos logros"
      style={({ pressed }) => [styles.wrap, { opacity: pressed ? 0.75 : 1 }]}
    >
      <Animated.View style={{ transform: [{ scale: bellScale }] }}>
        <Text style={styles.bell} allowFontScaling={false}>
          🔔
        </Text>
      </Animated.View>
      {badgeCount > 0 ? (
        <Animated.View
          style={[styles.dot, { transform: [{ scale: dotScale }] }]}
          pointerEvents="none"
        />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    padding: space.sm,
    marginRight: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  bell: {
    fontSize: 22,
    lineHeight: 26,
  },
  dot: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#ef4444",
    borderWidth: 1.5,
    borderColor: "#fff",
  },
});
