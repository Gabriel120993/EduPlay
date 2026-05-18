import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useTheme } from "../contexts/ThemeContext";
import type { RootStackParamList } from "../navigation/types";
import { createSocialChallenge } from "../services/api";
import { space } from "../theme/tokens";

export function ChallengeCreateScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [description, setDescription] = useState("");
  const [friendId, setFriendId] = useState("");
  const [targetScore, setTargetScore] = useState("100");

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: space.md }}>
      <Text style={{ color: colors.text, fontWeight: "900", fontSize: 20 }}>Crear desafío grupal</Text>
      <TextInput
        value={description}
        onChangeText={setDescription}
        placeholder="¿Quién puede hacer más puntos?"
        placeholderTextColor={colors.textMuted}
        style={{ borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: 10, padding: space.sm, marginTop: space.md, color: colors.text }}
      />
      <TextInput
        value={friendId}
        onChangeText={setFriendId}
        placeholder="ID de amigo (UUID)"
        placeholderTextColor={colors.textMuted}
        style={{ borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: 10, padding: space.sm, marginTop: space.sm, color: colors.text }}
      />
      <TextInput
        value={targetScore}
        onChangeText={setTargetScore}
        keyboardType="number-pad"
        placeholder="Puntaje objetivo"
        placeholderTextColor={colors.textMuted}
        style={{ borderWidth: 1, borderColor: colors.borderSubtle, borderRadius: 10, padding: space.sm, marginTop: space.sm, color: colors.text }}
      />
      <Pressable
        onPress={async () => {
          await createSocialChallenge({
            type: "BEAT_SCORE",
            description,
            targetScore: Number(targetScore),
            invitedFriends: [friendId],
            durationHours: 48,
            rewardCoins: 50,
          });
          navigation.goBack();
        }}
        style={{ marginTop: space.lg, backgroundColor: colors.primary, padding: space.md, borderRadius: 12 }}
      >
        <Text style={{ color: "#fff", textAlign: "center", fontWeight: "800" }}>Crear</Text>
      </Pressable>
    </View>
  );
}
