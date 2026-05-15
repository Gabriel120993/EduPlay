import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { useTheme } from "../../contexts/ThemeContext";
import { getFriendsWeekXpRanking } from "../../services/api";
import { space } from "../../theme/tokens";

export function FriendsLeaderboardStrip() {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<{ rank: number; username: string; xpThisWeek: number }[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const data = await getFriendsWeekXpRanking();
        if (!cancelled) {
          setRows(
            data.users
              .slice(0, 5)
              .map((u) => ({ rank: u.rank, username: u.username, xpThisWeek: u.xpThisWeek })),
          );
        }
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: space.sm,
          paddingVertical: space.xs,
        }}
      >
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={{ color: colors.textMuted, fontWeight: "600" }}>Ranking amigos…</Text>
      </View>
    );
  }

  if (rows.length === 0) {
    return (
      <Text style={{ color: colors.textMuted, fontWeight: "600", fontSize: 12 }}>
        Agregá amigos para ver el ranking semanal de XP (actividad en EduPlay).
      </Text>
    );
  }

  return (
    <View style={{ gap: 4 }}>
      <Text style={{ color: colors.textMuted, fontWeight: "800", fontSize: 12 }}>
        Ranking semanal · amigos
      </Text>
      {rows.map((r) => (
        <Text
          key={`${r.rank}-${r.username}`}
          style={{ color: colors.textSecondary, fontWeight: "600", fontSize: 12 }}
        >
          {r.rank}. @{r.username} · {r.xpThisWeek} XP
        </Text>
      ))}
    </View>
  );
}
