import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import { Video, ResizeMode } from "expo-av";

import { useTheme } from "../contexts/ThemeContext";
import type { RootStackParamList } from "../navigation/types";
import { postMediaLibraryProgress } from "../services/api";
import { space } from "../theme/tokens";

export function VideoPlayerScreen() {
  const { colors } = useTheme();
  const route = useRoute<RouteProp<RootStackParamList, "VideoPlayer">>();
  const navigation = useNavigation();
  const videoRef = useRef<Video>(null);
  const [position, setPosition] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      void postMediaLibraryProgress(route.params.slug, {
        progressSec: Math.floor(position / 1000),
        isCompleted: false,
      });
    }, 5000);
    return () => clearInterval(id);
  }, [route.params.slug, position]);

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <Video
        ref={videoRef}
        source={{ uri: route.params.mediaUrl }}
        style={{ flex: 1 }}
        useNativeControls
        resizeMode={ResizeMode.CONTAIN}
        onPlaybackStatusUpdate={(s) => {
          if (s.isLoaded && s.positionMillis) setPosition(s.positionMillis);
        }}
      />
      <Pressable
        onPress={() => navigation.goBack()}
        style={{ position: "absolute", top: 48, left: space.md }}
      >
        <Text style={{ color: "#fff", fontWeight: "800" }}>‹ Cerrar</Text>
      </Pressable>
      <Text style={{ position: "absolute", bottom: 24, left: space.md, color: "#fff" }}>
        {route.params.title}
      </Text>
    </View>
  );
}
