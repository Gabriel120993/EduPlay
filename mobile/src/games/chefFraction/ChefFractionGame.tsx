import { useEffect, useMemo, useState } from "react";
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
  id: "chef_fraction",
  title: "Chef Fraccionario",
  subtitle: "Serví la medida exacta",
  subject: "Fracciones",
  icon: "👩‍🍳",
};

const TUTORIAL: TutorialStep[] = [
  { title: "Receta", body: "El cliente pide una fracción exacta de pizza." },
  { title: "Cortes", body: "Elegí el trozo correcto entre las opciones." },
  { title: "Clientes", body: "Si fallás, el cliente se enoja (pero podés reintentar en el nivel)." },
  { title: "Progreso", body: "20+ niveles con fracciones cada vez más finas." },
];

const TOTAL_LEVELS = 22;

export const miniGameSpec = { meta: META, totalLevels: TOTAL_LEVELS };

const FRACS = ["1/2", "1/4", "3/4", "2/3", "1/3", "5/8", "3/8", "7/8"];

export default function ChefFractionGame({ levelIndex, onCompleteLevel, onRequestExit }: MiniGameProps) {
  const { colors } = useTheme();
  const [showTutorial, tutorialDone] = useTutorialSeen(META.id);
  const target = useMemo(() => FRACS[levelIndex % FRACS.length]!, [levelIndex]);
  const [mood, setMood] = useState("😊");
  const [mistakes, setMistakes] = useState(0);
  const [best, setBest] = useState<Stars | 0>(0);

  const options = useMemo(() => {
    const wrong = FRACS.filter((f) => f !== target).slice(0, 3);
    const merged = [target, ...wrong];
    for (let i = merged.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = merged[i]!;
      merged[i] = merged[j]!;
      merged[j] = t;
    }
    return merged;
  }, [target]);

  useEffect(() => {
    void getStarsForLevel(META.id, levelIndex).then(setBest);
  }, [levelIndex]);

  useEffect(() => {
    setMood("😊");
    setMistakes(0);
  }, [levelIndex]);

  const pick = (f: string) => {
    if (f === target) {
      setMood("🤩");
      const stars = starsFromAttempts(4, mistakes, 0.8);
      void (async () => {
        await setStarsForLevel(META.id, levelIndex, stars);
        await setMaxUnlockedLevel(META.id, levelIndex + 1);
        await bumpUnlocksAfterLevel(META.id, levelIndex);
        onCompleteLevel({ levelIndex, stars, score: 100 - mistakes * 12 });
      })();
    } else {
      setMood("😠");
      setMistakes((m) => m + 1);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {showTutorial ? <TutorialOverlay steps={TUTORIAL} onDone={() => void tutorialDone()} /> : null}
      <MiniGameChrome meta={META} levelIndex={levelIndex} totalLevels={TOTAL_LEVELS} bestStars={best || undefined} onBack={onRequestExit}>
        <Text style={{ fontSize: 40, textAlign: "center", marginBottom: space.sm }}>{mood}</Text>
        <Text style={{ color: colors.text, fontWeight: "900", fontSize: 18, textAlign: "center", marginBottom: space.md }}>
          Pedido: {target} de pizza 🍕
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm, justifyContent: "center" }}>
          {options.map((f) => (
            <Pressable
              key={f}
              onPress={() => pick(f)}
              style={{
                paddingVertical: space.md,
                paddingHorizontal: space.lg,
                borderRadius: 14,
                backgroundColor: colors.card,
                borderWidth: 2,
                borderColor: colors.borderSubtle,
              }}
            >
              <Text style={{ fontSize: 22, fontWeight: "900", color: colors.text }}>{f}</Text>
            </Pressable>
          ))}
        </View>
      </MiniGameChrome>
    </View>
  );
}
