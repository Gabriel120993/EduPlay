import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useTheme } from "../contexts/ThemeContext";
import type { RootStackParamList } from "../navigation/types";
import { fetchMediaLibraryBookmarks } from "../services/api";
import { space } from "../theme/tokens";

export function LibraryBookmarksScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [items, setItems] = useState<{ slug: string; title: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchMediaLibraryBookmarks().then((r) => {
      setItems((r.contents as { slug: string; title: string }[]) ?? []);
      setLoading(false);
    });
  }, []);

  if (loading) return <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />;

  return (
    <FlatList
      data={items}
      keyExtractor={(i) => i.slug}
      contentContainerStyle={{ padding: space.md }}
      ListEmptyComponent={<Text style={{ color: colors.textMuted }}>Sin guardados aún.</Text>}
      renderItem={({ item }) => (
        <Pressable onPress={() => navigation.navigate("LibraryDetail", { slug: item.slug })} style={{ padding: space.md, marginBottom: space.sm, backgroundColor: colors.card, borderRadius: 10 }}>
          <Text style={{ color: colors.text, fontWeight: "700" }}>{item.title}</Text>
        </Pressable>
      )}
    />
  );
}
