import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";

import { useTheme } from "../contexts/ThemeContext";
import type { RootStackParamList } from "../navigation/types";
import { fetchPlayGameLeaderboard } from "../services/api";
import { space } from "../theme/tokens";

export function PlayGameLeaderboardScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<RootStackParamList, "PlayGameLeaderboard">>();
  const { slug, gameName } = route.params;
  const [rows, setRows] = useState<
    { rank: number; name: string; score: number; streak: number }[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchPlayGameLeaderboard(slug).then((res) => {
      setRows(res.leaderboard);
      setLoading(false);
    });
  }, [slug]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <Text style={{ color: colors.text, fontWeight: "900", fontSize: 20, padding: space.md }}>
        Ranking · {gameName}
      </Text>
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <ScrollView>
          {rows.map((r) => (
            <View
              key={r.rank}
              style={{
                flexDirection: "row",
                padding: space.md,
                borderBottomWidth: 1,
                borderBottomColor: colors.borderSubtle,
              }}
            >
              <Text style={{ color: colors.primary, fontWeight: "900", width: 32 }}>#{r.rank}</Text>
              <Text style={{ flex: 1, color: colors.text }}>{r.name}</Text>
              <Text style={{ color: colors.textMuted }}>{r.score}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
