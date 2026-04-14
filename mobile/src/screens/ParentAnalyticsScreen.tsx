import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { BrandEmptyState } from "../components/BrandEmptyState";
import { PARENT_USER_ID } from "../config";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { categoryDisplayLabel, getCategoryUi } from "../lib/contentCategoryUi";
import { formatApiError } from "../lib/apiErrors";
import type { ParentStackParamList } from "../navigation/types";
import { getParentChildAnalytics } from "../services/api";
import type { ParentAnalyticsChildRow, ParentAnalyticsWeeklyDay } from "../types/api";
import { space, typography } from "../theme/tokens";

type Props = NativeStackScreenProps<ParentStackParamList, "ParentAnalytics">;

function formatTodayTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  if (m === 0) return `${s} s`;
  if (m < 60) return `${m} min ${s} s`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return `${h} h ${rm} min`;
}

function categoryLabel(categoryId: string): string {
  const ui = getCategoryUi(categoryId);
  return ui ? categoryDisplayLabel(ui) : categoryId;
}

function shortWeekday(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00.000Z`);
  return d.toLocaleDateString("es-AR", { weekday: "short", timeZone: "UTC" });
}

const weeklyChartStyles = StyleSheet.create({
  chartRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: space.md,
    paddingTop: space.sm,
    minHeight: 120,
  },
  chartCol: { flex: 1, alignItems: "center", maxWidth: 48 },
  chartBarTrack: {
    width: 14,
    height: 100,
    borderRadius: 6,
    justifyContent: "flex-end",
    overflow: "hidden",
  },
  chartBarFill: { width: "100%", borderRadius: 6, minHeight: 2 },
  chartDay: { marginTop: 6, fontSize: 10, fontWeight: "700", textAlign: "center" },
  chartHint: { fontSize: 9, textAlign: "center" },
});

function WeeklyActivityBars({
  days,
  barColor,
  trackColor,
  mutedColor,
}: {
  days: ParentAnalyticsWeeklyDay[];
  barColor: string;
  trackColor: string;
  mutedColor: string;
}) {
  const maxScore = useMemo(() => Math.max(1, ...days.map((d) => d.activityScore)), [days]);
  const maxH = 96;

  return (
    <View style={weeklyChartStyles.chartRow}>
      {days.map((d) => {
        const h = d.activityScore <= 0 ? 2 : Math.max(6, (d.activityScore / maxScore) * maxH);
        return (
          <View key={d.date} style={weeklyChartStyles.chartCol}>
            <View style={[weeklyChartStyles.chartBarTrack, { backgroundColor: trackColor }]}>
              <View style={[weeklyChartStyles.chartBarFill, { height: h, backgroundColor: barColor }]} />
            </View>
            <Text style={[weeklyChartStyles.chartDay, { color: mutedColor }]} numberOfLines={1}>
              {shortWeekday(d.date)}
            </Text>
            <Text style={[weeklyChartStyles.chartHint, { color: mutedColor }]} numberOfLines={1}>
              {d.date.slice(5)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export function ParentAnalyticsScreen({ route }: Props) {
  const { colors } = useTheme();
  const { parent } = useAuth();
  const parentId = parent?.id?.trim() || route.params?.parentId?.trim() || PARENT_USER_ID;

  const [rows, setRows] = useState<ParentAnalyticsChildRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!parentId) {
      setRows(null);
      setError(null);
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const data = await getParentChildAnalytics(parentId);
      setRows(data.children);
    } catch (e) {
      setRows(null);
      setError(formatApiError(e, "No se pudieron cargar las analíticas."));
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

  if (!parentId) {
    return (
      <View style={styles.centered}>
        <BrandEmptyState
          emoji="👤"
          title="Sin cuenta tutor"
          subtitle="Iniciá sesión como tutor para ver analíticas."
        />
      </View>
    );
  }

  if (loading && !rows) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingHint}>Cargando analíticas…</Text>
      </View>
    );
  }

  if (error && !rows) {
    return (
      <View style={styles.centered}>
        <BrandEmptyState emoji="⚠️" title="No se pudo cargar" subtitle={error} />
        <Pressable onPress={() => void load()} style={styles.retryBtn}>
          <Text style={styles.retryText}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <View style={styles.centered}>
        <BrandEmptyState
          emoji="📊"
          title="Sin datos aún"
          subtitle="Cuando haya menores vinculados y actividad, verás métricas aquí."
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.screenHint}>Últimos 7 días (UTC) · actividad = XP + partidas + misiones</Text>
      {rows.map((r) => (
        <View key={r.child.id} style={styles.card}>
          <Text style={styles.childName}>{r.child.realName}</Text>
          <Text style={styles.childMeta}>@{r.child.username}</Text>

          <Text style={styles.sectionTitle}>Tiempo de pantalla hoy</Text>
          <Text style={styles.metricBig}>
            {formatTodayTime(r.timeSpent.todaySeconds)}
            <Text style={styles.metricSub}> / {r.timeSpent.dailyLimitMinutes} min permitidos</Text>
          </Text>

          <Text style={[styles.sectionTitle, styles.sectionSpaced]}>Progreso</Text>
          <View style={styles.progressGrid}>
            <View style={styles.progressCell}>
              <Text style={styles.progressValue}>Nivel {r.progress.level}</Text>
              <Text style={styles.progressLabel}>XP en nivel {r.progress.experience}/{100}</Text>
            </View>
            <View style={styles.progressCell}>
              <Text style={styles.progressValue}>{r.progress.xpToNextLevel}</Text>
              <Text style={styles.progressLabel}>XP al próximo nivel</Text>
            </View>
            <View style={styles.progressCell}>
              <Text style={styles.progressValue}>{r.progress.gamesPlayed}</Text>
              <Text style={styles.progressLabel}>Partidas</Text>
            </View>
            <View style={styles.progressCell}>
              <Text style={styles.progressValue}>{r.progress.missionsCompleted}</Text>
              <Text style={styles.progressLabel}>Misiones hechas</Text>
            </View>
            <View style={styles.progressCell}>
              <Text style={styles.progressValue}>{r.progress.achievementsUnlocked}</Text>
              <Text style={styles.progressLabel}>Logros</Text>
            </View>
          </View>

          <Text style={[styles.sectionTitle, styles.sectionSpaced]}>Categorías (aprendizaje)</Text>
          {r.categoriesLearned.length === 0 ? (
            <Text style={styles.emptyLine}>Todavía no hay datos por categoría.</Text>
          ) : (
            r.categoriesLearned.map((c) => (
              <View key={`${r.child.id}-${c.category}`} style={styles.catRow}>
                <Text style={styles.catName}>{categoryLabel(c.category)}</Text>
                <Text style={styles.catMeta}>
                  interés {c.score} · {c.gameSessions} partidas
                </Text>
              </View>
            ))
          )}

          <Text style={[styles.sectionTitle, styles.sectionSpaced]}>Actividad semanal</Text>
          <WeeklyActivityBars
            days={r.weeklyActivity}
            barColor={colors.primary}
            trackColor={colors.borderSubtle}
            mutedColor={colors.textMuted}
          />
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
    loadingHint: { marginTop: space.sm, fontSize: typography.body, color: c.textMuted, fontWeight: "600" },
    screenHint: {
      fontSize: typography.secondary,
      color: c.textMuted,
      fontWeight: "600",
      marginBottom: space.md,
    },
    card: {
      backgroundColor: c.card,
      borderRadius: space.md + space.xs,
      padding: space.md,
      marginBottom: space.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.borderSubtle,
    },
    childName: { fontSize: typography.bodyLarge, fontWeight: "900", color: c.text },
    childMeta: { fontSize: typography.secondary, color: c.textMuted, fontWeight: "600", marginBottom: space.md },
    sectionTitle: {
      fontSize: typography.secondary,
      fontWeight: "800",
      color: c.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    sectionSpaced: { marginTop: space.md },
    metricBig: { marginTop: space.xs, fontSize: typography.title, fontWeight: "900", color: c.text },
    metricSub: { fontSize: typography.body, fontWeight: "600", color: c.textMuted },
    progressGrid: {
      marginTop: space.sm,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: space.sm,
    },
    progressCell: {
      width: "31%",
      minWidth: 100,
      backgroundColor: c.ghostBg,
      borderRadius: space.sm,
      padding: space.sm,
      borderWidth: 1,
      borderColor: c.borderSubtle,
    },
    progressValue: { fontSize: typography.bodyLarge, fontWeight: "900", color: c.text },
    progressLabel: { fontSize: typography.secondary - 1, color: c.textMuted, fontWeight: "600", marginTop: 2 },
    catRow: {
      marginTop: space.sm,
      paddingVertical: space.xs,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.borderSubtle,
    },
    catName: { fontSize: typography.body, fontWeight: "700", color: c.text },
    catMeta: { fontSize: typography.secondary, color: c.textMuted, marginTop: 2 },
    emptyLine: { marginTop: space.xs, fontSize: typography.body, color: c.textMuted, fontStyle: "italic" },
    retryBtn: { marginTop: space.md, padding: space.sm + space.xs },
    retryText: { color: c.link, fontWeight: "800", fontSize: typography.bodyLarge },
  });
}
