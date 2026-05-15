import { useCallback, useEffect, useMemo, useState } from "react";
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
  id: "word_builder",
  title: "Constructor de Palabras",
  subtitle: "Tocá letras en orden (drag en roadmap)",
  subject: "Lenguaje",
  icon: "🔤",
};

const TUTORIAL: TutorialStep[] = [
  { title: "Letras", body: "Tocá cada letra en el orden correcto para formar la palabra oculta." },
  { title: "Niveles", body: "De 3 a 8 letras según el número de nivel." },
  { title: "Modos", body: "Zen sin presión o contrarreloj sugerido de 45 s." },
  { title: "Estrellas", body: "Menos errores = más estrellas y cosméticos." },
];

const TOTAL_LEVELS = 22;

export const miniGameSpec = { meta: META, totalLevels: TOTAL_LEVELS };

const BANK = [
  "SOL",
  "LUZ",
  "MAR",
  "GATO",
  "CASA",
  "NUBE",
  "PLAZA",
  "ESCUELA",
  "BIBLIOTECA",
  "ASTRONAUTA",
];

function shuffleWord(s: string): string[] {
  const a = s.split("");
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]!;
    a[i] = a[j]!;
    a[j] = t;
  }
  return a;
}

export default function WordBuilderGame({
  levelIndex,
  onCompleteLevel,
  onRequestExit,
}: MiniGameProps) {
  const { colors } = useTheme();
  const [showTutorial, tutorialDone] = useTutorialSeen(META.id);
  const len = 3 + Math.min(5, levelIndex % 6);
  const word = useMemo(
    () =>
      BANK.find((w) => w.length === len) ?? BANK[Math.min(BANK.length - 1, 2 + (levelIndex % 7))]!,
    [len, levelIndex],
  );
  const [pool, setPool] = useState<string[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [deadline] = useState(() => Date.now() + 45000);
  const [best, setBest] = useState<Stars | 0>(0);
  const zen = levelIndex % 3 === 0;

  useEffect(() => {
    const decoys = "ZXQWK".split("");
    setPool(shuffleWord(word + decoys.slice(0, 2).join("")));
    setPicked([]);
    setMistakes(0);
  }, [word]);

  useEffect(() => {
    void getStarsForLevel(META.id, levelIndex).then(setBest);
  }, [levelIndex]);

  const nextLetter = word[picked.length] ?? "";

  const onTapLetter = useCallback(
    (ch: string) => {
      if (ch !== nextLetter) {
        setMistakes((m) => m + 1);
        return;
      }
      const nextPicked = [...picked, ch];
      setPicked(nextPicked);
      setPool((prev) => {
        const i = prev.indexOf(ch);
        if (i === -1) return prev;
        return [...prev.slice(0, i), ...prev.slice(i + 1)];
      });
      if (nextPicked.length >= word.length) {
        const timeLeft = zen ? 1 : Math.max(0, (deadline - Date.now()) / 45000);
        const stars = starsFromAttempts(word.length, mistakes, timeLeft);
        void (async () => {
          await setStarsForLevel(META.id, levelIndex, stars);
          await setMaxUnlockedLevel(META.id, levelIndex + 1);
          await bumpUnlocksAfterLevel(META.id, levelIndex);
          onCompleteLevel({ levelIndex, stars, score: 100 - mistakes * 5 });
        })();
      }
    },
    [deadline, levelIndex, mistakes, nextLetter, onCompleteLevel, picked, word.length, zen],
  );

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
        <Text style={{ color: colors.textMuted, fontWeight: "700", marginBottom: space.sm }}>
          {zen ? "Modo zen" : "Modo contrarreloj sugerido · 45 s"}
        </Text>
        <Text
          style={{
            color: colors.text,
            fontSize: 20,
            fontWeight: "900",
            letterSpacing: 4,
            marginBottom: space.md,
          }}
        >
          {word
            .split("")
            .map((c, i) => (i < picked.length ? c : "_"))
            .join(" ")}
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: space.sm }}>
          {pool.map((ch, idx) => (
            <Pressable
              key={`${idx}-${ch}`}
              onPress={() => onTapLetter(ch)}
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.borderSubtle,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 20, fontWeight: "900", color: colors.text }}>{ch}</Text>
            </Pressable>
          ))}
        </View>
      </MiniGameChrome>
    </View>
  );
}
