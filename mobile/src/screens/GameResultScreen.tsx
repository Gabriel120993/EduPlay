import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useTheme } from "../contexts/ThemeContext";
import type { RootStackParamList } from "../navigation/types";
import { space } from "../theme/tokens";

export function GameResultScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "GameResult">>();
  const { score, xpEarned, slug } = route.params;

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        paddingTop: insets.top + space.xl,
        paddingHorizontal: space.md,
        alignItems: "center",
      }}
    >
      <Text style={{ fontSize: 48 }}>🎉</Text>
      <Text style={{ color: colors.text, fontWeight: "900", fontSize: 24, marginTop: space.md }}>
        ¡Partida terminada!
      </Text>
      <Text style={{ color: colors.textMuted, marginTop: space.sm }}>{slug}</Text>
      <Text style={{ color: colors.primary, fontWeight: "900", fontSize: 32, marginTop: space.lg }}>
        {score} pts
      </Text>
      <Text style={{ color: colors.text, marginTop: space.sm }}>+{xpEarned} XP</Text>
      <Pressable
        onPress={() => navigation.popToTop()}
        style={{
          marginTop: space.xl,
          backgroundColor: colors.primary,
          paddingHorizontal: space.xl,
          paddingVertical: space.md,
          borderRadius: 14,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "900" }}>Volver al inicio</Text>
      </Pressable>
    </View>
  );
}
