import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { useTheme } from "../../contexts/ThemeContext";
import { space } from "../../theme/tokens";
import { bumpUnlocksAfterLevel, getStarsForLevel, setMaxUnlockedLevel, setStarsForLevel } from "../storage/gameProgressStore";
import { MiniGameChrome } from "../shared/MiniGameChrome";
import { starsFromAttempts } from "../shared/starsFromScore";
import { TutorialOverlay, type TutorialStep } from "../shared/TutorialOverlay";
import { useTutorialSeen } from "../shared/useTutorialSeen";
import type { MiniGameMeta, MiniGameProps, Stars } from "../types";

const META: MiniGameMeta = {
  id: "treasure_math",
  title: "El Tesoro Matemático",
  subtitle: "Navegá entre islas resolviendo operaciones",
  subject: "Matemáticas",
  icon: "🏝️",
};

const TUTORIAL: TutorialStep[] = [
  { title: "Islas", body: "Cada isla muestra un número. Tocá la que coincide con el objetivo de la brújula." },
  { title: "Brújula", body: "Una pista resalta la isla correcta (un uso por nivel)." },
  { title: "Mapa", body: "Saltá un objetivo si te trabás (un uso por nivel)." },
  { title: "Tesoro", body: "Completá la cadena para sumar estrellas y desbloquear temas." },
];

const TOTAL_LEVELS = 22;

export const miniGameSpec = { meta: META, totalLevels: TOTAL_LEVELS };

function shuffle<T>(a: T[]): T[] {
  const x = [...a];
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = x[i]!;
    x[i] = x[j]!;
    x[j] = t;
  }
  return x;
}

export default function TreasureMathGame({ levelIndex, onCompleteLevel, onRequestExit }: MiniGameProps) {
  const { colors } = useTheme();
  const [showTutorial, tutorialDone] = useTutorialSeen(META.id);
  const [cursor, setCursor] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [compass, setCompass] = useState(1);
  const [mapSkip, setMapSkip] = useState(1);
  const [best, setBest] = useState<Stars | 0>(0);

  const targets = useMemo(() => {
    const len = 4 + (levelIndex % 8);
    const t: number[] = [2 + (levelIndex % 6)];
    for (let i = 1; i < len; i++) {
      t.push(t[i - 1]! + (1 + (i % 4)));
    }
    return t;
  }, [levelIndex]);

  const goal = targets[cursor] ?? targets[targets.length - 1]!;

  const candidates = useMemo(() => {
    const wrong = new Set<number>();
    let k = 1;
    while (wrong.size < 3) {
      wrong.add(Math.max(1, goal + k));
      wrong.add(Math.max(1, goal - k));
      k++;
    }
    return shuffle([goal, ...[...wrong].slice(0, 3)]).slice(0, 4);
  }, [goal]);

  const finish = useCallback(
    async (stars: Stars) => {
      await setStarsForLevel(META.id, levelIndex, stars);
      await setMaxUnlockedLevel(META.id, levelIndex + 1);
      await bumpUnlocksAfterLevel(META.id, levelIndex);
      setBest(stars);
      onCompleteLevel({ levelIndex, stars, score: 100 - mistakes * 8 });
    },
    [levelIndex, mistakes, onCompleteLevel]
  );

  const onPick = (n: number) => {
    if (n !== goal) {
      setMistakes((m) => m + 1);
      return;
    }
    if (cursor >= targets.length - 1) {
      const stars = starsFromAttempts(targets.length, mistakes, 0.75);
      void finish(stars);
      return;
    }
    setCursor((c) => c + 1);
  };

  const useCompassBtn = () => {
    if (compass < 1) return;
    setCompass(0);
  };
  const useMapBtn = () => {
    if (mapSkip < 1 || cursor >= targets.length - 1) return;
    setMapSkip(0);
    setCursor((c) => c + 1);
  };

  useEffect(() => {
    void getStarsForLevel(META.id, levelIndex).then((s) => setBest(s));
  }, [levelIndex]);

  return (
    <View style={{ flex: 1 }}>
      {showTutorial ? <TutorialOverlay steps={TUTORIAL} onDone={() => void tutorialDone()} /> : null}
      <MiniGameChrome meta={META} levelIndex={levelIndex} totalLevels={TOTAL_LEVELS} bestStars={best || undefined} onBack={onRequestExit}>
        <Text style={{ color: colors.text, fontWeight: "900", fontSize: 18, marginBottom: space.xs }}>
          Objetivo: llegar al tesoro · paso {cursor + 1}/{targets.length}
        </Text>
        <Text style={{ color: colors.textSecondary, marginBottom: space.md, fontWeight: "700" }}>
          Tocá la isla con el número {goal}
        </Text>
        <View style={{ flexDirection: "row", gap: space.sm, marginBottom: space.md }}>
          <Pressable
            onPress={useCompassBtn}
            style={{ flex: 1, padding: space.sm, borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderSubtle }}
          >
            <Text style={{ fontWeight: "800", color: colors.primary }}>🧭 Brújula ({compass})</Text>
          </Pressable>
          <Pressable
            onPress={useMapBtn}
            style={{ flex: 1, padding: space.sm, borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderSubtle }}
          >
            <Text style={{ fontWeight: "800", color: colors.primary }}>🗺️ Mapa ({mapSkip})</Text>
          </Pressable>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm, justifyContent: "center" }}>
          {candidates.map((n) => (
            <Pressable
              key={`${n}-${cursor}`}
              onPress={() => onPick(n)}
              style={{
                width: 76,
                height: 76,
                borderRadius: 38,
                backgroundColor: compass === 0 && n === goal ? colors.primarySoft : colors.card,
                borderWidth: 2,
                borderColor: compass === 0 && n === goal ? colors.primary : colors.borderSubtle,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 24, fontWeight: "900", color: colors.text }}>{n}</Text>
            </Pressable>
          ))}
        </View>
      </MiniGameChrome>
    </View>
  );
}
