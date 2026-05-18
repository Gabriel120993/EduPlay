import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useTheme } from "../contexts/ThemeContext";
import type { RootStackParamList } from "../navigation/types";
import { fetchMediaChannels } from "../services/api";
import { space } from "../theme/tokens";

export function LibraryChannelsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [channels, setChannels] = useState<{ slug: string; name: string; description: string; color: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchMediaChannels().then((r) => {
      setChannels(r.channels as typeof channels);
      setLoading(false);
    });
  }, []);

  if (loading) return <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />;

  return (
    <FlatList
      data={channels}
      keyExtractor={(c) => c.slug}
      contentContainerStyle={{ padding: space.md }}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => navigation.navigate("ChannelDetail", { slug: item.slug })}
          style={{
            marginBottom: space.md,
            padding: space.md,
            borderRadius: 12,
            backgroundColor: colors.card,
            borderLeftWidth: 6,
            borderLeftColor: item.color,
          }}
        >
          <Text style={{ color: colors.text, fontWeight: "900" }}>{item.name}</Text>
          <Text style={{ color: colors.textMuted, marginTop: 4 }}>{item.description}</Text>
        </Pressable>
      )}
    />
  );
}
