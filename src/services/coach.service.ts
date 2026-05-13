/**
 * Guía para padres: contenido curado + análisis de patrones de actividad del menor
 * (heurísticas y scoring tipo “ML ligero”, sin modelo externo).
 */
import { ContentCategory, UserType } from "@prisma/client";
import { prisma } from "../lib/prisma";

export type CoachArticle = {
  id: string;
  title: string;
  excerpt: string;
  /** Texto completo para leer en la app (párrafos separados por líneas en blanco). */
  body: string;
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
  /** Si `type === "article"`, coincide con `CoachArticle.id`. */
  curatedArticleId?: string;
  /** Si `type === "video"`, coincide con `CoachVideo.id`. */
  curatedVideoId?: string;
  /** Enlace directo (p. ej. YouTube) cuando aplique. */
  openUrl?: string;
};

/** Contenido curado (orientación práctica familiar; complementa contenidos educativos de la app). */
export const CURATED_ARTICLES: CoachArticle[] = [
  {
    id: "avoid-subjects",
    title: "Por qué tu hijo evita ciertas materias",
    excerpt:
      "La evitación suele estar ligada a miedo al error o a la carga cognitiva. Separar la identidad del resultado ayuda a volver a intentar.",
    body:
      "Cuando un niño o niña dice “odia matemáticas”, muchas veces no está rechazando la materia: está evitando la sensación de quedar mal, de no llegar “a tiempo”, o la vergüenza de equivocarse delante del adulto.\n\n" +
      "Pasos útiles en casa:\n\n" +
      "1. Cambiá el foco del resultado al proceso. Por ejemplo: “hoy voy a mirar cómo pensás”, en lugar de “sacaste bien o mal”.\n\n" +
      "2. Bajá la carga al principio (2–5 minutos) y sumá tiempo solo cuando vuelva el interés.\n\n" +
      "3. Normalizá el error como dato (“equivocarse muestra qué falta revisar”).\n\n" +
      "4. Separá descanso y estudio en lugares distintos (micro-rutinas ayudan al cerebro).\n\n" +
      "En EduPlay, podés acompañar con sesiones cortas y celebrar intentos. Si la evitación es intensa o prolongada, conviene consultar con la escuela o un/a profesional.",
    readMinutes: 4,
    tags: ["avoidance", "math", "anxiety"],
  },
  {
    id: "effort-praise",
    title: "Elogiar el esfuerzo sin crear presión",
    excerpt:
      "Conectar elogios con estrategias concretas (“viste que repasaste antes del quiz”) refuerza conductas repetibles.",
    body:
      "El elogio más potente es el específico: describe la conducta que querés que se repita.\n\n" +
      "Ejemplos que funcionan:\n\n" +
      "• “Me gustó que volviste a leer la consigna antes de responder: eso te ahorró un error.”\n\n" +
      "• “Noté que te quedaste un minuto más cuando estaba difícil: eso es perseverancia.”\n\n" +
      "Evitá elogios globales (“sos un genio”) ligados solo al resultado: suelen generar miedo a decepcionar.\n\n" +
      "Combiná reconocimiento + siguiente paso pequeño: “bien hecho; mañana probamos una pregunta más”.\n\n" +
      "Así el esfuerzo se vuelve hábito, no “prueba de valía”.",
    readMinutes: 3,
    tags: ["praise", "motivation"],
  },
  {
    id: "screen-balance",
    title: "Pantallas y sueño: límites que funcionan",
    excerpt:
      "Acuerdos claros + transiciones físicas (apagar en otro cuarto) reducen conflictos más que castigos reactivos.",
    body:
      "Las pantallas no son “malas”: el problema suele ser el momento, la duración y la falta de cierre.\n\n" +
      "Acuerdos que suelen funcionar:\n\n" +
      "• Regla simple y visible (p. ej. “nada de pantallas 45 min antes de dormir”).\n\n" +
      "• Aviso de transición (“quedan 5 minutos”) y ritual de cierre (guardar el dispositivo fuera del cuarto).\n\n" +
      "• Priorizar sueño y desayuno antes que “terminar un nivel” (ayuda a prevenir peleas).\n\n" +
      "• Coherencia entre adultos: si hoy se flexibiliza, se explica el motivo (“es feriado”) para no confundir.\n\n" +
      "En EduPlay podés combinar bloques cortos con pausas reales. Si hay peleas diarias, probá bajar 10 minutos el límite y subir calidad (acompañamiento, charla breve después).",
    readMinutes: 5,
    tags: ["screens", "sleep"],
  },
  {
    id: "anonymous-case-focus",
    title: "Caso de estudio (anónimo): de “no me gusta leer” a 10 min diarios",
    excerpt:
      "Un pedagogo describe cómo acortaron sesiones, eligieron textos de interés real y celebraron micro-logros.",
    body:
      "Una familia llegó con un patrón común: lectura asociada a deberes largos, correcciones inmediatas y comparaciones con un hermano.\n\n" +
      "Qué cambiaron (en 3 semanas):\n\n" +
      "1. Meta mínima: 10 minutos, siempre al mismo horario, con luz agradable.\n\n" +
      "2. Elección real: el niño eligió temas (ciencia ficción, animales) aunque no fueran “libros escolares”.\n\n" +
      "3. Regla de oro: primero disfrutar; la corrección ortográfica, una vez por semana y en 2 frases.\n\n" +
      "4. Micro-celebración: stickers en un calendario o foto del “rincón de lectura”.\n\n" +
      "El aprendizaje no fue lineal: hubo días flojos. La clave fue no convertir el fallo en veredicto (“no servís”), sino en plan (“mañana lo intentamos más temprano”).\n\n" +
      "En la app, podés apoyar con lecturas cortas y quizzes livianos; el objetivo es constancia, no perfección.",
    readMinutes: 6,
    tags: ["reading", "habits"],
  },
];

/** Recursos en video (enlaces públicos; abren en el navegador del dispositivo). */
export const CURATED_VIDEOS: CoachVideo[] = [
  {
    id: "vid-regulation",
    title: "Crianza con conciencia positiva (introducción breve)",
    durationMinutes: 4,
    psychologist: "UNICEF · referencia abierta (YouTube)",
    url: "https://www.youtube.com/watch?v=j3Uf7hgq84g",
  },
  {
    id: "vid-comparison",
    title: "Crianza positiva y entornos sin violencia",
    durationMinutes: 4,
    psychologist: "UNICEF · referencia abierta (YouTube)",
    url: "https://www.youtube.com/watch?v=xlgQIc57TP8",
  },
  {
    id: "vid-screens",
    title: "Pantallas y sueño: ideas para conversar en familia",
    durationMinutes: 6,
    psychologist: "Contenido educativo en español · YouTube",
    url: "https://www.youtube.com/watch?v=n8Fwezsv4Gg",
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

/** Si aún no hay menores vinculados o no hay señales de actividad, igual mostramos propuestas concretas. */
const DEFAULT_ACTIVITIES_TOGETHER: CoachActivityIdea[] = [
  {
    childId: "__default_family",
    childName: "Tu familia",
    learnedThisWeek:
      "Mientras la app aprende del uso del menor, podés empezar con rutinas cortas que refuerzan curiosidad y vínculo.",
    activity:
      "Actividad: “museo en casa” — elegir 5 objetos con historia (una foto, un juguete viejo, un mapa) y que cada uno cuente 1 minuto qué recuerda.",
    offlineHint: "Sin pantallas durante la actividad; después podés buscar en EduPlay un tema relacionado.",
  },
  {
    childId: "__default_walk",
    childName: "Tu familia",
    learnedThisWeek: "Conectar el aprendizaje en pantalla con el mundo real mejora retención y motivación.",
    activity:
      "Actividad: caminata de 12 minutos contando “3 cosas redondas, 3 azules, 3 que vuelan (aunque sea en la imaginación)”.",
    offlineHint: "Al volver, elegir un quiz corto en la app sobre observación o categorías.",
  },
  {
    childId: "__default_cook",
    childName: "Tu familia",
    learnedThisWeek: "Las matemáticas ganan sentido cuando miden y comparan con objetos reales.",
    activity:
      "Actividad: merienda medida — armar una receta simple y que el menor anote cantidades (mitad, doble) con ayuda.",
    offlineHint: "Si la frustración aparece, bajá el objetivo: solo medir 2 ingredientes ya está bien.",
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
  const weekEnd = new Date();
  weekEnd.setUTCHours(23, 59, 59, 999);

  const children = await prisma.user.findMany({
    where: { parentId, type: UserType.minor },
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
      curatedArticleId: a.id,
    });
  }
  for (const v of CURATED_VIDEOS) {
    pool.push({
      id: `res-${v.id}`,
      title: v.title,
      type: "video",
      reason: "Video breve para ver juntos (se abre en el navegador).",
      relevanceScore: 1,
      curatedVideoId: v.id,
      openUrl: v.url,
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
    activitiesTogether: features.length > 0 ? buildActivities(features) : DEFAULT_ACTIVITIES_TOGETHER,
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
