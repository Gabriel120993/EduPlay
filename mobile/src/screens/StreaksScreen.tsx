import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../contexts/ThemeContext";
import { fetchSocialStreaks } from "../services/api";
import { space } from "../theme/tokens";

export function StreaksScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<{ friend: { username: string }; days: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchSocialStreaks().then((r) => {
      setRows(r.streaks);
      setLoading(false);
    });
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <Text style={{ padding: space.md, fontWeight: "900", fontSize: 20, color: colors.text }}>
        Rachas con amigos
      </Text>
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: space.md }}>
          {rows.map((r) => (
            <View key={r.friend.username} style={{ padding: space.md, marginBottom: space.sm, backgroundColor: colors.card, borderRadius: 12 }}>
              <Text style={{ color: colors.text, fontWeight: "700" }}>{r.friend.username}</Text>
              <Text style={{ color: colors.primary }}>🔥 {r.days} días</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
