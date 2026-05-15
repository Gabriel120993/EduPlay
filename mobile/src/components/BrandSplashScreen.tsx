import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

import { BrandLogo } from "./BrandLogo";

/**
 * Splash visual de marca (in-app):
 * - Fondo color marca.
 * - Logo centrado.
 * - Fade sutil del logo.
 */
export function BrandSplashScreen() {
  const opacity = useRef(new Animated.Value(0.72)).current;
  const scale = useRef(new Animated.Value(0.97)).current;

  useEffect(() => {
    const anim = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]);
    anim.start();
    return () => {
      anim.stop();
    };
  }, [opacity, scale]);

  return (
    <View style={styles.root}>
      <Animated.View
        style={{
          opacity,
          transform: [{ scale }],
        }}
      >
        <BrandLogo width={156} height={156} useContrastOnDark={false} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4f46e5",
  },
});
