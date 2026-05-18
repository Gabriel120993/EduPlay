import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useTheme } from "../contexts/ThemeContext";
import type { RootStackParamList } from "../navigation/types";
import { fetchMediaLibrary } from "../services/api";
import { space } from "../theme/tokens";

type LibraryItem = {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: string;
  thumbnailUrl: string;
  isPremium: boolean;
  durationSec: number | null;
};

export function MediaLibraryScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchMediaLibrary({ search: search || undefined });
      setItems(res.contents as LibraryItem[]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View style={{ flexDirection: "row", padding: space.md, alignItems: "center", gap: space.sm }}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={{ color: colors.link, fontWeight: "800" }}>‹ Volver</Text>
        </Pressable>
        <Text style={{ flex: 1, fontWeight: "900", fontSize: 18, color: colors.text }}>Biblioteca</Text>
        <Pressable onPress={() => navigation.navigate("LibraryChannels")}>
          <Text style={{ color: colors.link }}>Canales</Text>
        </Pressable>
      </View>
      <View style={{ flexDirection: "row", paddingHorizontal: space.md, gap: space.sm }}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar..."
          placeholderTextColor={colors.textMuted}
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: colors.borderSubtle,
            borderRadius: 10,
            padding: space.sm,
            color: colors.text,
          }}
          onSubmitEditing={() => void load()}
        />
        <Pressable onPress={() => navigation.navigate("LibraryBookmarks")}>
          <Text style={{ color: colors.link, alignSelf: "center" }}>★</Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate("LibraryHistory")}>
          <Text style={{ color: colors.link, alignSelf: "center" }}>🕐</Text>
        </Pressable>
      </View>
      {loading ? (
        <ActivityIndicator style={{ marginTop: space.xl }} color={colors.primary} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{ padding: space.sm }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => navigation.navigate("LibraryDetail", { slug: item.slug })}
              style={{
                flex: 1,
                margin: space.xs,
                backgroundColor: colors.card,
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              <Image source={{ uri: item.thumbnailUrl }} style={{ width: "100%", height: 100 }} />
              <Text style={{ padding: space.sm, color: colors.text, fontWeight: "700" }} numberOfLines={2}>
                {item.title}
              </Text>
              {item.isPremium ? (
                <Text style={{ paddingHorizontal: space.sm, paddingBottom: space.sm, color: colors.warning }}>
                  🔒 Premium
                </Text>
              ) : null}
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
