import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useTheme } from "../contexts/ThemeContext";
import type { RootStackParamList } from "../navigation/types";
import { fetchMediaLibraryHistory } from "../services/api";
import { space } from "../theme/tokens";

export function LibraryHistoryScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [items, setItems] = useState<{ slug: string; title: string }[]>([]);
  const [totalWatchTime, setTotalWatchTime] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchMediaLibraryHistory().then((r) => {
      setItems((r.contents as { slug: string; title: string }[]) ?? []);
      setTotalWatchTime(r.totalWatchTime ?? 0);
      setLoading(false);
    });
  }, []);

  if (loading) return <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Text style={{ padding: space.md, color: colors.textMuted }}>
        Tiempo total: {Math.round(totalWatchTime / 60)} min
      </Text>
      <FlatList
        data={items}
        keyExtractor={(i) => i.slug}
        contentContainerStyle={{ padding: space.md }}
        renderItem={({ item }) => (
          <Pressable onPress={() => navigation.navigate("LibraryDetail", { slug: item.slug })} style={{ padding: space.md, marginBottom: space.sm, backgroundColor: colors.card, borderRadius: 10 }}>
            <Text style={{ color: colors.text }}>{item.title}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}
