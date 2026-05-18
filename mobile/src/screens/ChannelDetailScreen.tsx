import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text } from "react-native";
import { useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";

import { useTheme } from "../contexts/ThemeContext";
import type { RootStackParamList } from "../navigation/types";
import { fetchMediaChannel, subscribeMediaChannel } from "../services/api";
import { space } from "../theme/tokens";

export function ChannelDetailScreen() {
  const { colors } = useTheme();
  const route = useRoute<RouteProp<RootStackParamList, "ChannelDetail">>();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    void fetchMediaChannel(route.params.slug).then((r) => {
      setName(String((r.channel as { name?: string }).name ?? ""));
      setSubscribed(Boolean(r.isSubscribed));
      setCount((r.contents as unknown[]).length);
      setLoading(false);
    });
  }, [route.params.slug]);

  if (loading) return <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />;

  return (
    <ScrollView style={{ padding: space.md, backgroundColor: colors.background }}>
      <Text style={{ fontWeight: "900", fontSize: 22, color: colors.text }}>{name}</Text>
      <Text style={{ color: colors.textMuted, marginTop: space.sm }}>{count} contenidos</Text>
      <Pressable
        onPress={async () => {
          const r = await subscribeMediaChannel(route.params.slug);
          setSubscribed(r.subscribed);
        }}
        style={{ marginTop: space.lg, backgroundColor: colors.primary, padding: space.md, borderRadius: 12 }}
      >
        <Text style={{ color: "#fff", textAlign: "center", fontWeight: "800" }}>
          {subscribed ? "Suscrito ✓" : "Suscribirse"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
