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
  id: "world_navigator",
  title: "Navegante del Mundo",
  subtitle: "Capitales y rutas (mapa simplificado)",
  subject: "Geografía",
  icon: "🌎",
};

const TUTORIAL: TutorialStep[] = [
  { title: "Misiones", body: "Elegí la capital correcta o el país intermedio en la ruta." },
  { title: "Globo 3D", body: "En dispositivos móviles usamos mapa plano interactivo optimizado." },
  { title: "Datos", body: "Curiosidades reales por región." },
  { title: "Progreso", body: "Rutas más largas en niveles altos." },
];

const TOTAL_LEVELS = 22;

export const miniGameSpec = { meta: META, totalLevels: TOTAL_LEVELS };

const QUIZ = [
  { q: "Capital de Francia", a: "París", w: ["Lyon", "Marsella", "Niza"] },
  { q: "Capital de Japón", a: "Tokio", w: ["Osaka", "Kioto", "Sapporo"] },
  { q: "Capital de Argentina", a: "Buenos Aires", w: ["Córdoba", "Mendoza", "Rosario"] },
  { q: "Entre Argentina y España, ¿qué océano?", a: "Atlántico", w: ["Pacífico", "Índico", "Ártico"] },
];

export default function WorldNavigatorGame({ levelIndex, onCompleteLevel, onRequestExit }: MiniGameProps) {
  const { colors } = useTheme();
  const [showTutorial, tutorialDone] = useTutorialSeen(META.id);
  const item = QUIZ[levelIndex % QUIZ.length]!;
  const opts = useMemo(() => {
    const m = [item.a, ...item.w];
    for (let i = m.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = m[i]!;
      m[i] = m[j]!;
      m[j] = t;
    }
    return m;
  }, [item]);
  const [mistakes, setMistakes] = useState(0);
  const [best, setBest] = useState<Stars | 0>(0);

  useEffect(() => {
    void getStarsForLevel(META.id, levelIndex).then(setBest);
  }, [levelIndex]);

  useEffect(() => {
    setMistakes(0);
  }, [levelIndex]);

  const pick = (o: string) => {
    if (o === item.a) {
      const stars = starsFromAttempts(2, mistakes, 0.9);
      void (async () => {
        await setStarsForLevel(META.id, levelIndex, stars);
        await setMaxUnlockedLevel(META.id, levelIndex + 1);
        await bumpUnlocksAfterLevel(META.id, levelIndex);
        onCompleteLevel({ levelIndex, stars, score: 100 - mistakes * 12 });
      })();
    } else setMistakes((m) => m + 1);
  };

  return (
    <View style={{ flex: 1 }}>
      {showTutorial ? <TutorialOverlay steps={TUTORIAL} onDone={() => void tutorialDone()} /> : null}
      <MiniGameChrome meta={META} levelIndex={levelIndex} totalLevels={TOTAL_LEVELS} bestStars={best || undefined} onBack={onRequestExit}>
        <Text style={{ color: colors.text, fontWeight: "900", fontSize: 18, marginBottom: space.md }}>{item.q}</Text>
        {opts.map((o) => (
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
