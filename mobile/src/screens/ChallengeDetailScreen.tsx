import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";

import { useTheme } from "../contexts/ThemeContext";
import { fetchSocialChallenges } from "../services/api";
import { space } from "../theme/tokens";

export function ChallengeDetailScreen() {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<unknown[]>([]);

  useEffect(() => {
    void fetchSocialChallenges().then((r) => {
      setActive(r.active);
      setLoading(false);
    });
  }, []);

  if (loading) return <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background, padding: space.md }}>
      <Text style={{ color: colors.text, fontWeight: "900", fontSize: 20 }}>Desafíos activos</Text>
      <Text style={{ color: colors.textMuted, marginTop: space.md }}>{active.length} desafío(s)</Text>
    </ScrollView>
  );
}
