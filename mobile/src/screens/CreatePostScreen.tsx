import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";

import { useTheme } from "../contexts/ThemeContext";
import { createSocialFeedPost } from "../services/api";
import { space } from "../theme/tokens";

export function CreatePostScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [content, setContent] = useState("");

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: space.md }}>
      <Text style={{ color: colors.text, fontWeight: "900", fontSize: 20 }}>Nueva publicación</Text>
      <TextInput
        value={content}
        onChangeText={setContent}
        multiline
        maxLength={200}
        placeholder="¿Qué aprendiste hoy?"
        placeholderTextColor={colors.textMuted}
        style={{ minHeight: 120, borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: 12, padding: space.md, marginTop: space.md, color: colors.text, textAlignVertical: "top" }}
      />
      <Pressable
        onPress={async () => {
          await createSocialFeedPost({ content, visibility: "FRIENDS" });
          navigation.goBack();
        }}
        style={{ marginTop: space.lg, backgroundColor: colors.primary, padding: space.md, borderRadius: 12 }}
      >
        <Text style={{ color: "#fff", textAlign: "center", fontWeight: "800" }}>Publicar</Text>
      </Pressable>
    </View>
  );
}
