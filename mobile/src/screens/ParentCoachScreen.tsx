import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";

import { BrandEmptyState } from "../components/BrandEmptyState";
import { PARENT_USER_ID } from "../config";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { formatApiError } from "../lib/apiErrors";
import type { ParentStackParamList } from "../navigation/types";
import { getParentCoach } from "../services/api";
import type { ParentCoachPayload } from "../types/api";
import { space, typography } from "../theme/tokens";

type Props = NativeStackScreenProps<ParentStackParamList, "ParentCoach">;

function severityStyle(
  severity: ParentCoachPayload["alerts"][0]["severity"],
  colors: ReturnType<typeof useTheme>["colors"]
): { bg: string; border: string; text: string } {
  if (severity === "early") {
    return { bg: colors.error + "18", border: colors.error, text: colors.error };
  }
  if (severity === "watch") {
    return { bg: "#f59e0b22", border: "#f59e0b", text: "#b45309" };
  }
  return { bg: colors.ghostBg, border: colors.borderSubtle, text: colors.textSecondary };
}

export function ParentCoachScreen({ route }: Props) {
  const { colors } = useTheme();
  const { parent } = useAuth();
  const parentId = parent?.id?.trim() || route.params?.parentId?.trim() || PARENT_USER_ID;

  const [data, setData] = useState<ParentCoachPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!parentId) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = await getParentCoach(parentId);
      setData(payload);
    } catch (e) {
      setData(null);
      setError(formatApiError(e, "No se pudo cargar la guía."));
    } finally {
      setLoading(false);
    }
  }, [parentId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const styles = useMemo(() => createStyles(colors), [colors]);

  const openVideo = useCallback((url: string, title: string) => {
    void Linking.openURL(url).catch(() => {
      Alert.alert("Enlace", `No se pudo abrir el enlace.\n${title}`);
    });
  }, []);

  const showArticle = useCallback((title: string, excerpt: string, minutes: number) => {
    Alert.alert(title, `${excerpt}\n\nLectura aprox.: ${minutes} min.`);
  }, []);

  if (!parentId) {
    return (
      <View style={styles.centered}>
        <BrandEmptyState emoji="👨‍👩‍👧" title="Sin cuenta tutor" subtitle="Iniciá sesión como tutor." />
      </View>
    );
  }

  if (loading && !data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingHint}>Cargando guía…</Text>
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={styles.centered}>
        <BrandEmptyState emoji="⚠️" title="Error" subtitle={error} />
        <Pressable onPress={() => void load()} style={styles.retryBtn}>
          <Text style={styles.retryText}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.screenTitle}>Guía para padres</Text>
      <Text style={styles.screenHint}>
        Contenido curado por psicólogos infantiles y pedagogos, adaptado a la actividad en la app.
      </Text>
      <Text style={styles.metaNote}>{data.meta.personalizationNote}</Text>

      <Text style={styles.sectionTitle}>Entender a tu hijo</Text>
      <Text style={styles.sectionSub}>Artículos cortos, videos breves y tips para hoy.</Text>

      {data.understandingYourChild.articles.map((a) => (
        <Pressable
          key={a.id}
          style={styles.card}
          onPress={() => showArticle(a.title, a.excerpt, a.readMinutes)}
        >
          <Text style={styles.cardTitle}>{a.title}</Text>
          <Text style={styles.cardBody} numberOfLines={3}>
            {a.excerpt}
          </Text>
          <Text style={styles.cardMeta}>{a.readMinutes} min de lectura · Tocá para leer resumen</Text>
        </Pressable>
      ))}

      {data.understandingYourChild.videos.map((v) => (
        <View key={v.id} style={styles.card}>
          <Text style={styles.cardTitle}>▶ {v.title}</Text>
          <Text style={styles.cardMeta}>
            {v.durationMinutes} min · {v.psychologist}
          </Text>
          <Pressable style={styles.primaryBtn} onPress={() => openVideo(v.url, v.title)}>
            <Text style={styles.primaryBtnText}>Abrir video</Text>
          </Pressable>
        </View>
      ))}

      {data.understandingYourChild.tips.map((t) => (
        <View key={t.id} style={[styles.card, styles.tipCard]}>
          <Text style={styles.tipBadge}>Tip hoy</Text>
          <Text style={styles.cardBody}>{t.text}</Text>
        </View>
      ))}

      <Text style={[styles.sectionTitle, styles.sectionSpaced]}>Actividades juntos</Text>
      <Text style={styles.sectionSub}>Propuestas offline ligadas a lo que aprendió en la app.</Text>
      {data.activitiesTogether.map((act) => (
        <View key={act.childId} style={styles.card}>
          <Text style={styles.cardTitle}>{act.childName}</Text>
          <Text style={styles.cardBody}>{act.learnedThisWeek}</Text>
          <Text style={styles.highlight}>{act.activity}</Text>
          <Text style={styles.cardMeta}>{act.offlineHint}</Text>
        </View>
      ))}

      <Text style={[styles.sectionTitle, styles.sectionSpaced]}>Conversaciones</Text>
      <Text style={styles.sectionSub}>Guías para hablar en casa con calma y claridad.</Text>
      {data.conversations.map((c) => (
        <View key={c.id} style={styles.card}>
          <Text style={styles.cardTitle}>{c.topic}</Text>
          {c.prompts.map((p, i) => (
            <Text key={`${c.id}-${i}`} style={styles.bullet}>
              • {p}
            </Text>
          ))}
        </View>
      ))}

      <Text style={[styles.sectionTitle, styles.sectionSpaced]}>Alertas y alertas tempranas</Text>
      {data.alerts.map((al) => {
        const sev = severityStyle(al.severity, colors);
        return (
          <View
            key={al.id}
            style={[styles.alertCard, { backgroundColor: sev.bg, borderColor: sev.border }]}
          >
            <Text style={[styles.alertText, { color: sev.text }]}>{al.message}</Text>
          </View>
        );
      })}

      <Text style={[styles.sectionTitle, styles.sectionSpaced]}>Recursos sugeridos para vos</Text>
      <Text style={styles.sectionSub}>Ordenados por relevancia según patrones de la semana.</Text>
      {data.personalizedResources.map((r) => (
        <View key={r.id} style={styles.card}>
          <Text style={styles.cardTitle}>
            {r.type === "video" ? "🎬 " : "📄 "}
            {r.title}
          </Text>
          <Text style={styles.cardMeta}>Relevancia: {r.relevanceScore}</Text>
          <Text style={styles.cardBody}>{r.reason}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

function createStyles(c: import("../theme/appTheme").AppColors) {
  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: c.background },
    scrollContent: { padding: space.md, paddingBottom: space.xl },
    centered: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: space.md,
      backgroundColor: c.background,
    },
    loadingHint: { marginTop: space.sm, color: c.textMuted, fontWeight: "600" },
    screenTitle: { fontSize: typography.title, fontWeight: "900", color: c.text },
    screenHint: { marginTop: space.xs, fontSize: typography.secondary, color: c.textMuted, fontWeight: "600" },
    metaNote: { marginTop: space.sm, fontSize: typography.secondary - 1, color: c.textSecondary, fontStyle: "italic" },
    sectionTitle: {
      marginTop: space.md,
      fontSize: typography.body,
      fontWeight: "800",
      color: c.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    sectionSpaced: { marginTop: space.lg },
    sectionSub: { marginTop: 4, fontSize: typography.secondary, color: c.textSecondary },
    card: {
      marginTop: space.sm,
      backgroundColor: c.card,
      borderRadius: space.md,
      padding: space.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.borderSubtle,
    },
    tipCard: { borderLeftWidth: 4, borderLeftColor: c.primary },
    tipBadge: {
      alignSelf: "flex-start",
      fontSize: 11,
      fontWeight: "800",
      color: c.primary,
      marginBottom: 6,
    },
    cardTitle: { fontSize: typography.bodyLarge, fontWeight: "800", color: c.text },
    cardBody: { marginTop: 6, fontSize: typography.body, color: c.textSecondary, lineHeight: 22 },
    cardMeta: { marginTop: 8, fontSize: typography.secondary, color: c.textMuted, fontWeight: "600" },
    highlight: {
      marginTop: 10,
      fontSize: typography.body,
      fontWeight: "700",
      color: c.text,
      lineHeight: 22,
    },
    bullet: { marginTop: 8, fontSize: typography.body, color: c.textSecondary, lineHeight: 22 },
    primaryBtn: {
      marginTop: 10,
      alignSelf: "flex-start",
      backgroundColor: c.primary,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 10,
    },
    primaryBtnText: { color: c.textOnPrimary, fontWeight: "800" },
    alertCard: {
      marginTop: space.sm,
      padding: space.md,
      borderRadius: space.md,
      borderWidth: 1,
    },
    alertText: { fontSize: typography.body, fontWeight: "600", lineHeight: 22 },
    retryBtn: { marginTop: space.md, padding: space.sm },
    retryText: { color: c.link, fontWeight: "800", fontSize: typography.bodyLarge },
  });
}
