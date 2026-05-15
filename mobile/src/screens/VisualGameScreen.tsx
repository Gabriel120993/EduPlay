import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { AppIcon } from "../components/AppIcon";
import { QuizImage } from "../components/QuizImage";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { formatVisualResumeLabel, saveLastPlayedGame } from "../lib/continueLearningStorage";
import { showToast } from "../lib/toastBus";
import {
  completeQuizSession,
  getVisualQuestions,
  notifyMissionRewardsFromApiResponse,
} from "../services/api";
import {
  playClick,
  playError,
  playSuccess,
  preloadGameFeedbackSounds,
} from "../services/soundManager";
import type { VisualQuestionItem } from "../types/api";
import type { RootStackParamList } from "../navigation/types";
import { screenEdge, space } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "VisualGame">;
type QuizDifficulty = "EASY" | "MEDIUM" | "HARD";
type VisualCategory =
  | "astronomy"
  | "math"
  | "science"
  | "history"
  | "geography"
  | "creativity"
  | "mixed";

const AUTO_NEXT_MS = 1000;
const QUIZ_REPEAT_HISTORY_LIMIT = 30;
/** Relación ancho/alto del área de imagen (mapas y fotos se ven completos con `contain`). */
const VISUAL_IMAGE_ASPECT_RATIO = 4 / 3;
/** Tope de alto para que en pantallas grandes no ocupe toda la ventana. */
const VISUAL_IMAGE_MAX_HEIGHT = 320;

type VisualGameId =
  | "guess-planet"
  | "identify-country"
  | "dino-names"
  | "color-mix"
  | "spot-difference"
  | "world-puzzle";

type VisualGameConfig = {
  title: string;
  category: VisualCategory;
  difficulty: QuizDifficulty;
  xpPerLevel: number;
  completionBonus: number;
  fallbackQuestions: VisualQuestionItem[];
};

function imageUrl(label: string): string {
  return `https://placehold.co/900x675/png?text=${encodeURIComponent(label)}`;
}

function question(
  id: string,
  imageLabel: string,
  prompt: string,
  options: string[],
  correct: number,
  category: string,
  difficulty: QuizDifficulty,
): VisualQuestionItem {
  return {
    id,
    imageUrl: imageUrl(imageLabel),
    question: prompt,
    options,
    correct,
    category,
    difficulty,
    createdAt: new Date(0).toISOString(),
  };
}

const VISUAL_GAME_CONFIG: Record<VisualGameId, VisualGameConfig> = {
  "guess-planet": {
    title: "🪐 Adiviná el planeta",
    category: "astronomy",
    difficulty: "EASY",
    xpPerLevel: 10,
    completionBonus: 50,
    fallbackQuestions: [
      question(
        "planet-mars",
        "Foto realista de Marte",
        "¿Qué planeta es?",
        ["Marte", "Venus", "Mercurio", "Júpiter"],
        0,
        "astronomy",
        "EASY",
      ),
      question(
        "planet-saturn",
        "Saturno con anillos",
        "¿Qué planeta tiene anillos?",
        ["Urano", "Saturno", "Neptuno", "Tierra"],
        1,
        "astronomy",
        "EASY",
      ),
      question(
        "planet-earth",
        "Planeta Tierra desde el espacio",
        "¿Nuestro planeta?",
        ["Marte", "Tierra", "Venus", "Júpiter"],
        1,
        "astronomy",
        "EASY",
      ),
      question(
        "planet-jupiter",
        "Júpiter gigante gaseoso",
        "¿Cuál es el planeta más grande?",
        ["Júpiter", "Marte", "Tierra", "Mercurio"],
        0,
        "astronomy",
        "EASY",
      ),
      question(
        "planet-venus",
        "Venus cubierto de nubes",
        "¿Cuál es el planeta más caliente?",
        ["Neptuno", "Venus", "Saturno", "Marte"],
        1,
        "astronomy",
        "EASY",
      ),
      question(
        "planet-mercury",
        "Mercurio gris rocoso",
        "¿Cuál está más cerca del Sol?",
        ["Mercurio", "Tierra", "Marte", "Urano"],
        0,
        "astronomy",
        "EASY",
      ),
      question(
        "planet-neptune",
        "Neptuno azul",
        "¿Qué planeta es azul intenso y lejano?",
        ["Saturno", "Neptuno", "Venus", "Mercurio"],
        1,
        "astronomy",
        "EASY",
      ),
      question(
        "planet-uranus",
        "Urano planeta helado",
        "¿Qué planeta gira casi de costado?",
        ["Urano", "Júpiter", "Marte", "Tierra"],
        0,
        "astronomy",
        "EASY",
      ),
      question(
        "moon",
        "La Luna",
        "¿Qué astro natural acompaña a la Tierra?",
        ["El Sol", "La Luna", "Marte", "Saturno"],
        1,
        "astronomy",
        "EASY",
      ),
      question(
        "sun",
        "El Sol estrella",
        "¿Qué estrella ilumina nuestro sistema?",
        ["Sirio", "El Sol", "La Luna", "Venus"],
        1,
        "astronomy",
        "EASY",
      ),
    ],
  },
  "identify-country": {
    title: "🗺️ Identificá el país",
    category: "geography",
    difficulty: "MEDIUM",
    xpPerLevel: 15,
    completionBonus: 100,
    fallbackQuestions: [
      question(
        "flag-argentina",
        "Bandera de Argentina",
        "¿De qué país es esta bandera?",
        ["Argentina", "Uruguay", "Chile", "Perú"],
        0,
        "geography",
        "EASY",
      ),
      question(
        "map-brazil",
        "Mapa de Brasil",
        "¿Qué país tiene esta forma?",
        ["México", "Brasil", "Colombia", "España"],
        1,
        "geography",
        "EASY",
      ),
      question(
        "eiffel-tower",
        "Torre Eiffel",
        "¿En qué país está?",
        ["Italia", "Francia", "Alemania", "Brasil"],
        1,
        "geography",
        "EASY",
      ),
      question(
        "flag-japan",
        "Bandera de Japón",
        "¿Qué país usa esta bandera?",
        ["China", "Japón", "Corea", "India"],
        1,
        "geography",
        "EASY",
      ),
      question(
        "map-italy",
        "Mapa de Italia forma de bota",
        "¿Qué país tiene forma de bota?",
        ["Italia", "Grecia", "Portugal", "Noruega"],
        0,
        "geography",
        "EASY",
      ),
      question(
        "flag-canada",
        "Bandera de Canadá",
        "¿De qué país es la hoja de maple?",
        ["Canadá", "Estados Unidos", "Reino Unido", "Francia"],
        0,
        "geography",
        "MEDIUM",
      ),
      question(
        "pyramids",
        "Pirámides de Giza",
        "¿En qué país están estas pirámides?",
        ["Egipto", "Marruecos", "Grecia", "Perú"],
        0,
        "geography",
        "MEDIUM",
      ),
      question(
        "flag-brazil",
        "Bandera de Brasil",
        "¿Qué país tiene esta bandera?",
        ["Argentina", "Brasil", "Bolivia", "Chile"],
        1,
        "geography",
        "EASY",
      ),
      question(
        "map-australia",
        "Mapa de Australia",
        "¿Qué país y continente aparece?",
        ["Australia", "India", "Sudáfrica", "China"],
        0,
        "geography",
        "MEDIUM",
      ),
      question(
        "statue-liberty",
        "Estatua de la Libertad",
        "¿En qué país está?",
        ["Francia", "Estados Unidos", "Canadá", "Italia"],
        1,
        "geography",
        "EASY",
      ),
      question(
        "flag-spain",
        "Bandera de España",
        "¿De qué país es esta bandera?",
        ["México", "España", "Colombia", "Ecuador"],
        1,
        "geography",
        "EASY",
      ),
      question(
        "machu-picchu",
        "Machu Picchu",
        "¿En qué país está Machu Picchu?",
        ["Perú", "Chile", "Argentina", "Bolivia"],
        0,
        "geography",
        "MEDIUM",
      ),
      question(
        "flag-mexico",
        "Bandera de México",
        "¿De qué país es esta bandera?",
        ["Italia", "México", "Portugal", "Brasil"],
        1,
        "geography",
        "EASY",
      ),
      question(
        "big-ben",
        "Big Ben Londres",
        "¿En qué país está este monumento?",
        ["Irlanda", "Reino Unido", "España", "Francia"],
        1,
        "geography",
        "MEDIUM",
      ),
      question(
        "flag-chile",
        "Bandera de Chile",
        "¿De qué país es esta bandera?",
        ["Chile", "Cuba", "Panamá", "Paraguay"],
        0,
        "geography",
        "EASY",
      ),
    ],
  },
  "dino-names": {
    title: "🦕 Dinosaurios: ¿Sabés su nombre?",
    category: "history",
    difficulty: "EASY",
    xpPerLevel: 12,
    completionBonus: 60,
    fallbackQuestions: [
      question(
        "tyrannosaurus-rex",
        "Tyrannosaurus rex",
        "¿Qué dinosaurio es?",
        ["Triceratops", "Tiranosaurio rex", "Estegosaurio", "Velociraptor"],
        1,
        "history",
        "EASY",
      ),
      question(
        "triceratops",
        "Triceratops",
        "¿Cuál tenía tres cuernos?",
        ["Triceratops", "Diplodocus", "Anquilosaurio", "Spinosaurus"],
        0,
        "history",
        "EASY",
      ),
      question(
        "stegosaurus",
        "Stegosaurus placas dorsales",
        "¿Qué dinosaurio tenía placas en el lomo?",
        ["Estegosaurio", "T. rex", "Iguanodon", "Pteranodon"],
        0,
        "history",
        "EASY",
      ),
      question(
        "velociraptor",
        "Velociraptor",
        "¿Cuál era pequeño y veloz?",
        ["Velociraptor", "Braquiosaurio", "Triceratops", "Estegosaurio"],
        0,
        "history",
        "EASY",
      ),
      question(
        "brachiosaurus",
        "Braquiosaurio cuello largo",
        "¿Cuál tenía cuello muy largo?",
        ["Braquiosaurio", "T. rex", "Anquilosaurio", "Carnotaurus"],
        0,
        "history",
        "EASY",
      ),
      question(
        "spinosaurus",
        "Spinosaurus vela dorsal",
        "¿Cuál tenía una vela en la espalda?",
        ["Spinosaurus", "Diplodocus", "Triceratops", "Velociraptor"],
        0,
        "history",
        "EASY",
      ),
      question(
        "ankylosaurus",
        "Anquilosaurio armadura",
        "¿Cuál tenía armadura y cola fuerte?",
        ["Anquilosaurio", "Pteranodon", "Iguanodon", "T. rex"],
        0,
        "history",
        "EASY",
      ),
      question(
        "pteranodon",
        "Pteranodon volador",
        "¿Cuál podía volar?",
        ["Pteranodon", "Triceratops", "Braquiosaurio", "Estegosaurio"],
        0,
        "history",
        "EASY",
      ),
      question(
        "diplodocus",
        "Diplodocus",
        "¿Cuál era largo y herbívoro?",
        ["Diplodocus", "Velociraptor", "Carnotaurus", "Spinosaurus"],
        0,
        "history",
        "EASY",
      ),
      question(
        "carnotaurus",
        "Carnotaurus",
        "¿Cuál tenía cuernos cortos sobre los ojos?",
        ["Carnotaurus", "Diplodocus", "Anquilosaurio", "Pteranodon"],
        0,
        "history",
        "EASY",
      ),
    ],
  },
  "color-mix": {
    title: "🎨 ¿Qué color es?",
    category: "creativity",
    difficulty: "EASY",
    xpPerLevel: 10,
    completionBonus: 40,
    fallbackQuestions: [
      question(
        "blue-yellow-mix",
        "Azul + Amarillo",
        "¿Qué color se forma?",
        ["Verde", "Rojo", "Violeta", "Naranja"],
        0,
        "creativity",
        "EASY",
      ),
      question(
        "red-yellow-mix",
        "Rojo + Amarillo",
        "¿Qué color aparece?",
        ["Azul", "Naranja", "Verde", "Marrón"],
        1,
        "creativity",
        "EASY",
      ),
      question(
        "red-blue-mix",
        "Rojo + Azul",
        "¿Qué color se forma?",
        ["Violeta", "Amarillo", "Blanco", "Verde"],
        0,
        "creativity",
        "EASY",
      ),
      question(
        "black-white-mix",
        "Negro + Blanco",
        "¿Qué color se obtiene?",
        ["Gris", "Verde", "Rosa", "Azul"],
        0,
        "creativity",
        "EASY",
      ),
      question(
        "red-white-mix",
        "Rojo + Blanco",
        "¿Qué color aparece?",
        ["Rosa", "Negro", "Verde", "Azul"],
        0,
        "creativity",
        "EASY",
      ),
      question(
        "yellow-white-mix",
        "Amarillo + Blanco",
        "¿Qué pasa con el amarillo?",
        ["Se aclara", "Se vuelve negro", "Se vuelve azul", "Desaparece"],
        0,
        "creativity",
        "EASY",
      ),
      question(
        "blue-white-mix",
        "Azul + Blanco",
        "¿Qué color se forma?",
        ["Celeste", "Rojo", "Marrón", "Naranja"],
        0,
        "creativity",
        "EASY",
      ),
      question(
        "many-colors-rainbow",
        "Arcoiris",
        "¿Cuántos colores tiene el arcoíris?",
        ["5", "6", "7", "10"],
        2,
        "creativity",
        "EASY",
      ),
    ],
  },
  "spot-difference": {
    title: "🔍 Encuentra la Diferencia",
    category: "creativity",
    difficulty: "MEDIUM",
    xpPerLevel: 20,
    completionBonus: 80,
    fallbackQuestions: [
      question(
        "difference-forest",
        "Bosque dos imágenes 5 diferencias",
        "Encontrá la diferencia principal.",
        ["Falta un árbol", "Hay otro planeta", "Cambia el océano", "No hay animales"],
        0,
        "creativity",
        "MEDIUM",
      ),
      question(
        "difference-classroom",
        "Aula dos imágenes 5 diferencias",
        "¿Qué cambió?",
        ["Un libro cambió de lugar", "Apareció nieve", "El techo desapareció", "Hay un volcán"],
        0,
        "creativity",
        "MEDIUM",
      ),
      question(
        "difference-beach",
        "Playa dos imágenes 5 diferencias",
        "¿Qué objeto falta?",
        ["Sombrilla", "Cohete", "Dinosaurio", "Piano"],
        0,
        "creativity",
        "MEDIUM",
      ),
      question(
        "difference-space",
        "Espacio dos imágenes 5 diferencias",
        "¿Qué aparece diferente?",
        ["Una estrella extra", "Una ciudad", "Un río", "Un castillo"],
        0,
        "creativity",
        "MEDIUM",
      ),
      question(
        "difference-jungle",
        "Selva dos imágenes 5 diferencias",
        "¿Qué animal cambió de posición?",
        ["Mono", "Ballena", "Pingüino", "Camello"],
        0,
        "creativity",
        "MEDIUM",
      ),
    ],
  },
  "world-puzzle": {
    title: "🧩 Rompecabezas del Mundo",
    category: "geography",
    difficulty: "MEDIUM",
    xpPerLevel: 15,
    completionBonus: 75,
    fallbackQuestions: [
      question(
        "puzzle-world-map-4",
        "Mapa mundial 4 piezas",
        "¿Qué estás armando?",
        ["Mapa del mundo", "Sistema solar", "Cuerpo humano", "Instrumento musical"],
        0,
        "geography",
        "EASY",
      ),
      question(
        "puzzle-lion-4",
        "León 4 piezas",
        "¿Qué animal aparece?",
        ["León", "Tiburón", "Águila", "Caballo"],
        0,
        "geography",
        "EASY",
      ),
      question(
        "puzzle-eiffel-4",
        "Torre Eiffel 4 piezas",
        "¿Qué monumento es?",
        ["Torre Eiffel", "Coliseo", "Pirámide", "Obelisco"],
        0,
        "geography",
        "EASY",
      ),
      question(
        "puzzle-south-america-9",
        "Sudamérica 9 piezas",
        "¿Qué región es?",
        ["América del Sur", "Europa", "Oceanía", "África"],
        0,
        "geography",
        "MEDIUM",
      ),
      question(
        "puzzle-elephant-9",
        "Elefante 9 piezas",
        "¿Qué animal estás armando?",
        ["Elefante", "Delfín", "Gato", "Oso polar"],
        0,
        "geography",
        "MEDIUM",
      ),
      question(
        "puzzle-colosseum-9",
        "Coliseo 9 piezas",
        "¿Qué monumento es?",
        ["Coliseo", "Torre Eiffel", "Machu Picchu", "Big Ben"],
        0,
        "geography",
        "MEDIUM",
      ),
      question(
        "puzzle-africa-16",
        "África 16 piezas",
        "¿Qué continente aparece?",
        ["África", "Asia", "Europa", "Antártida"],
        0,
        "geography",
        "HARD",
      ),
      question(
        "puzzle-toucan-16",
        "Tucán 16 piezas",
        "¿Qué animal aparece?",
        ["Tucán", "León", "Ballena", "Cóndor"],
        0,
        "geography",
        "HARD",
      ),
      question(
        "puzzle-machu-16",
        "Machu Picchu 16 piezas",
        "¿Qué lugar estás armando?",
        ["Machu Picchu", "Coliseo", "Taj Mahal", "Partenón"],
        0,
        "geography",
        "HARD",
      ),
      question(
        "puzzle-oceania-16",
        "Oceanía 16 piezas",
        "¿Qué región aparece?",
        ["Oceanía", "Europa", "América", "África"],
        0,
        "geography",
        "HARD",
      ),
      question(
        "puzzle-panda-16",
        "Panda 16 piezas",
        "¿Qué animal es?",
        ["Panda", "Tigre", "Cebra", "Koala"],
        0,
        "geography",
        "HARD",
      ),
      question(
        "puzzle-taj-mahal-16",
        "Taj Mahal 16 piezas",
        "¿Qué monumento es?",
        ["Taj Mahal", "Big Ben", "Coliseo", "Pirámide"],
        0,
        "geography",
        "HARD",
      ),
    ],
  },
};

function visualSeenKey(category: string, difficulty: QuizDifficulty): string {
  return `visual_seen:${category.toLowerCase()}:${difficulty}`;
}

async function readSeenVisualIds(category: string, difficulty: QuizDifficulty): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(visualSeenKey(category, difficulty));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((x) => String(x)) : [];
  } catch {
    return [];
  }
}

async function storeSeenVisualIds(
  category: string,
  difficulty: QuizDifficulty,
  newIds: string[],
): Promise<void> {
  try {
    const previous = await readSeenVisualIds(category, difficulty);
    const merged = [...new Set([...newIds, ...previous])].slice(0, QUIZ_REPEAT_HISTORY_LIMIT);
    await AsyncStorage.setItem(visualSeenKey(category, difficulty), JSON.stringify(merged));
  } catch {
    // best effort
  }
}

function visualProgressKey(gameId: string, viewerUserId?: string): string {
  return `visual_progress:${viewerUserId ?? "local"}:${gameId}`;
}

async function saveVisualProgress(
  gameId: string,
  viewerUserId: string | undefined,
  progress: { completedLevels: number; totalLevels: number; xpEarned: number; completed: boolean },
): Promise<void> {
  try {
    await AsyncStorage.setItem(
      visualProgressKey(gameId, viewerUserId),
      JSON.stringify({ ...progress, updatedAt: new Date().toISOString() }),
    );
  } catch {
    // best effort
  }
}

export function VisualGameScreen({ route }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { viewerUserId } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const params = route.params;
  const gameId: VisualGameId = useMemo(() => {
    const raw = params?.gameId;
    if (
      raw === "guess-planet" ||
      raw === "identify-country" ||
      raw === "dino-names" ||
      raw === "color-mix" ||
      raw === "spot-difference" ||
      raw === "world-puzzle"
    ) {
      return raw;
    }
    return params?.category === "geography" ? "identify-country" : "guess-planet";
  }, [params?.category, params?.gameId]);
  const gameConfig = VISUAL_GAME_CONFIG[gameId];

  const category: VisualCategory = useMemo(() => {
    if (gameConfig) return gameConfig.category;
    const raw = params?.category;
    if (
      raw === "astronomy" ||
      raw === "math" ||
      raw === "science" ||
      raw === "history" ||
      raw === "geography" ||
      raw === "creativity" ||
      raw === "mixed"
    ) {
      return raw;
    }
    return "astronomy";
  }, [gameConfig, params?.category]);

  const difficulty: QuizDifficulty = useMemo(() => {
    if (gameConfig) return gameConfig.difficulty;
    const raw = params?.difficulty;
    if (raw === "EASY" || raw === "MEDIUM" || raw === "HARD") return raw;
    return "EASY";
  }, [gameConfig, params?.difficulty]);

  const [questions, setQuestions] = useState<VisualQuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const answerLockRef = useRef(false);
  const correctRef = useRef(0);
  const successScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (loading || questions.length === 0) return;
    void preloadGameFeedbackSounds();
  }, [loading, questions.length]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      setIndex(0);
      setSelectedIndex(null);
      try {
        const seenIds = await readSeenVisualIds(category, difficulty);
        const apiRows = await getVisualQuestions({ category, difficulty, excludeIds: seenIds });
        const rows = apiRows.length > 0 ? apiRows : gameConfig.fallbackQuestions;
        if (!mounted) return;
        setQuestions(rows);
        if (rows.length > 0) {
          void saveLastPlayedGame({
            kind: "visual",
            category,
            difficulty,
            label: formatVisualResumeLabel(category, difficulty),
          });
        }
        void storeSeenVisualIds(
          category,
          difficulty,
          rows.map((q) => q.id),
        );
        correctRef.current = 0;
      } catch {
        if (!mounted) return;
        setError("No se pudo cargar el juego visual.");
        setQuestions([]);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };
    void load();
    return () => {
      mounted = false;
    };
  }, [category, difficulty, gameConfig.fallbackQuestions]);

  const question = questions[index];
  const answered = selectedIndex != null;
  const isCorrectSelection = answered && question != null && selectedIndex === question.correct;
  const isIncorrectSelection = answered && question != null && selectedIndex !== question.correct;
  const progress = useMemo(
    () => (questions.length > 0 ? `${index + 1}/${questions.length}` : "0/0"),
    [index, questions.length],
  );
  const currentXpEarned = correctRef.current * gameConfig.xpPerLevel;

  const imageUri = (question?.imageUrl ?? "").trim();

  const layoutWidth = Math.max(windowWidth, Dimensions.get("window").width, 320);
  const horizontalPad = screenEdge.horizontal * 2;
  let imageFrameWidth = Math.max(200, layoutWidth - horizontalPad);
  let imageFrameHeight = imageFrameWidth / VISUAL_IMAGE_ASPECT_RATIO;
  if (imageFrameHeight > VISUAL_IMAGE_MAX_HEIGHT) {
    imageFrameHeight = VISUAL_IMAGE_MAX_HEIGHT;
    imageFrameWidth = imageFrameHeight * VISUAL_IMAGE_ASPECT_RATIO;
  }

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error || !question) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: screenEdge.horizontal,
          backgroundColor: colors.background,
        }}
      >
        <Text style={{ color: colors.error, fontWeight: "700", textAlign: "center" }}>
          {error ?? "No hay preguntas visuales disponibles."}
        </Text>
      </View>
    );
  }

  const onAnswer = (optionIdx: number) => {
    if (answerLockRef.current || selectedIndex != null) return;
    answerLockRef.current = true;
    playClick();
    setSelectedIndex(optionIdx);
    const gotIt = optionIdx === question.correct;
    if (gotIt) correctRef.current += 1;
    if (gotIt) {
      successScale.setValue(0.75);
      Animated.spring(successScale, {
        toValue: 1,
        friction: 4,
        tension: 140,
        useNativeDriver: true,
      }).start(() => {
        Animated.timing(successScale, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }).start();
      });
      setTimeout(() => playSuccess(), 55);
    } else {
      setTimeout(() => playError(), 55);
    }
    void saveVisualProgress(gameId, viewerUserId ?? undefined, {
      completedLevels: index + 1,
      totalLevels: questions.length,
      xpEarned:
        correctRef.current * gameConfig.xpPerLevel +
        (gotIt && index === questions.length - 1 ? gameConfig.completionBonus : 0),
      completed: index === questions.length - 1,
    });
    timerRef.current = setTimeout(() => {
      setSelectedIndex(null);
      const isLast = index === questions.length - 1;
      if (!isLast) {
        answerLockRef.current = false;
      }
      if (isLast) {
        const finalScore = correctRef.current;
        const totalQ = questions.length;
        void (async () => {
          let xpGained: number | undefined;
          if (viewerUserId) {
            try {
              const res = await completeQuizSession({
                userId: viewerUserId,
                category,
                correct: finalScore,
                total: totalQ,
                mode: "visual",
              });
              xpGained = res.xpGained;
              notifyMissionRewardsFromApiResponse(res.missionRewards);
              if (res.dailyChallengeBonus) {
                showToast(
                  `¡Reto diario! +${res.dailyChallengeBonus.bonusXp} XP${
                    res.dailyChallengeBonus.badgeUnlocked ? " · insignia «Campeón del día»" : ""
                  }`,
                  "success",
                );
              }
            } catch {
              // resultado local válido
            }
          }
          const localXp =
            finalScore * gameConfig.xpPerLevel +
            (finalScore === totalQ ? gameConfig.completionBonus : 0);
          navigation.replace("QuizResult", {
            score: finalScore,
            total: totalQ,
            xpGained: xpGained ?? localXp,
            category,
            difficulty,
            gameMode: "visual",
          });
        })();
        return;
      }
      setIndex((prev) => prev + 1);
    }, AUTO_NEXT_MS);
  };

  return (
    <View
      style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top + space.sm }}
    >
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: screenEdge.horizontal,
          paddingBottom: insets.bottom + space.lg,
          flexGrow: 1,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={{ color: colors.text, fontWeight: "900", fontSize: 22, marginBottom: space.xs }}
        >
          {gameConfig.title}
        </Text>
        <Text style={{ color: colors.textMuted, fontWeight: "800", marginBottom: space.sm }}>
          Nivel {progress} · +{gameConfig.xpPerLevel} XP por nivel · ganado: {currentXpEarned} XP
        </Text>

        <View
          style={{
            width: imageFrameWidth,
            height: imageFrameHeight,
            alignSelf: "center",
            borderRadius: 12,
            overflow: "hidden",
            marginBottom: space.lg,
            backgroundColor: colors.card,
            borderWidth: 3,
            borderColor: isCorrectSelection
              ? colors.success
              : isIncorrectSelection
                ? colors.error
                : colors.borderSubtle,
          }}
        >
          {imageUri.length > 0 ? (
            <View style={{ width: "100%", height: "100%" }}>
              <QuizImage
                imageUrl={imageUri}
                recycleKey={question.id}
                fill
                borderless
                style={{ width: "100%", height: "100%" }}
              />
              {isIncorrectSelection ? (
                <View
                  style={{
                    position: "absolute",
                    inset: 0,
                    backgroundColor: "rgba(220, 38, 38, 0.18)",
                  }}
                />
              ) : null}
              {isCorrectSelection ? (
                <Animated.View
                  style={{
                    position: "absolute",
                    top: space.sm,
                    right: space.sm,
                    width: 34,
                    height: 34,
                    borderRadius: 999,
                    backgroundColor: colors.success,
                    alignItems: "center",
                    justifyContent: "center",
                    transform: [
                      {
                        scale: successScale.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.2, 1],
                        }),
                      },
                    ],
                  }}
                >
                  <AppIcon name="checkmark" size="md" color="#fff" />
                </Animated.View>
              ) : null}
            </View>
          ) : (
            <View
              style={{
                width: "100%",
                height: "100%",
                alignItems: "center",
                justifyContent: "center",
                padding: space.md,
                gap: space.sm,
                backgroundColor: colors.background,
              }}
              accessibilityRole="image"
              accessibilityLabel="Imagen no disponible"
            >
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 12,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors.card,
                  borderWidth: 1,
                  borderColor: colors.borderSubtle,
                }}
              >
                <AppIcon name="image-outline" size={40} color={colors.textMuted} />
              </View>
              <Text
                style={{
                  color: colors.textMuted,
                  fontWeight: "600",
                  textAlign: "center",
                  fontSize: 15,
                }}
              >
                Imagen no disponible
              </Text>
            </View>
          )}
        </View>

        <Text
          style={{
            color: colors.text,
            fontSize: 20,
            fontWeight: "800",
            lineHeight: 28,
            marginBottom: space.md,
          }}
        >
          {question.question}
        </Text>

        <View style={{ gap: space.sm }}>
          {question.options.slice(0, 4).map((opt, optIdx) => {
            const isCorrect = optIdx === question.correct;
            const isSelected = selectedIndex === optIdx;
            const bg = answered
              ? isCorrect
                ? colors.success
                : isSelected
                  ? colors.error
                  : colors.card
              : colors.card;
            const borderColor = answered
              ? isCorrect
                ? colors.success
                : isSelected
                  ? colors.error
                  : colors.borderSubtle
              : colors.borderSubtle;
            const textColor = answered && (isCorrect || isSelected) ? "#fff" : colors.text;
            return (
              <Pressable
                key={`${question.id}-${optIdx}`}
                onPress={() => onAnswer(optIdx)}
                disabled={answered}
                style={({ pressed }) => ({
                  backgroundColor: bg,
                  borderColor,
                  borderWidth: 1,
                  borderRadius: 12,
                  paddingVertical: space.sm + space.xs,
                  paddingHorizontal: space.md,
                  opacity: pressed ? 0.92 : 1,
                })}
                accessibilityRole="button"
                accessibilityLabel={`Opción ${optIdx + 1}: ${opt}`}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <Text style={{ color: textColor, fontSize: 16, fontWeight: "700", flex: 1 }}>
                    {opt}
                  </Text>
                  {answered && isCorrect ? (
                    <AppIcon name="checkmark-circle" size="md" color="#fff" />
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
