import { useEffect, useState } from "react";
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
  id: "emotiometer",
  title: "Emociómetro",
  subtitle: "Emociones y respuestas sanas",
  subject: "Inteligencia emocional",
  icon: "💬",
};

const TUTORIAL: TutorialStep[] = [
  { title: "Emociones", body: "Leé la situación y elegí la emoción principal del personaje." },
  { title: "Respuestas", body: "Luego elegí la mejor respuesta para cuidar la amistad." },
  { title: "Amistades", body: "Sumás puntos de confianza virtuales al acertar." },
  { title: "Niveles", body: "Situaciones más complejas al avanzar." },
];

const TOTAL_LEVELS = 22;

export const miniGameSpec = { meta: META, totalLevels: TOTAL_LEVELS };

const ROUNDS = [
  {
    situation: "Le ganaron el lugar en el equipo y se quedó callado.",
    emotion: "Tristeza",
    emoOpts: ["Alegría", "Tristeza", "Enojo", "Miedo"],
    react: "¿Qué podés decirle?",
    good: "Te entiendo, ¿querés jugar otro día juntos?",
    reactOpts: ["No seas dramático", "Te entiendo, ¿querés jugar otro día juntos?", "Gané yo, punto.", "Ignoralo"],
  },
  {
    situation: "Le gritaron sin razón en el patio.",
    emotion: "Enojo",
    emoOpts: ["Calma", "Enojo", "Aburrimiento", "Sorpresa"],
    react: "Mejor respuesta:",
    good: "Respirá hondo; después hablamos con calma.",
    reactOpts: ["Pelear a gritos", "Respirá hondo; después hablamos con calma.", "Chismeá con otros", "Te lo guardás para siempre"],
  },
];

export default function EmotiometerGame({ levelIndex, onCompleteLevel, onRequestExit }: MiniGameProps) {
  const { colors } = useTheme();
  const [showTutorial, tutorialDone] = useTutorialSeen(META.id);
  const r = ROUNDS[levelIndex % ROUNDS.length]!;
  const [step, setStep] = useState<"emo" | "react">("emo");
  const [mistakes, setMistakes] = useState(0);
  const [best, setBest] = useState<Stars | 0>(0);

  useEffect(() => {
    void getStarsForLevel(META.id, levelIndex).then(setBest);
  }, [levelIndex]);

  useEffect(() => {
    setStep("emo");
    setMistakes(0);
  }, [levelIndex]);

  const pickEmo = (o: string) => {
    if (o !== r.emotion) {
      setMistakes((m) => m + 1);
      return;
    }
    setStep("react");
  };

  const pickReact = (o: string) => {
    if (o !== r.good) {
      setMistakes((m) => m + 1);
      return;
    }
    const stars = starsFromAttempts(3, mistakes, 0.85);
    void (async () => {
      await setStarsForLevel(META.id, levelIndex, stars);
      await setMaxUnlockedLevel(META.id, levelIndex + 1);
      await bumpUnlocksAfterLevel(META.id, levelIndex);
      onCompleteLevel({ levelIndex, stars, score: 100 - mistakes * 10 });
    })();
  };

  return (
    <View style={{ flex: 1 }}>
      {showTutorial ? <TutorialOverlay steps={TUTORIAL} onDone={() => void tutorialDone()} /> : null}
      <MiniGameChrome meta={META} levelIndex={levelIndex} totalLevels={TOTAL_LEVELS} bestStars={best || undefined} onBack={onRequestExit}>
        <Text style={{ color: colors.text, fontWeight: "800", marginBottom: space.md }}>{r.situation}</Text>
        {step === "emo" ? (
          <>
            <Text style={{ color: colors.textMuted, marginBottom: space.sm, fontWeight: "700" }}>¿Qué emoción siente?</Text>
            {r.emoOpts.map((o) => (
              <Pressable key={o} onPress={() => pickEmo(o)} style={{ marginBottom: space.sm, padding: space.md, borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderSubtle }}>
                <Text style={{ fontWeight: "800", color: colors.text }}>{o}</Text>
              </Pressable>
            ))}
          </>
        ) : (
          <>
            <Text style={{ color: colors.textMuted, marginBottom: space.sm, fontWeight: "700" }}>{r.react}</Text>
            {r.reactOpts.map((o) => (
              <Pressable key={o} onPress={() => pickReact(o)} style={{ marginBottom: space.sm, padding: space.md, borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderSubtle }}>
                <Text style={{ fontWeight: "800", color: colors.text }}>{o}</Text>
              </Pressable>
            ))}
          </>
        )}
      </MiniGameChrome>
    </View>
  );
}
