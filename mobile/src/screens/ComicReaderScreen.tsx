import { Image, Pressable, ScrollView, Text } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";

import { useTheme } from "../contexts/ThemeContext";
import type { RootStackParamList } from "../navigation/types";
import { space } from "../theme/tokens";

export function ComicReaderScreen() {
  const { colors } = useTheme();
  const route = useRoute<RouteProp<RootStackParamList, "ComicReader">>();
  const navigation = useNavigation();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }}>
      <Pressable onPress={() => navigation.goBack()} style={{ padding: space.md }}>
        <Text style={{ color: colors.link, fontWeight: "800" }}>‹ Cerrar</Text>
      </Pressable>
      <Text style={{ padding: space.md, fontWeight: "900", fontSize: 20, color: colors.text }}>
        {route.params.title}
      </Text>
      <Image source={{ uri: route.params.mediaUrl }} style={{ width: "100%", height: 500 }} resizeMode="contain" />
    </ScrollView>
  );
}
