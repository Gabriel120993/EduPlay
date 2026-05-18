import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useTheme } from "../contexts/ThemeContext";
import type { RootStackParamList } from "../navigation/types";
import { fetchMediaLibraryItem, postMediaLibraryProgress, toggleMediaLibraryBookmark } from "../services/api";
import { space } from "../theme/tokens";

export function LibraryDetailScreen() {
  const { colors } = useTheme();
  const route = useRoute<RouteProp<RootStackParamList, "LibraryDetail">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<{
    slug: string;
    title: string;
    description: string;
    type: string;
    mediaUrl: string;
    transcript?: string | null;
    isPremium: boolean;
  } | null>(null);
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    void fetchMediaLibraryItem(route.params.slug).then((res) => {
      setItem(res.content as typeof item);
      setBookmarked(Boolean(res.isBookmarked));
      setLoading(false);
    });
  }, [route.params.slug]);

  const openPlayer = () => {
    if (!item) return;
    if (item.type === "VIDEO") navigation.navigate("VideoPlayer", { slug: item.slug, mediaUrl: item.mediaUrl, title: item.title });
    else if (item.type === "AUDIOBOOK")
      navigation.navigate("AudiobookPlayer", { slug: item.slug, mediaUrl: item.mediaUrl, title: item.title });
    else if (item.type === "COMIC")
      navigation.navigate("ComicReader", { slug: item.slug, mediaUrl: item.mediaUrl, title: item.title });
    else navigation.navigate("VideoPlayer", { slug: item.slug, mediaUrl: item.mediaUrl, title: item.title });
  };

  if (loading || !item) return <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background, padding: space.md }}>
      <Text style={{ color: colors.text, fontWeight: "900", fontSize: 22 }}>{item.title}</Text>
      <Text style={{ color: colors.textMuted, marginTop: space.sm }}>{item.description}</Text>
      {item.transcript ? (
        <Text style={{ color: colors.text, marginTop: space.md, lineHeight: 22 }}>{item.transcript}</Text>
      ) : null}
      <Pressable
        onPress={openPlayer}
        style={{ marginTop: space.lg, backgroundColor: colors.primary, padding: space.md, borderRadius: 12 }}
      >
        <Text style={{ color: "#fff", textAlign: "center", fontWeight: "800" }}>Reproducir</Text>
      </Pressable>
      <Pressable
        onPress={async () => {
          const r = await toggleMediaLibraryBookmark(item.slug);
          setBookmarked(r.bookmarked);
        }}
        style={{ marginTop: space.sm, padding: space.md }}
      >
        <Text style={{ color: colors.link, textAlign: "center" }}>
          {bookmarked ? "Quitar de guardados" : "Guardar"}
        </Text>
      </Pressable>
      <Pressable
        onPress={async () => {
          await postMediaLibraryProgress(item.slug, { progressSec: item.type === "AUDIOBOOK" ? 60 : 30, isCompleted: true });
        }}
        style={{ marginTop: space.sm }}
      >
        <Text style={{ color: colors.textMuted, textAlign: "center" }}>Marcar como visto</Text>
      </Pressable>
    </ScrollView>
  );
}
