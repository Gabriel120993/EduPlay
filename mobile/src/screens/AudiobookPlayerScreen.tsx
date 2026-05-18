import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { Audio } from "expo-av";

import { useTheme } from "../contexts/ThemeContext";
import type { RootStackParamList } from "../navigation/types";
import { postMediaLibraryProgress } from "../services/api";
import { space } from "../theme/tokens";

export function AudiobookPlayerScreen() {
  const { colors } = useTheme();
  const route = useRoute<RouteProp<RootStackParamList, "AudiobookPlayer">>();
  const navigation = useNavigation();
  const soundRef = useRef<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const { sound } = await Audio.Sound.createAsync({ uri: route.params.mediaUrl });
      if (!mounted) return;
      soundRef.current = sound;
      await sound.playAsync();
      setPlaying(true);
    })();
    const tick = setInterval(() => {
      void postMediaLibraryProgress(route.params.slug, { progressSec: 30, isCompleted: false });
    }, 5000);
    return () => {
      mounted = false;
      clearInterval(tick);
      void soundRef.current?.unloadAsync();
    };
  }, [route.params.mediaUrl, route.params.slug]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: space.xl, justifyContent: "center" }}>
      <Text style={{ color: colors.text, fontWeight: "900", fontSize: 20, textAlign: "center" }}>
        {route.params.title}
      </Text>
      <Pressable
        onPress={async () => {
          if (!soundRef.current) return;
          if (playing) await soundRef.current.pauseAsync();
          else await soundRef.current.playAsync();
          setPlaying(!playing);
        }}
        style={{ marginTop: space.xl, alignSelf: "center", backgroundColor: colors.primary, padding: space.lg, borderRadius: 999 }}
      >
        <Text style={{ color: "#fff", fontWeight: "800" }}>{playing ? "Pausar" : "Play"}</Text>
      </Pressable>
      <Pressable onPress={() => navigation.goBack()} style={{ marginTop: space.lg }}>
        <Text style={{ color: colors.link, textAlign: "center" }}>Cerrar</Text>
      </Pressable>
    </View>
  );
}
