import { createElement, useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
  type ImageStyle,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { API_BASE_URL } from "../config";
import { useTheme } from "../contexts/ThemeContext";
import { ImageCache } from "../services/ImageCache";
import { space } from "../theme/tokens";

/** CDNs como flagcdn suelen aceptar mejor peticiones con User-Agent de navegador. */
const REMOTE_IMAGE_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (compatible; EduPlay/1.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
};

export type QuizImageSize = "small" | "medium" | "large";

const HEIGHT_BY_SIZE: Record<QuizImageSize, number> = {
  small: 120,
  medium: 200,
  large: 280,
};

/** En web, `<img src="/api/...">` se resuelve contra el host de Metro (8081), no el API (3000). */
function resolveAbsoluteImageUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return t;
  if (t.startsWith("http://") || t.startsWith("https://") || t.startsWith("data:") || t.startsWith("file://")) {
    return t;
  }
  if (t.startsWith("//")) return `https:${t}`;
  if (t.startsWith("/")) {
    const base = API_BASE_URL.replace(/\/$/, "");
    return `${base}${t}`;
  }
  return t;
}

export type QuizImageProps = {
  /** URL absoluta (p. ej. la que envía `GET /api/quiz` como `imageUrl`). */
  imageUrl: string;
  /** Id de pregunta u otra clave: al cambiar, se reinicia el reintento sin cabeceras. */
  recycleKey?: string;
  size?: QuizImageSize;
  /** La imagen usa ancho y alto 100% del contenedor (el padre debe definir tamaño). */
  fill?: boolean;
  /** Sin borde ni fondo tipo tarjeta (p. ej. dentro de un marco con estilo propio). */
  borderless?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function QuizImage({
  imageUrl,
  recycleKey,
  size = "medium",
  fill,
  borderless,
  style,
}: QuizImageProps) {
  const { colors } = useTheme();
  const uri = imageUrl.trim();
  const cacheKey = recycleKey ?? "quiz";
  const initialResolved = useMemo(() => resolveAbsoluteImageUrl(uri), [uri]);
  const [displayUri, setDisplayUri] = useState(initialResolved);
  const [loading, setLoading] = useState(Boolean(uri));
  const [fatalError, setFatalError] = useState(false);
  const [headerAttempt, setHeaderAttempt] = useState(0);

  useEffect(() => {
    setHeaderAttempt(0);
    setFatalError(false);
    const resolved = resolveAbsoluteImageUrl(uri);
    setLoading(Boolean(resolved));
    setDisplayUri(resolved);

    if (!resolved) return;

    if (Platform.OS === "web") {
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const localOrRemote = await ImageCache.cacheImage(cacheKey, resolved, REMOTE_IMAGE_HEADERS);
        if (!cancelled) setDisplayUri(resolveAbsoluteImageUrl(localOrRemote.trim() || resolved));
      } catch {
        if (!cancelled) setDisplayUri(resolved);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cacheKey, uri]);

  const isLocalFile = useMemo(() => {
    const u = displayUri;
    return u.startsWith("file://") || (Platform.OS !== "web" && u.startsWith("/") && !u.startsWith("http"));
  }, [displayUri]);

  const source = useMemo(() => {
    if (!displayUri) return { uri: "" };
    const fileUri = displayUri.startsWith("/") && !displayUri.startsWith("http") ? `file://${displayUri}` : displayUri;
    if (isLocalFile) {
      return { uri: fileUri.startsWith("file://") ? fileUri : `file://${fileUri}` };
    }
    if (Platform.OS === "web") return { uri: displayUri };
    if (headerAttempt === 0) return { uri: displayUri, headers: REMOTE_IMAGE_HEADERS };
    return { uri: displayUri };
  }, [displayUri, headerAttempt, isLocalFile]);

  const fixedHeight = HEIGHT_BY_SIZE[size];
  const imageStyle: ImageStyle = fill
    ? { width: "100%", height: "100%" }
    : { width: "100%", height: fixedHeight };

  const webImgStyle: CSSProperties = useMemo(
    () =>
      fill
        ? { width: "100%", height: "100%", objectFit: "contain", display: "block" }
        : { width: "100%", height: fixedHeight, objectFit: "contain", display: "block" },
    [fill, fixedHeight]
  );

  if (!uri) return null;

  return (
    <View
      style={[
        borderless ? styles.borderlessWrap : styles.container,
        !borderless && { backgroundColor: colors.card, borderColor: colors.borderSubtle },
        style,
      ]}
    >
      {loading && !fatalError ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : null}
      {Platform.OS === "web"
        ? createElement("img", {
            key: `${cacheKey}-${displayUri}-${headerAttempt}`,
            src: displayUri,
            alt: "Imagen de la pregunta",
            /** Wikimedia y similares suelen rechazar hotlink con Referer de localhost. */
            referrerPolicy: "no-referrer",
            loading: "lazy",
            decoding: "async",
            style: webImgStyle,
            onLoad: () => {
              setLoading(false);
              setFatalError(false);
            },
            onError: () => {
              setLoading(false);
              setFatalError(true);
            },
          })
        : (
          <Image
            key={`${cacheKey}-${displayUri}-${headerAttempt}`}
            source={source}
            style={imageStyle}
            resizeMode="contain"
            accessibilityLabel="Imagen de la pregunta"
            onLoadStart={() => {
              setLoading(true);
              setFatalError(false);
            }}
            onLoadEnd={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              if (!isLocalFile && headerAttempt === 0) {
                setHeaderAttempt(1);
                setLoading(true);
                return;
              }
              setFatalError(true);
            }}
          />
        )}
      {fatalError ? (
        <View
          style={[styles.errorOverlay, { backgroundColor: colors.ghostBg }]}
          accessibilityRole="alert"
        >
          <Text style={[styles.errorText, { color: colors.error }]}>Imagen no disponible</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  borderlessWrap: {
    width: "100%",
    height: "100%",
    borderWidth: 0,
    backgroundColor: "transparent",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loader: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    padding: space.sm,
  },
  errorText: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
});
