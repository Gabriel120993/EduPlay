import { Platform, Text, View } from "react-native";

import { APP_TAGLINE, appTaglineSubtitle } from "../constants/brand";
import { useTheme } from "../contexts/ThemeContext";
import { space } from "../theme/tokens";
import { BrandLogo } from "./BrandLogo";

export type AppHeaderBrandTitleProps = {
  /** Tercera línea opcional (p. ej. nombre de pantalla en stacks de padres). */
  detail?: string;
};

/** Cabecera de marca (logo + nombre + eslogan), igual en tabs del menor y en el panel de padres. */
export function AppHeaderBrandTitle({ detail }: AppHeaderBrandTitleProps = {}) {
  const { colors } = useTheme();
  const a11yLabel = detail ? `${APP_TAGLINE}. ${detail}` : APP_TAGLINE;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        maxWidth: Platform.OS === "web" ? 420 : "88%",
        paddingHorizontal: space.xs,
        gap: space.sm,
      }}
      accessibilityRole="header"
      accessibilityLabel={a11yLabel}
    >
      <BrandLogo width={44} height={44} />
      <View style={{ flexShrink: 1, minWidth: 0, justifyContent: "center" }}>
        <Text
          style={{
            color: colors.headerTint,
            fontSize: 20,
            fontWeight: "800",
            letterSpacing: 0.3,
            lineHeight: 24,
          }}
          numberOfLines={1}
        >
          EduPlay
        </Text>
        <Text
          style={{
            color: colors.headerTint,
            fontSize: 13,
            fontWeight: "600",
            opacity: 0.92,
            marginTop: 2,
            lineHeight: 17,
            letterSpacing: 0.2,
          }}
          numberOfLines={2}
        >
          {appTaglineSubtitle()}
        </Text>
        {detail ? (
          <Text
            style={{
              color: colors.headerTint,
              fontSize: 11,
              fontWeight: "800",
              opacity: 0.88,
              marginTop: 3,
              lineHeight: 14,
              letterSpacing: 0.35,
            }}
            numberOfLines={1}
          >
            {detail}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
