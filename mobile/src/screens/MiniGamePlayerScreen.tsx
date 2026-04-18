import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useTheme } from "../contexts/ThemeContext";
import { getMiniGameEntry } from "../games/registry";
import { getMaxUnlockedLevel } from "../games/storage/gameProgressStore";
import type { MiniGameLevelResult } from "../games/types";
import type { RootStackParamList } from "../navigation/types";
import { space } from "../theme/tokens";

type Nav = NativeStackNavigationProp<RootStackParamList, "MiniGamePlayer">;
type R = RouteProp<RootStackParamList, "MiniGamePlayer">;

export function MiniGamePlayerScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<R>();
  const gameId = params.gameId;
  const entry = useMemo(() => getMiniGameEntry(gameId), [gameId]);
  const [levelIndex, setLevelIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!entry) {
      setLevelIndex(null);
      return;
    }
    const forced = params.levelIndex;
    if (typeof forced === "number" && Number.isFinite(forced)) {
      setLevelIndex(Math.max(0, Math.min(Math.floor(forced), entry.totalLevels - 1)));
      return;
    }
    let cancelled = false;
    void getMaxUnlockedLevel(gameId).then((m) => {
      if (cancelled) return;
      setLevelIndex(Math.max(0, Math.min(m, entry.totalLevels - 1)));
    });
    return () => {
      cancelled = true;
    };
  }, [entry, gameId, params.levelIndex]);

  const onCompleteLevel = useCallback(
    (result: MiniGameLevelResult) => {
      if (!entry) return;
      if (result.levelIndex + 1 < entry.totalLevels) {
        setLevelIndex(result.levelIndex + 1);
      } else {
        setLevelIndex(entry.totalLevels - 1);
      }
    },
    [entry]
  );

  if (!entry) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: space.lg, backgroundColor: colors.background }}>
        <Text style={{ color: colors.text, textAlign: "center", fontWeight: "700" }}>No encontramos ese minijuego.</Text>
      </View>
    );
  }

  if (levelIndex === null) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const { Component } = entry;
  return (
    <View style={{ flex: 1 }} key={`${gameId}-${levelIndex}`}>
      <Component
        levelIndex={levelIndex}
        onCompleteLevel={onCompleteLevel}
        onRequestExit={() => navigation.goBack()}
      />
    </View>
  );
}
