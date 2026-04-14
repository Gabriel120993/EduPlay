import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_GAME = "eduplay_continue_last_game_v1";
const KEY_CONTENT = "eduplay_continue_last_content_v1";

export type LastGameKind = "quiz" | "visual";

export type LastGamePlayed = {
  kind: LastGameKind;
  category: string;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  /** Texto corto para la tarjeta «Continuar». */
  label: string;
  updatedAt: string;
};

export type LastContentOpened = {
  contentId: string;
  title: string;
  updatedAt: string;
};

export type LastResumeTarget = "game" | "content";

/** Qué retomar si hay juego y contenido: el `updatedAt` más reciente. */
export function pickMostRecentResumeTarget(
  game: LastGamePlayed | null,
  content: LastContentOpened | null
): LastResumeTarget | null {
  if (!game && !content) return null;
  if (!game) return "content";
  if (!content) return "game";
  const g = new Date(game.updatedAt).getTime();
  const c = new Date(content.updatedAt).getTime();
  return g >= c ? "game" : "content";
}

const CATEGORY_LABEL_ES: Record<string, string> = {
  astronomy: "Astronomía",
  math: "Matemáticas",
  science: "Ciencia",
  history: "Historia",
  geography: "Geografía",
  creativity: "Creatividad",
  mixed: "Modo desafío",
};

export function formatQuizResumeLabel(category: string, difficulty: string): string {
  const c = category.trim().toLowerCase();
  const name = CATEGORY_LABEL_ES[c] ?? category;
  if (c === "mixed") return `${name} · ${difficulty}`;
  return `Quiz · ${name} · ${difficulty}`;
}

export function formatVisualResumeLabel(category: string, difficulty: string): string {
  const c = category.trim().toLowerCase();
  const name = CATEGORY_LABEL_ES[c] ?? category;
  return `Juego visual · ${name} · ${difficulty}`;
}

export async function saveLastPlayedGame(
  payload: Omit<LastGamePlayed, "updatedAt">
): Promise<void> {
  try {
    const full: LastGamePlayed = { ...payload, updatedAt: new Date().toISOString() };
    await AsyncStorage.setItem(KEY_GAME, JSON.stringify(full));
  } catch {
    /* best effort */
  }
}

export async function saveLastOpenedContent(payload: { contentId: string; title: string }): Promise<void> {
  try {
    const full: LastContentOpened = { ...payload, updatedAt: new Date().toISOString() };
    await AsyncStorage.setItem(KEY_CONTENT, JSON.stringify(full));
  } catch {
    /* best effort */
  }
}

export async function loadContinueLearning(): Promise<{
  game: LastGamePlayed | null;
  content: LastContentOpened | null;
}> {
  try {
    const [g, c] = await Promise.all([AsyncStorage.getItem(KEY_GAME), AsyncStorage.getItem(KEY_CONTENT)]);
    const game = g ? (JSON.parse(g) as LastGamePlayed) : null;
    const content = c ? (JSON.parse(c) as LastContentOpened) : null;
    if (game && (!game.kind || !game.category || !game.difficulty)) {
      return { game: null, content };
    }
    if (content && (!content.contentId || !content.title)) {
      return { game, content: null };
    }
    return { game, content };
  } catch {
    return { game: null, content: null };
  }
}
