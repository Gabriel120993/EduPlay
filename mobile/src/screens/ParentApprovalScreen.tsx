import { useCallback, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import {
  getParentPendingApprovals,
  patchMinorApproval,
  type MinorApprovalItem,
} from "../services/api";

export function ParentApprovalScreen() {
  const { parent } = useAuth();
  const { colors } = useTheme();
  const [rows, setRows] = useState<MinorApprovalItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!parent?.id) return;
    setRefreshing(true);
    try {
      const list = await getParentPendingApprovals(parent.id);
      setRows(list.filter((r) => r.status === "pending"));
    } finally {
      setRefreshing(false);
    }
  }, [parent?.id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const applyDecision = async (row: MinorApprovalItem, status: "approved" | "rejected") => {
    try {
      const minorId = typeof row.activityData?.minorId === "string" ? row.activityData.minorId : "";
      if (!minorId) {
        Alert.alert("Error", "No se encontró el menor asociado.");
        return;
      }
      await patchMinorApproval(minorId, { approvalId: row.id, status });
      await load();
    } catch {
      Alert.alert("Error", "No se pudo actualizar la aprobación.");
    }
  };

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load()} />}
    >
      <Text style={[styles.title, { color: colors.text }]}>Aprobaciones pendientes</Text>
      {rows.map((row) => (
        <View
          key={row.id}
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Text style={[styles.type, { color: colors.text }]}>{row.activityType}</Text>
          <Text style={{ color: colors.textMuted }}>
            Solicitado: {new Date(row.requestedAt).toLocaleString()}
          </Text>
          <Text style={{ color: colors.textBody, marginTop: 6 }}>
            Detalle: {JSON.stringify(row.activityData)}
          </Text>
          <View style={styles.actions}>
            <Pressable
              onPress={() => void applyDecision(row, "approved")}
              style={[styles.btn, { backgroundColor: colors.success }]}
            >
              <Text style={[styles.btnText, { color: colors.textOnPrimary }]}>Approve</Text>
            </Pressable>
            <Pressable
              onPress={() => void applyDecision(row, "rejected")}
              style={[styles.btn, { backgroundColor: colors.error }]}
            >
              <Text style={[styles.btnText, { color: colors.textOnPrimary }]}>Reject</Text>
            </Pressable>
          </View>
        </View>
      ))}
      {rows.length === 0 ? (
        <Text style={{ color: colors.textMuted }}>No hay acciones pendientes.</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 12 },
  title: { fontSize: 24, fontWeight: "800" },
  card: { borderWidth: 1, borderRadius: 12, padding: 12 },
  type: { fontSize: 16, fontWeight: "700", textTransform: "capitalize" },
  actions: { flexDirection: "row", gap: 8, marginTop: 10 },
  btn: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  btnText: { fontWeight: "700" },
});
