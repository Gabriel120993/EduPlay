import { useMemo } from "react";
import {
  Image,
  Platform,
  StyleSheet,
  View,
  useColorScheme,
  type ImageStyle,
  type StyleProp,
} from "react-native";

import { useThemeOptional } from "../contexts/ThemeContext";

type Props = {
  width?: number;
  height?: number;
  style?: StyleProp<ImageStyle>;
  /**
   * En modo oscuro, mejora el contraste (fondo claro + borde sutil) para que el logo no se pierda.
   * Desactivar en splash de marca o fondos de color fijo (p. ej. morado marca).
   */
  useContrastOnDark?: boolean;
};

/** Logo estándar (fondos claros o color marca). */
const LOGO_DEFAULT = require("../../assets/eduplay-logo.png");
/**
 * Versión para UI oscura: por defecto es copia del logo; reemplazá el PNG por una variante clara
 * (blanco / contorno claro) si el logo original pierde contraste sobre #121212.
 */
const LOGO_ON_DARK_UI = require("../../assets/eduplay-logo-light.png");

export function BrandLogo({ width = 150, height = 52, style, useContrastOnDark = true }: Props) {
  const theme = useThemeOptional();
  const systemScheme = useColorScheme();
  const mode = theme?.mode ?? (systemScheme === "dark" ? "dark" : "light");
  const needsContrast = useContrastOnDark && mode === "dark";

  const pad = useMemo(() => {
    if (!needsContrast) return 0;
    return Math.max(2, Math.round(Math.min(width, height) * 0.1));
  }, [needsContrast, width, height]);

  const innerW = width - 2 * pad;
  const innerH = height - 2 * pad;
  const corner = Math.max(8, Math.round(Math.min(width, height) * 0.22));
  const subtleCorner = Math.max(8, Math.round(Math.min(width, height) * 0.2));

  if (!needsContrast) {
    return (
      <View
        style={[
          styles.subtleWrap,
          {
            width,
            height,
            borderRadius: subtleCorner,
          },
          Platform.OS === "ios" ? styles.subtleShadowIos : styles.subtleShadowAndroid,
        ]}
      >
        <Image
          source={LOGO_DEFAULT}
          style={[{ width, height } as ImageStyle, style]}
          resizeMode="contain"
          accessibilityRole="image"
          accessibilityLabel="Logo de EduPlay"
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.contrastWrap,
        {
          width,
          height,
          padding: pad,
          borderRadius: corner,
        },
        Platform.OS === "ios" ? styles.contrastShadowIos : styles.contrastShadowAndroid,
      ]}
    >
      <Image
        source={LOGO_ON_DARK_UI}
        style={[{ width: innerW, height: innerH } as ImageStyle, style]}
        resizeMode="contain"
        accessibilityRole="image"
        accessibilityLabel="Logo de EduPlay"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  subtleWrap: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15, 23, 42, 0.12)",
    backgroundColor: "rgba(255, 255, 255, 0.01)",
  },
  subtleShadowIos: {
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  subtleShadowAndroid: {
    elevation: 1,
  },
  contrastWrap: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(248, 250, 252, 0.96)",
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: "rgba(255, 255, 255, 0.45)",
    overflow: "hidden",
  },
  contrastShadowIos: {
    shadowColor: "#ffffff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  contrastShadowAndroid: {
    elevation: 3,
  },
});
