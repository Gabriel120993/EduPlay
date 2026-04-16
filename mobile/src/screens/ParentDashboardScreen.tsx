import { useCallback, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { getParentMinors, type ParentMinorsListItem } from "../services/api";

export function ParentDashboardScreen() {
  const navigation = useNavigation();
  const { parent } = useAuth();
  const { colors } = useTheme();
  const [rows, setRows] = useState<ParentMinorsListItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!parent?.id) return;
    setRefreshing(true);
    try {
      const list = await getParentMinors(parent.id);
      setRows(list);
    } finally {
      setRefreshing(false);
    }
  }, [parent?.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const stats = useMemo(() => {
    const total = rows.length;
    const pending = rows.filter((r) => r.approvalStatus === "pending").length;
    const active = rows.filter((r) => r.status === "active").length;
    return { total, pending, active };
  }, [rows]);

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load()} />}
    >
      <Text style={[styles.title, { color: colors.text }]}>Panel familiar</Text>
      <View style={styles.statsRow}>
        <StatCard label="Menores" value={stats.total} color={colors.primary} />
        <StatCard label="Activos" value={stats.active} color={colors.success} />
        <StatCard label="Pendientes" value={stats.pending} color={colors.error} />
      </View>

      <Pressable
        onPress={() => navigation.navigate("AddMinor" as never)}
        style={[styles.addBtn, { backgroundColor: colors.primary }]}
      >
        <Text style={[styles.addBtnText, { color: colors.textOnPrimary }]}>Agregar menor</Text>
      </Pressable>

      {rows.map((row) => (
        <View key={row.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.name, { color: colors.text }]}>{row.username}</Text>
          <Text style={{ color: colors.textMuted }}>
            Edad {row.age} · Estado {row.approvalStatus}
          </Text>
          <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
            Última actividad: {row.lastActivity ? row.lastActivity.eventName : "Sin actividad"}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[styles.statCard, { borderColor: color }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 12 },
  title: { fontSize: 24, fontWeight: "800" },
  statsRow: { flexDirection: "row", gap: 8 },
  statCard: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 10, alignItems: "center" },
  statValue: { fontSize: 20, fontWeight: "800" },
  statLabel: { fontSize: 12, color: "#64748b" },
  addBtn: { borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  addBtnText: { fontSize: 16, fontWeight: "700" },
  card: { borderWidth: 1, borderRadius: 12, padding: 12 },
  name: { fontSize: 18, fontWeight: "700" },
});
