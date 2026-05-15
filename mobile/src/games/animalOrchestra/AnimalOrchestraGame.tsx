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
  id: "animal_orchestra",
  title: "Orquesta de Animales",
  subtitle: "Repetí la melodía",
  subject: "Música",
  icon: "🎻",
};

const TUTORIAL: TutorialStep[] = [
  { title: "Notas", body: "Cada animal representa una nota: DO RE MI FA SOL." },
  { title: "Secuencia", body: "Memorizá el orden y repetilo." },
  { title: "Instrumentos", body: "Aprendé nombres: arpa, trompeta, flauta…" },
  { title: "Niveles", body: "La secuencia crece con el nivel." },
];

const TOTAL_LEVELS = 22;

export const miniGameSpec = { meta: META, totalLevels: TOTAL_LEVELS };

const NOTES = ["DO", "RE", "MI", "FA", "SOL", "LA", "SI"];
const ANIMALS = ["🐘", "🦒", "🐸", "🦊", "🦁", "🐼", "🦉"];

export default function AnimalOrchestraGame({
  levelIndex,
  onCompleteLevel,
  onRequestExit,
}: MiniGameProps) {
  const { colors } = useTheme();
  const [showTutorial, tutorialDone] = useTutorialSeen(META.id);
  const len = 3 + (levelIndex % 4);
  const seq = useMemo(() => {
    const s: string[] = [];
    for (let i = 0; i < len; i++) s.push(NOTES[(i + levelIndex) % NOTES.length]!);
    return s;
  }, [len, levelIndex]);
  const [phase, setPhase] = useState<"show" | "play">("show");
  const [idx, setIdx] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [best, setBest] = useState<Stars | 0>(0);

  useEffect(() => {
    void getStarsForLevel(META.id, levelIndex).then(setBest);
  }, [levelIndex]);

  useEffect(() => {
    setPhase("show");
    setIdx(0);
    setMistakes(0);
  }, [levelIndex]);

  useEffect(() => {
    const t = setTimeout(() => setPhase("play"), 1200 + len * 400);
    return () => clearTimeout(t);
  }, [len, levelIndex]);

  const onNote = (n: string) => {
    if (phase !== "play") return;
    if (n !== seq[idx]) {
      setMistakes((m) => m + 1);
      return;
    }
    if (idx >= seq.length - 1) {
      const stars = starsFromAttempts(seq.length, mistakes, 0.8);
      void (async () => {
        await setStarsForLevel(META.id, levelIndex, stars);
        await setMaxUnlockedLevel(META.id, levelIndex + 1);
        await bumpUnlocksAfterLevel(META.id, levelIndex);
        onCompleteLevel({ levelIndex, stars, score: 100 - mistakes * 8 });
      })();
      return;
    }
    setIdx((i) => i + 1);
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
          {phase === "show" ? "Escuchá la secuencia…" : `Repetí: paso ${idx + 1}/${seq.length}`}
        </Text>
        <Text
          style={{ color: colors.text, fontSize: 18, fontWeight: "900", marginBottom: space.md }}
        >
          {phase === "show" ? seq.join(" · ") : "🎵"}
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
          {NOTES.map((n, i) => (
            <Pressable
              key={n}
              onPress={() => onNote(n)}
              style={{
                padding: space.sm,
                borderRadius: 12,
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.borderSubtle,
              }}
            >
              <Text style={{ fontWeight: "900", color: colors.text }}>
                {ANIMALS[i]} {n}
              </Text>
            </Pressable>
          ))}
        </View>
      </MiniGameChrome>
    </View>
  );
}
