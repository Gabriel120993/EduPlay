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
  id: "lab_mad",
  title: "Laboratorio Loco",
  subtitle: "Elegí dos elementos y mirá la reacción",
  subject: "Ciencias",
  icon: "🧪",
};

const TUTORIAL: TutorialStep[] = [
  { title: "Dos frascos", body: "Tocá un elemento y luego otro para mezclar." },
  { title: "Estados", body: "Agua + frío → hielo; agua + calor → vapor; sal + agua → salmuera." },
  { title: "¡Boom!", body: "Algunas mezclas raras explotan con humor: reintentá sin miedo." },
  { title: "Meta", body: "Cada nivel tiene una pareja ganadora distinta." },
];

const TOTAL_LEVELS = 22;

export const miniGameSpec = { meta: META, totalLevels: TOTAL_LEVELS };

const ELS = ["💧 Agua", "🧂 Sal", "🍋 Ácido", "🧼 Base", "❄️ Frío", "🔥 Calor"];

type PairKey = string;

const WINNING: PairKey[] = [
  "0-4",
  "0-5",
  "0-1",
  "2-3",
  "1-5",
  "3-4",
  "1-4",
  "2-5",
  "0-3",
  "1-3",
  "2-4",
  "3-5",
  "4-5",
];

export default function LabMadGame({ levelIndex, onCompleteLevel, onRequestExit }: MiniGameProps) {
  const { colors } = useTheme();
  const [showTutorial, tutorialDone] = useTutorialSeen(META.id);
  const [first, setFirst] = useState<number | null>(null);
  const [msg, setMsg] = useState("");
  const [mistakes, setMistakes] = useState(0);
  const [best, setBest] = useState<Stars | 0>(0);

  const target = useMemo(() => WINNING[levelIndex % WINNING.length]!, [levelIndex]);

  useEffect(() => {
    void getStarsForLevel(META.id, levelIndex).then(setBest);
  }, [levelIndex]);

  const onPick = (i: number) => {
    if (first === null) {
      setFirst(i);
      setMsg("Elegí el segundo elemento…");
      return;
    }
    const key = [first, i].sort((a, b) => a - b).join("-") as PairKey;
    setFirst(null);
    if (key === target) {
      setMsg("¡Reacción perfecta! 🎉");
      const stars = starsFromAttempts(2, mistakes, 0.85);
      void (async () => {
        await setStarsForLevel(META.id, levelIndex, stars);
        await setMaxUnlockedLevel(META.id, levelIndex + 1);
        await bumpUnlocksAfterLevel(META.id, levelIndex);
        onCompleteLevel({ levelIndex, stars, score: 100 - mistakes * 15 });
      })();
      return;
    }
    const funny = ["¡Boom! 💥", "¡Puf! ☁️", "¡Chisss! 🧨", "¡Splash! 💦"];
    setMsg(funny[levelIndex % funny.length]!);
    setMistakes((m) => m + 1);
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
        <Text style={{ color: colors.textSecondary, marginBottom: space.md, fontWeight: "700" }}>
          Encontrá la mezcla ganadora del nivel (experimentá con agua, sal, frío y calor).
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
          {ELS.map((label, i) => (
            <Pressable
              key={label}
              onPress={() => onPick(i)}
              style={{
                paddingVertical: space.sm,
                paddingHorizontal: space.md,
                borderRadius: 12,
                backgroundColor: first === i ? colors.primarySoft : colors.card,
                borderWidth: 1,
                borderColor: first === i ? colors.primary : colors.borderSubtle,
              }}
            >
              <Text style={{ fontWeight: "800", color: colors.text }}>{label}</Text>
            </Pressable>
          ))}
        </View>
        {msg ? (
          <Text
            style={{ marginTop: space.lg, color: colors.primary, fontWeight: "800", fontSize: 16 }}
          >
            {msg}
          </Text>
        ) : null}
      </MiniGameChrome>
    </View>
  );
}
