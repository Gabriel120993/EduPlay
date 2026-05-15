import { useEffect, useMemo, useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";

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
  id: "constellation_hunter",
  title: "Cazador de Constelaciones",
  subtitle: "Conectá estrellas en orden",
  subject: "Astronomía",
  icon: "✨",
};

const TUTORIAL: TutorialStep[] = [
  { title: "Constelación", body: "Tocá las estrellas en el orden indicado (números)." },
  { title: "Mitología", body: "Cada nivel cuenta una curiosidad del cielo." },
  { title: "Modo noche", body: "Activá el modo nocturno para fondo oscuro estrellado." },
  { title: "Estrellas", body: "Completá sin errores para 3 estrellas de recompensa." },
];

const TOTAL_LEVELS = 22;

export const miniGameSpec = { meta: META, totalLevels: TOTAL_LEVELS };

const ORION = [
  { x: 20, y: 60, n: 1 },
  { x: 45, y: 40, n: 2 },
  { x: 70, y: 55, n: 3 },
  { x: 55, y: 80, n: 4 },
  { x: 30, y: 95, n: 5 },
];

export default function ConstellationHunterGame({
  levelIndex,
  onCompleteLevel,
  onRequestExit,
}: MiniGameProps) {
  const { colors } = useTheme();
  const [showTutorial, tutorialDone] = useTutorialSeen(META.id);
  const [next, setNext] = useState(1);
  const [mistakes, setMistakes] = useState(0);
  const [night, setNight] = useState(true);
  const [best, setBest] = useState<Stars | 0>(0);

  const myth = useMemo(
    () =>
      [
        "Orión es el cazador en la mitología griega.",
        "Las Pléyades son siete hermanas estelares.",
        "La Osa Mayor guía a la Polar.",
      ][levelIndex % 3],
    [levelIndex],
  );

  useEffect(() => {
    void getStarsForLevel(META.id, levelIndex).then(setBest);
  }, [levelIndex]);

  useEffect(() => {
    setNext(1);
    setMistakes(0);
  }, [levelIndex]);

  const onStar = (n: number) => {
    if (n !== next) {
      setMistakes((m) => m + 1);
      return;
    }
    if (n === ORION.length) {
      const stars = starsFromAttempts(ORION.length, mistakes, 0.9);
      void (async () => {
        await setStarsForLevel(META.id, levelIndex, stars);
        await setMaxUnlockedLevel(META.id, levelIndex + 1);
        await bumpUnlocksAfterLevel(META.id, levelIndex);
        onCompleteLevel({ levelIndex, stars, score: 100 - mistakes * 10 });
      })();
      return;
    }
    setNext(n + 1);
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
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: space.sm,
          }}
        >
          <Text style={{ color: colors.textSecondary, fontWeight: "700", flex: 1 }}>{myth}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={{ color: colors.textMuted, fontWeight: "700", fontSize: 12 }}>Noche</Text>
            <Switch value={night} onValueChange={setNight} />
          </View>
        </View>
        <View
          style={{
            height: 220,
            borderRadius: 16,
            backgroundColor: night ? "#0a1628" : colors.card,
            borderWidth: 1,
            borderColor: colors.borderSubtle,
            position: "relative",
          }}
        >
          {ORION.map((s) => (
            <Pressable
              key={s.n}
              onPress={() => onStar(s.n)}
              style={{
                position: "absolute",
                left: `${s.x}%`,
                top: `${s.y}%`,
                width: 36,
                height: 36,
                marginLeft: -18,
                marginTop: -18,
                borderRadius: 18,
                backgroundColor:
                  s.n < next ? colors.success : night ? "#fef3c7" : colors.primarySoft,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 2,
                borderColor: colors.primary,
              }}
            >
              <Text style={{ fontWeight: "900", color: night ? "#0f172a" : colors.text }}>
                {s.n}
              </Text>
            </Pressable>
          ))}
        </View>
      </MiniGameChrome>
    </View>
  );
}
