import { useEffect, useMemo, useState } from "react";
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
  id: "history_detective",
  title: "Detective de Historia",
  subtitle: "Encontrá el objeto anacrónico",
  subject: "Historia",
  icon: "🕵️",
};

const TUTORIAL: TutorialStep[] = [
  { title: "Escena", body: "Ves una escena del pasado con varios objetos." },
  { title: "Pista", body: "Leé la pista histórica: te acerca al error de época." },
  { title: "Anacronismo", body: "Solo un objeto no pertenece a esa época." },
  { title: "Niveles", body: "Civilizaciones y edades distintas en cada nivel." },
];

const TOTAL_LEVELS = 22;

export const miniGameSpec = { meta: META, totalLevels: TOTAL_LEVELS };

const CASES = [
  {
    era: "Antiguo Egipto",
    hint: "Todavía no existían los metales baratos enchapados de esta forma.",
    correct: "Reloj de pulsera digital",
    options: ["Canasto de mimbre", "Reloj de pulsera digital", "Jarra de barro", "Pluma de ave"],
  },
  {
    era: "Edad Media europea",
    hint: "La imprenta aún no había llegado a los campesinos.",
    correct: "Tablet con internet",
    options: ["Espada de hierro", "Yelmo", "Tablet con internet", "Antorcha"],
  },
  {
    era: "Revolución industrial",
    hint: "Los videojuegos llegaron mucho después.",
    correct: "Control de consola",
    options: ["Vapor de fábrica", "Control de consola", "Carbón", "Engranaje de bronce"],
  },
];

export default function HistoryDetectiveGame({
  levelIndex,
  onCompleteLevel,
  onRequestExit,
}: MiniGameProps) {
  const { colors } = useTheme();
  const [showTutorial, tutorialDone] = useTutorialSeen(META.id);
  const c = CASES[levelIndex % CASES.length]!;
  const [mistakes, setMistakes] = useState(0);
  const [best, setBest] = useState<Stars | 0>(0);

  useEffect(() => {
    void getStarsForLevel(META.id, levelIndex).then(setBest);
  }, [levelIndex]);

  useEffect(() => {
    setMistakes(0);
  }, [levelIndex]);

  const pick = (opt: string) => {
    if (opt === c.correct) {
      const stars = starsFromAttempts(2, mistakes, 0.85);
      void (async () => {
        await setStarsForLevel(META.id, levelIndex, stars);
        await setMaxUnlockedLevel(META.id, levelIndex + 1);
        await bumpUnlocksAfterLevel(META.id, levelIndex);
        onCompleteLevel({ levelIndex, stars, score: 100 - mistakes * 15 });
      })();
    } else {
      setMistakes((m) => m + 1);
    }
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
        <Text
          style={{ color: colors.text, fontWeight: "900", fontSize: 18, marginBottom: space.xs }}
        >
          Escena: {c.era}
        </Text>
        <Text style={{ color: colors.textSecondary, marginBottom: space.sm, fontWeight: "600" }}>
          Pista: {c.hint}
        </Text>
        <Text style={{ color: colors.textMuted, marginBottom: space.md, fontWeight: "700" }}>
          ¿Qué NO pertenece?
        </Text>
        {c.options.map((o) => (
          <Pressable
            key={o}
            onPress={() => pick(o)}
            style={{
              marginBottom: space.sm,
              padding: space.md,
              borderRadius: 12,
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.borderSubtle,
            }}
          >
            <Text style={{ fontWeight: "800", color: colors.text }}>{o}</Text>
          </Pressable>
        ))}
      </MiniGameChrome>
    </View>
  );
}
