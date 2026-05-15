import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { useTheme } from "../../contexts/ThemeContext";
import { space } from "../../theme/tokens";
import {
  bumpUnlocksAfterLevel,
  getStarsForLevel,
  setMaxUnlockedLevel,
  setStarsForLevel,
} from "../storage/gameProgressStore";
import { MiniGameChrome } from "../shared/MiniGameChrome";
import { starsFromAttempts } from "../shared/starsFromScore";
import { TutorialOverlay, type TutorialStep } from "../shared/TutorialOverlay";
import { useTutorialSeen } from "../shared/useTutorialSeen";
import type { MiniGameMeta, MiniGameProps, Stars } from "../types";

const META: MiniGameMeta = {
  id: "eco_hero",
  title: "Eco-Héroe",
  subtitle: "Limpiá el océano virtual",
  subject: "Medio ambiente",
  icon: "🌊",
};

const TUTORIAL: TutorialStep[] = [
  { title: "Basura", body: "Tocá la basura flotante para limpiar el mar." },
  { title: "Impacto", body: "La barra sube: veás el ecosistema más sano." },
  { title: "Animales", body: "Cada hitos desbloquea un animal rescatado." },
  { title: "Meta", body: "Limpiezas necesarias suben con el nivel." },
];

const TOTAL_LEVELS = 22;

export const miniGameSpec = { meta: META, totalLevels: TOTAL_LEVELS };

export default function EcoHeroGame({ levelIndex, onCompleteLevel, onRequestExit }: MiniGameProps) {
  const { colors } = useTheme();
  const [showTutorial, tutorialDone] = useTutorialSeen(META.id);
  const need = 6 + (levelIndex % 10);
  const [cleaned, setCleaned] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [best, setBest] = useState<Stars | 0>(0);
  const [spots, setSpots] = useState(() => Array.from({ length: 12 }, (_, i) => i));
  const mistakesRef = useRef(0);

  const animals = useMemo(() => ["🐢", "🐬", "🦭", "🐠", "🦀", "🐙"], []);

  useEffect(() => {
    mistakesRef.current = mistakes;
  }, [mistakes]);

  useEffect(() => {
    void getStarsForLevel(META.id, levelIndex).then(setBest);
  }, [levelIndex]);

  useEffect(() => {
    setCleaned(0);
    setMistakes(0);
    setSpots(Array.from({ length: 12 }, (_, i) => i));
  }, [levelIndex]);

  const tapTrash = (i: number) => {
    if (!spots.includes(i)) return;
    setSpots((s) => s.filter((x) => x !== i));
    setCleaned((c) => {
      const next = c + 1;
      if (next >= need) {
        const m = mistakesRef.current;
        const stars = starsFromAttempts(need, m, 0.75);
        void (async () => {
          await setStarsForLevel(META.id, levelIndex, stars);
          await setMaxUnlockedLevel(META.id, levelIndex + 1);
          await bumpUnlocksAfterLevel(META.id, levelIndex);
          onCompleteLevel({ levelIndex, stars, score: 100 - m * 5 });
        })();
      }
      return next;
    });
  };

  return (
    <View style={{ flex: 1 }}>
      {showTutorial ? (
        <TutorialOverlay steps={TUTORIAL} onDone={() => void tutorialDone()} />
      ) : null}
      <MiniGameChrome
        meta={META}
        levelIndex={levelIndex}
        totalLevels={TOTAL_LEVELS}
        bestStars={best || undefined}
        onBack={onRequestExit}
      >
        <Text style={{ color: colors.textSecondary, fontWeight: "700", marginBottom: space.sm }}>
          Limpiezas: {cleaned}/{need} · Animal:{" "}
          {animals[Math.min(animals.length - 1, Math.floor(cleaned / 3))]}
        </Text>
        <View
          style={{
            height: 10,
            backgroundColor: colors.ghostBg,
            borderRadius: 99,
            overflow: "hidden",
            marginBottom: space.md,
          }}
        >
          <View
            style={{
              width: `${Math.min(100, (cleaned / need) * 100)}%`,
              height: "100%",
              backgroundColor: colors.success,
            }}
          />
        </View>
        <View
          style={{
            height: 200,
            borderRadius: 16,
            backgroundColor: "#0c4a6e",
            position: "relative",
          }}
        >
          {spots.map((i) => (
            <Pressable
              key={i}
              onPress={() => tapTrash(i)}
              style={{
                position: "absolute",
                left: `${(i * 17) % 80}%`,
                top: `${(i * 23) % 70}%`,
                padding: 8,
              }}
            >
              <Text style={{ fontSize: 28 }}>🧴</Text>
            </Pressable>
          ))}
        </View>
      </MiniGameChrome>
    </View>
  );
}
