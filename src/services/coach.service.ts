/**
 * Guía para padres: contenido curado + análisis de patrones de actividad del menor
 * (heurísticas y scoring tipo “ML ligero”, sin modelo externo).
 */
import { ContentCategory } from "@prisma/client";
import { prisma } from "../lib/prisma";

export type CoachArticle = {
  id: string;
  title: string;
  excerpt: string;
  readMinutes: number;
  /** Etiquetas para personalización (pesos). */
  tags: string[];
};

export type CoachVideo = {
  id: string;
  title: string;
  durationMinutes: number;
  psychologist: string;
  /** URL placeholder o recurso externo curado. */
  url: string;
};

export type CoachTip = {
  id: string;
  text: string;
  applicableToday: boolean;
};

export type CoachActivityIdea = {
  childId: string;
  childName: string;
  learnedThisWeek: string;
  activity: string;
  offlineHint: string;
};

export type CoachConversationGuide = {
  id: string;
  topic: string;
  prompts: string[];
};

export type CoachAlert = {
  id: string;
  severity: "info" | "watch" | "early";
  message: string;
  childId?: string;
  childName?: string;
};

export type CoachResource = {
  id: string;
  title: string;
  type: "article" | "video" | "tip";
  reason: string;
  relevanceScore: number;
};

/** Contenido curado (psicología infantil, pedagogía, casos anónimos). */
export const CURATED_ARTICLES: CoachArticle[] = [
  {
    id: "avoid-subjects",
    title: "Por qué tu hijo evita ciertas materias",
    excerpt:
      "La evitación suele estar ligada a miedo al error o a la carga cognitiva. Separar la identidad del resultado ayuda a volver a intentar.",
    readMinutes: 4,
    tags: ["avoidance", "math", "anxiety"],
  },
  {
    id: "effort-praise",
    title: "Elogiar el esfuerzo sin crear presión",
    excerpt:
      "Conectar elogios con estrategias concretas (“viste que repasaste antes del quiz”) refuerza conductas repetibles.",
    readMinutes: 3,
    tags: ["praise", "motivation"],
  },
  {
    id: "screen-balance",
    title: "Pantallas y sueño: límites que funcionan",
    excerpt:
      "Acuerdos claros + transiciones físicas (apagar en otro cuarto) reducen conflictos más que castigos reactivos.",
    readMinutes: 5,
    tags: ["screens", "sleep"],
  },
  {
    id: "anonymous-case-focus",
    title: "Caso de estudio (anónimo): de “no me gusta leer” a 10 min diarios",
    excerpt:
      "Un pedagogo describe cómo acortaron sesiones, eligieron textos de interés real y celebraron micro-logros.",
    readMinutes: 6,
    tags: ["reading", "habits"],
  },
];

export const CURATED_VIDEOS: CoachVideo[] = [
  {
    id: "vid-regulation",
    title: "Autorregulación emocional en niños de 8 a 12 años",
    durationMinutes: 3,
    psychologist: "Dra. Ana M. (infantil)",
    url: "https://example.com/eduplay/coach/regulacion-emocional",
  },
  {
    id: "vid-comparison",
    title: "Cuando comparan a tu hijo con otros",
    durationMinutes: 2,
    psychologist: "Lic. Pedro G. (psicopedagogía)",
    url: "https://example.com/eduplay/coach/comparaciones",
  },
  {
    id: "vid-screens",
    title: "Uso saludable de pantallas en familia",
    durationMinutes: 3,
    psychologist: "Equipo EduPlay · Psicología infantil",
    url: "https://example.com/eduplay/coach/pantallas-saludables",
  },
];

export const CURATED_TIPS: CoachTip[] = [
  {
    id: "tip-2min",
    text: "Hoy: acordá 2 minutos de “solo escuchar” sin dar soluciones cuando cuente algo de la escuela.",
    applicableToday: true,
  },
  {
    id: "tip-choice",
    text: "Ofrecé dos opciones de estudio (“¿10 min de mate o 10 min de lectura primero?”) para recuperar sensación de control.",
    applicableToday: true,
  },
  {
    id: "tip-celebrate",
    text: "Celebrá un intento fallido explícitamente: “me gustó que lo hayas intentado” antes de corregir.",
    applicableToday: true,
  },
];

export const CONVERSATION_GUIDES: CoachConversationGuide[] = [
  {
    id: "failure-effort",
    topic: "Fracaso y esfuerzo",
    prompts: [
      "¿Qué parte se te hizo más difícil? ¿Probaste alguna estrategia distinta?",
      "El error no define quién sos; define qué probamos la próxima vez.",
      "¿Querés que repasemos juntos solo la primera pregunta, sin apuro?",
    ],
  },
  {
    id: "comparison",
    topic: "Comparación con otros niños",
    prompts: [
      "En esta casa medimos progreso respecto a vos mismo, no respecto a otros.",
      "¿Qué te gustaría mejorar para vos, no para ganarle a alguien?",
    ],
  },
  {
    id: "screens",
    topic: "Uso saludable de pantallas",
    prompts: [
      "¿Qué hiciste hoy en la app que te haya gustado? ¿Cuánto tiempo te sentís bien?",
      "Podemos acordar pausas y un cierre suave: ¿te aviso 5 minutos antes?",
    ],
  },
  {
    id: "interests",
    topic: "Intereses emergentes",
    prompts: [
      "Vi que te interesa ___. ¿Querés que busquemos algo relacionado para hacer en persona?",
      "¿Te gustaría mostrarme en 3 minutos lo que aprendiste?",
    ],
  },
];

function weekBounds(): { start: Date; prevStart: Date } {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const dow = (start.getUTCDay() + 6) % 7;
  start.setUTCDate(start.getUTCDate() - dow);
  const prevStart = new Date(start);
  prevStart.setUTCDate(prevStart.getUTCDate() - 7);
  return { start, prevStart };
}

function categoryLabel(cat: ContentCategory | string): string {
  const map: Record<string, string> = {
    math: "matemáticas",
    science: "ciencia",
    astronomy: "astronomía",
    geography: "geografía",
    history: "historia",
    creativity: "creatividad",
    education: "lectura y estudio",
    puzzle: "lógica y puzzles",
    sports: "deporte",
  };
  return map[String(cat)] ?? String(cat);
}

function activityFromCategory(cat: ContentCategory | null): { learned: string; activity: string; hint: string } {
  if (cat === ContentCategory.astronomy) {
    return {
      learned: "el sistema solar y el cielo",
      activity: "Salir a observar estrellas o la Luna con binoculares o a ojo; dibujar lo que vieron.",
      hint: "Elegí un día despejado; 15 min bastan.",
    };
  }
  if (cat === ContentCategory.math) {
    return {
      learned: "números y operaciones",
      activity: "Cocinar juntos midiendo ingredientes con taza y cuchara (fracciones en la vida real).",
      hint: "Dejá que él anote las cantidades en un papel.",
    };
  }
  if (cat === ContentCategory.geography) {
    return {
      learned: "lugares y mapas",
      activity: "Armar un mapa imaginario del barrio con calles y puntos favoritos.",
      hint: "Podés usar stickers o recortes de revistas.",
    };
  }
  if (cat === ContentCategory.history) {
    return {
      learned: "historia y relatos del pasado",
      activity: "Que te cuente una ‘historia familiar’ y anotenla como mini-crónica en 5 frases.",
      hint: "Grabar audio en el celular también vale.",
    };
  }
  if (cat === ContentCategory.creativity) {
    return {
      learned: "creatividad y expresión",
      activity: "Collage con materiales reciclados inspirado en un personaje o tema que le guste en la app.",
      hint: "Sin buscar ‘perfección’ del resultado.",
    };
  }
  if (cat === ContentCategory.science) {
    return {
      learned: "ciencia y experimentos",
      activity: "Experimento simple en casa: agua + sal + huevo o plantar semillas y anotar cambios cada día.",
      hint: "Un cuaderno de ‘científico’ con fechas.",
    };
  }
  return {
    learned: "contenido educativo variado",
    activity: "Paseo corto relacionado con lo último que jugó: contar 10 cosas que observan y clasificarlas.",
    hint: "Conectar juego y mundo real refuerza sentido.",
  };
}

/** Vector simple de “features” por menor para ponderar recursos (ML básico). */
type ChildFeatures = {
  childId: string;
  childName: string;
  gamesThisWeek: number;
  gamesPrevWeek: number;
  xpThisWeek: number;
  xpPrevWeek: number;
  topCategory: ContentCategory | null;
  mathLowStreak: number;
};

async function loadChildFeatures(parentId: string): Promise<ChildFeatures[]> {
  const { start, prevStart } = weekBounds();
  const prevEnd = new Date(start);
  const weekEnd = new Date();
  weekEnd.setUTCHours(23, 59, 59, 999);

  const children = await prisma.user.findMany({
    where: { parentId },
    select: { id: true, realName: true },
  });

  const out: ChildFeatures[] = [];
  for (const c of children) {
    const [gamesThis, gamesPrev, xpThisAgg, xpPrevAgg, topInterest, mathResults] = await Promise.all([
      prisma.gameResult.count({
        where: { userId: c.id, createdAt: { gte: start, lte: weekEnd } },
      }),
      prisma.gameResult.count({
        where: { userId: c.id, createdAt: { gte: prevStart, lt: start } },
      }),
      prisma.xpGainLedger.aggregate({
        where: { userId: c.id, createdAt: { gte: start, lte: weekEnd } },
        _sum: { amount: true },
      }),
      prisma.xpGainLedger.aggregate({
        where: { userId: c.id, createdAt: { gte: prevStart, lt: start } },
        _sum: { amount: true },
      }),
      prisma.userInterest.findFirst({
        where: { userId: c.id },
        orderBy: { score: "desc" },
        select: { category: true },
      }),
      prisma.gameResult.findMany({
        where: { userId: c.id, game: { category: ContentCategory.math } },
        orderBy: { createdAt: "desc" },
        take: 12,
        select: { score: true },
      }),
    ]);

    let streak = 0;
    for (const r of mathResults) {
      if (r.score < 45) streak += 1;
      else break;
    }

    out.push({
      childId: c.id,
      childName: c.realName,
      gamesThisWeek: gamesThis,
      gamesPrevWeek: gamesPrev,
      xpThisWeek: xpThisAgg._sum.amount ?? 0,
      xpPrevWeek: xpPrevAgg._sum.amount ?? 0,
      topCategory: topInterest?.category ?? null,
      mathLowStreak: streak,
    });
  }
  return out;
}

function scoreArticle(article: CoachArticle, f: ChildFeatures): number {
  let s = 1;
  for (const t of article.tags) {
    if (t === "math" && f.topCategory === ContentCategory.math) s += 2;
    if (t === "screens" && f.gamesThisWeek < f.gamesPrevWeek * 0.7) s += 1.5;
    if (t === "anxiety" && f.mathLowStreak >= 3) s += 2;
    if (t === "reading" && f.topCategory === ContentCategory.education) s += 1.2;
  }
  return s;
}

function buildAlerts(features: ChildFeatures[]): CoachAlert[] {
  const alerts: CoachAlert[] = [];
  for (const f of features) {
    if (f.gamesPrevWeek >= 3 && f.gamesThisWeek < Math.max(1, Math.floor(f.gamesPrevWeek * 0.45))) {
      alerts.push({
        id: `play-drop-${f.childId}`,
        severity: "watch",
        message: `Notamos que ${f.childName} juega menos esta semana. ¿Todo bien en casa o en el colegio?`,
        childId: f.childId,
        childName: f.childName,
      });
    }
    if (f.mathLowStreak >= 5) {
      alerts.push({
        id: `math-streak-${f.childId}`,
        severity: "early",
        message: `Ha fallado varias veces seguidas en partidas de matemáticas. ¿Necesita ayuda extra o pausas más cortas?`,
        childId: f.childId,
        childName: f.childName,
      });
    }
    if (f.xpPrevWeek > 80 && f.xpThisWeek < f.xpPrevWeek * 0.35) {
      alerts.push({
        id: `xp-drop-${f.childId}`,
        severity: "watch",
        message: `El ritmo de actividad educativa de ${f.childName} bajó respecto a la semana anterior.`,
        childId: f.childId,
        childName: f.childName,
      });
    }
  }
  if (alerts.length === 0) {
    alerts.push({
      id: "all-good",
      severity: "info",
      message: "No detectamos cambios bruscos preocupantes esta semana. Seguí con el ritmo y revisá el reporte semanal.",
    });
  }
  return alerts;
}

function buildActivities(features: ChildFeatures[]): CoachActivityIdea[] {
  return features.map((f) => {
    const cat = f.topCategory ?? ContentCategory.education;
    const { learned, activity, hint } = activityFromCategory(cat);
    const label = categoryLabel(cat);
    return {
      childId: f.childId,
      childName: f.childName,
      learnedThisWeek: `Esta semana hubo actividad relacionada con ${label} (${learned}).`,
      activity: `Actividad: ${activity}`,
      offlineHint: hint,
    };
  });
}

function buildPersonalizedResources(features: ChildFeatures[]): CoachResource[] {
  const pool: CoachResource[] = [];
  for (const a of CURATED_ARTICLES) {
    const best =
      features.length === 0
        ? { score: 1, name: "" }
        : features.reduce(
            (acc, f) => {
              const sc = scoreArticle(a, f);
              return sc > acc.score ? { score: sc, name: f.childName } : acc;
            },
            { score: 0, name: "" as string }
          );
    pool.push({
      id: `res-${a.id}`,
      title: a.title,
      type: "article",
      reason:
        best.score > 1.5 && best.name
          ? `Relevante según el perfil de ${best.name}.`
          : "Recurso general recomendado.",
      relevanceScore: Math.round(best.score * 10) / 10,
    });
  }
  for (const v of CURATED_VIDEOS) {
    pool.push({
      id: `res-${v.id}`,
      title: v.title,
      type: "video",
      reason: "Contenido breve de especialistas para ver en familia.",
      relevanceScore: 1,
    });
  }
  return pool.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 8);
}

export type ParentCoachPayload = {
  understandingYourChild: {
    articles: CoachArticle[];
    videos: CoachVideo[];
    tips: CoachTip[];
  };
  activitiesTogether: CoachActivityIdea[];
  conversations: CoachConversationGuide[];
  alerts: CoachAlert[];
  personalizedResources: CoachResource[];
  meta: { generatedAt: string; personalizationNote: string };
};

function injectInterestInConversations(
  guides: CoachConversationGuide[],
  interestLabel: string
): CoachConversationGuide[] {
  return guides.map((g) => ({
    ...g,
    prompts: g.prompts.map((p) => p.replace("___", interestLabel)),
  }));
}

export async function buildParentCoachPayload(parentId: string): Promise<ParentCoachPayload> {
  const features = await loadChildFeatures(parentId);
  const rankedArticles = [...CURATED_ARTICLES].sort((a, b) => {
    const sa = features.length ? Math.max(...features.map((f) => scoreArticle(a, f)), 0) : 0;
    const sb = features.length ? Math.max(...features.map((f) => scoreArticle(b, f)), 0) : 0;
    return sb - sa;
  });
  const interestLabel =
    features[0]?.topCategory != null ? categoryLabel(features[0].topCategory) : "un tema que le entusiasma";

  return {
    understandingYourChild: {
      articles: rankedArticles,
      videos: CURATED_VIDEOS,
      tips: CURATED_TIPS,
    },
    activitiesTogether: buildActivities(features),
    conversations: injectInterestInConversations(CONVERSATION_GUIDES, interestLabel),
    alerts: buildAlerts(features),
    personalizedResources: buildPersonalizedResources(features),
    meta: {
      generatedAt: new Date().toISOString(),
      personalizationNote:
        "Sugerencias ordenadas con un modelo ligero de relevancia (intereses, rachas y tendencias semana a semana). No sustituye consejo profesional.",
    },
  };
}
