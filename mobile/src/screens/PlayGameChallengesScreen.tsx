import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../contexts/ThemeContext";
import { fetchPlayGameChallenges } from "../services/api";
import { space } from "../theme/tokens";

export function PlayGameChallengesScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [pending, setPending] = useState<unknown[]>([]);
  const [sent, setSent] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchPlayGameChallenges().then((res) => {
      setPending(res.pending);
      setSent(res.sent);
      setLoading(false);
    });
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <Text style={{ color: colors.text, fontWeight: "900", fontSize: 20, padding: space.md }}>
        Desafíos
      </Text>
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: space.md }}>
          <Text style={{ color: colors.textMuted, fontWeight: "700" }}>Pendientes ({pending.length})</Text>
          <Text style={{ color: colors.textMuted, marginTop: space.lg, fontWeight: "700" }}>
            Enviados ({sent.length})
          </Text>
        </ScrollView>
      )}
    </View>
  );
}
