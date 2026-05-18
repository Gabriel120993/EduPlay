import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";

import { useTheme } from "../contexts/ThemeContext";
import type { RootStackParamList } from "../navigation/types";
import { commentSocialPost, fetchSocialPostDetail } from "../services/api";
import { space } from "../theme/tokens";

export function PostDetailScreen() {
  const { colors } = useTheme();
  const route = useRoute<RouteProp<RootStackParamList, "PostDetail">>();
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [comments, setComments] = useState<
    { id: string; content: string; user: { username: string }; createdAt: string }[]
  >([]);
  const [draft, setDraft] = useState("");

  const load = async () => {
    const res = await fetchSocialPostDetail(route.params.postId);
    setContent(String(res.post.content ?? ""));
    setComments(res.comments as typeof comments);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [route.params.postId]);

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background, padding: space.md }}>
      <Text style={{ color: colors.text, fontSize: 18, lineHeight: 26 }}>{content}</Text>
      <Text style={{ color: colors.textMuted, marginTop: space.lg, fontWeight: "700" }}>Comentarios</Text>
      {comments.map((c) => (
        <View key={c.id} style={{ marginTop: space.sm }}>
          <Text style={{ color: colors.primary, fontWeight: "700" }}>{c.user.username}</Text>
          <Text style={{ color: colors.text }}>{c.content}</Text>
        </View>
      ))}
      <TextInput
        value={draft}
        onChangeText={setDraft}
        placeholder="Escribí un comentario..."
        placeholderTextColor={colors.textMuted}
        style={{ borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: 10, padding: space.sm, marginTop: space.md, color: colors.text }}
      />
      <Pressable
        onPress={async () => {
          await commentSocialPost(route.params.postId, draft);
          setDraft("");
          await load();
        }}
        style={{ marginTop: space.sm, backgroundColor: colors.primary, padding: space.md, borderRadius: 10 }}
      >
        <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}>Comentar</Text>
      </Pressable>
    </ScrollView>
  );
}
