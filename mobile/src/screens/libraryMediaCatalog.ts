/**
 * Catálogo local de la biblioteca multimedia (demo).
 * En producción se reemplaza por respuestas de API / CDN.
 */

export type AgeBand = "5-7" | "8-10" | "11-15";
export type DurationBucket = "corto" | "medio" | "largo";
export type Difficulty = "facil" | "medio" | "avanzado";
export type SubjectTag =
  | "ciencia"
  | "historia"
  | "naturaleza"
  | "cuerpo_humano"
  | "espacio"
  | "tecnologia"
  | "culturas";

export type MiniDocumentary = {
  id: string;
  title: string;
  synopsis: string;
  subject: SubjectTag;
  ageBand: AgeBand;
  durationMin: number;
  durationBucket: DurationBucket;
  difficulty: Difficulty;
  popularityScore: number;
  isNew: boolean;
  hasSubtitles: boolean;
  voiceAgeAppropriate: true;
  thumbnailEmoji: string;
};

export type InteractiveStory = {
  id: string;
  title: string;
  genre: string;
  blurb: string;
  subject: SubjectTag;
  ageBand: AgeBand;
  difficulty: Difficulty;
  pages: number;
  comprehensionEveryPages: 3;
  hasChoosePath: boolean;
  hasDictionaryTap: boolean;
  modes: ("solo" | "audio")[];
  popularityScore: number;
  isNew: boolean;
};

export type HomeExperiment = {
  id: string;
  title: string;
  materialsSummary: string;
  stepsCount: number;
  scienceExplanation: string;
  subject: SubjectTag;
  ageBand: AgeBand;
  difficulty: Difficulty;
  needsParentSupervision: true;
  demoVideoLabel: string;
  galleryNote: string;
};

export type CuriosityCard = {
  id: string;
  category: string;
  fact: string;
  subject: SubjectTag;
  ageBand: AgeBand;
  popularityScore: number;
  isNew: boolean;
};

const SUBJECTS_ROTATION: SubjectTag[] = [
  "cuerpo_humano",
  "ciencia",
  "historia",
  "naturaleza",
  "espacio",
  "tecnologia",
  "culturas",
];

const AGE_ROTATION: AgeBand[] = ["5-7", "8-10", "11-15"];

function durationBucketFromMinutes(m: number): DurationBucket {
  if (m < 5) return "corto";
  if (m <= 15) return "medio";
  return "largo";
}

/** Plantillas alineadas a las temáticas pedidas (se combinan en 52+ episodios). */
const DOC_SEEDS: Array<{ title: string; emoji: string; synopsis: string }> = [
  { title: "¿Cómo funciona el corazón?", emoji: "❤️", synopsis: "Animación del ciclo cardíaco, válvulas y oxígeno." },
  { title: "¿Por qué el cielo es azul?", emoji: "🌤️", synopsis: "Dispersión de la luz y colores del espectro." },
  { title: "La historia de los dinosaurios", emoji: "🦕", synopsis: "Eras geológicas y extinciones explicadas simple." },
  { title: "¿Qué es la fotosíntesis?", emoji: "🌿", synopsis: "Del sol al azúcar: clorofila y oxígeno." },
  { title: "Grandes inventos: la rueda", emoji: "🛞", synopsis: "De Mesopotamia a los transportes modernos." },
  { title: "Grandes inventos: la electricidad", emoji: "⚡", synopsis: "Circuitos, seguridad y energía limpia." },
  { title: "Grandes inventos: internet", emoji: "🌐", synopsis: "Redes, datos y ciudadanía digital." },
  { title: "Culturas del mundo: Egipto", emoji: "🏺", synopsis: "Nilo, jeroglíficos y vida cotidiana." },
  { title: "Culturas del mundo: Roma", emoji: "🏛️", synopsis: "República, imperio y legado." },
  { title: "Culturas del mundo: Aztecas", emoji: "🌽", synopsis: "Chinampas, astronomía y mitología." },
  { title: "Culturas del mundo: Incas", emoji: "⛰️", synopsis: "Caminos, agricultura en terrazas y quipus." },
  { title: "El espacio: agujeros negros", emoji: "🕳️", synopsis: "Gravedad, horizonte de eventos y curiosidades." },
  { title: "El espacio: estrellas", emoji: "✨", synopsis: "Nacimiento, vida y muerte de una estrella." },
  { title: "El espacio: planetas", emoji: "🪐", synopsis: "Sistema solar y mundos rocosos vs gaseosos." },
  { title: "Cuerpo humano: los sentidos", emoji: "👂", synopsis: "Vista, oído, tacto, gusto y olfato." },
  { title: "Cuerpo humano: huesos", emoji: "🦴", synopsis: "Esqueleto, protección y crecimiento." },
  { title: "Cuerpo humano: músculos", emoji: "💪", synopsis: "Contracción, postura y descanso." },
  { title: "Animales: migraciones épicas", emoji: "🦋", synopsis: "Brujulas internas y rutas milenarias." },
  { title: "Animales: camuflaje", emoji: "🦎", synopsis: "Colores, texturas y supervivencia." },
  { title: "Animales: supervivencia extrema", emoji: "🐧", synopsis: "Adaptaciones en desiertos, hielo y océano." },
];

const TARGET_MIN_DOCS = 52;

export const MINI_DOCUMENTARIES: MiniDocumentary[] = Array.from({ length: TARGET_MIN_DOCS }, (_, i) => {
  const seed = DOC_SEEDS[i % DOC_SEEDS.length]!;
  const part = Math.floor(i / DOC_SEEDS.length) + 1;
  const title = part > 1 ? `${seed.title} (ep. ${part})` : seed.title;
  const durationMin = 2 + (i % 4);
  const subject = SUBJECTS_ROTATION[i % SUBJECTS_ROTATION.length]!;
  const ageBand = AGE_ROTATION[i % AGE_ROTATION.length]!;
  const difficulty: Difficulty = i % 3 === 0 ? "facil" : i % 3 === 1 ? "medio" : "avanzado";
  return {
    id: `mini-doc-${i + 1}`,
    title,
    synopsis: seed.synopsis,
    subject,
    ageBand,
    durationMin,
    durationBucket: durationBucketFromMinutes(durationMin),
    difficulty,
    popularityScore: 100 - (i % 40),
    isNew: i < 8,
    hasSubtitles: true,
    voiceAgeAppropriate: true,
    thumbnailEmoji: seed.emoji,
  };
});

export const INTERACTIVE_STORIES: InteractiveStory[] = [
  {
    id: "story-1",
    title: "El mapa del bosque encantado",
    genre: "Aventura y fantasía",
    blurb: "Elegí caminos: cada decisión cambia el final.",
    subject: "naturaleza",
    ageBand: "5-7",
    difficulty: "facil",
    pages: 24,
    comprehensionEveryPages: 3,
    hasChoosePath: true,
    hasDictionaryTap: true,
    modes: ["solo", "audio"],
    popularityScore: 92,
    isNew: true,
  },
  {
    id: "story-2",
    title: "Estación Aurora",
    genre: "Ciencia ficción educativa",
    blurb: "Resolver acertijos de física para abrir compuertas.",
    subject: "ciencia",
    ageBand: "8-10",
    difficulty: "medio",
    pages: 36,
    comprehensionEveryPages: 3,
    hasChoosePath: true,
    hasDictionaryTap: true,
    modes: ["solo", "audio"],
    popularityScore: 88,
    isNew: true,
  },
  {
    id: "story-3",
    title: "La moneda honesta",
    genre: "Valores: honestidad",
    blurb: "Decisiones cotidianas con consecuencias visibles.",
    subject: "historia",
    ageBand: "5-7",
    difficulty: "facil",
    pages: 18,
    comprehensionEveryPages: 3,
    hasChoosePath: true,
    hasDictionaryTap: true,
    modes: ["solo", "audio"],
    popularityScore: 81,
    isNew: false,
  },
  {
    id: "story-4",
    title: "Puente de coraje",
    genre: "Valores: coraje y amistad",
    blurb: "Trabajo en equipo en cada bifurcación.",
    subject: "culturas",
    ageBand: "8-10",
    difficulty: "medio",
    pages: 30,
    comprehensionEveryPages: 3,
    hasChoosePath: true,
    hasDictionaryTap: true,
    modes: ["solo", "audio"],
    popularityScore: 86,
    isNew: false,
  },
  {
    id: "story-5",
    title: "Ada y las máquinas pensantes",
    genre: "Biografía adaptada",
    blurb: "Pionera de la computación: preguntas de comprensión guiadas.",
    subject: "tecnologia",
    ageBand: "11-15",
    difficulty: "avanzado",
    pages: 40,
    comprehensionEveryPages: 3,
    hasChoosePath: false,
    hasDictionaryTap: true,
    modes: ["solo", "audio"],
    popularityScore: 90,
    isNew: true,
  },
  {
    id: "story-6",
    title: "El misterio del hielo que canta",
    genre: "Misterio de ciencia",
    blurb: "Pistas científicas cada tres páginas.",
    subject: "ciencia",
    ageBand: "11-15",
    difficulty: "medio",
    pages: 42,
    comprehensionEveryPages: 3,
    hasChoosePath: true,
    hasDictionaryTap: true,
    modes: ["solo", "audio"],
    popularityScore: 84,
    isNew: false,
  },
];

export const HOME_EXPERIMENTS: HomeExperiment[] = [
  {
    id: "exp-1",
    title: "Nube en un frasco",
    materialsSummary: "Agua caliente, frasco, hielo, aerosol (con adulto).",
    stepsCount: 6,
    scienceExplanation: "Condensación: vapor de agua que se enfría y forma gotitas.",
    subject: "ciencia",
    ageBand: "8-10",
    difficulty: "facil",
    needsParentSupervision: true,
    demoVideoLabel: "Video demo 90 s",
    galleryNote: "Subí tu foto: aparece tras aprobación parental.",
  },
  {
    id: "exp-2",
    title: "Arcoíris casero con CD",
    materialsSummary: "CD viejo, linterna, pared blanca.",
    stepsCount: 4,
    scienceExplanation: "El CD actúa como prisma y separa longitudes de onda.",
    subject: "ciencia",
    ageBand: "5-7",
    difficulty: "facil",
    needsParentSupervision: true,
    demoVideoLabel: "Video demo 2 min",
    galleryNote: "Galería comunitaria moderada.",
  },
  {
    id: "exp-3",
    title: "Imán y limaduras",
    materialsSummary: "Imán, papel, limaduras de hierro (compradas, sin DIY peligroso).",
    stepsCount: 5,
    scienceExplanation: "Líneas de campo magnético visibles.",
    subject: "ciencia",
    ageBand: "11-15",
    difficulty: "medio",
    needsParentSupervision: true,
    demoVideoLabel: "Video demo 3 min",
    galleryNote: "Pedí ayuda a un adulto para manipular imanes fuertes.",
  },
  {
    id: "exp-4",
    title: "Semilleros con rollo de cartón",
    materialsSummary: "Tierra, semillas, rollo, bandeja.",
    stepsCount: 7,
    scienceExplanation: "Germinación, luz y agua.",
    subject: "naturaleza",
    ageBand: "5-7",
    difficulty: "facil",
    needsParentSupervision: true,
    demoVideoLabel: "Video demo 4 min",
    galleryNote: "Compartí tu progreso día a día.",
  },
];

function buildCuriosities(): CuriosityCard[] {
  const lines: Array<{ cat: string; fact: string; subject: SubjectTag }> = [
    { cat: "Cuerpo", fact: "¿Sabías que el corazón late unas 100.000 veces por día?", subject: "cuerpo_humano" },
    { cat: "Cielo", fact: "¿Sabías que el Sol es una estrella de tamaño medio?", subject: "espacio" },
    { cat: "Historia", fact: "¿Sabías que la Gran Muralla no es visible a simple vista desde la Luna?", subject: "historia" },
    { cat: "Animales", fact: "¿Sabías que las abejas bailan para indicar dónde hay néctar?", subject: "naturaleza" },
    { cat: "Océano", fact: "¿Sabías que el planeta es más azul que verde por el agua?", subject: "ciencia" },
    { cat: "Tiempo", fact: "¿Sabías que un año bisiesto ayuda a alinear el calendario con la órbita?", subject: "ciencia" },
    { cat: "Plantas", fact: "¿Sabías que las plantas ‘respiran’ al revés que nosotros de noche?", subject: "naturaleza" },
    { cat: "Espacio", fact: "¿Sabías que un día en Venus es más largo que su año?", subject: "espacio" },
    { cat: "Inventos", fact: "¿Sabías que el GPS usa relojes atómicos corregidos por relatividad?", subject: "tecnologia" },
    { cat: "Cultura", fact: "¿Sabías que muchas constelaciones vienen de mitologías antiguas?", subject: "culturas" },
  ];
  return Array.from({ length: 36 }, (_, i) => {
    const base = lines[i % lines.length]!;
    return {
      id: `fact-${i + 1}`,
      category: base.cat,
      fact: i >= lines.length ? `${base.fact} (dato ${i + 1})` : base.fact,
      subject: base.subject,
      ageBand: AGE_ROTATION[i % 3]!,
      popularityScore: 70 + (i % 25),
      isNew: i < 6,
    };
  });
}

export const CURIOSITY_CARDS: CuriosityCard[] = buildCuriosities();

export const SUBJECT_LABELS: Record<SubjectTag, string> = {
  ciencia: "Ciencia",
  historia: "Historia",
  naturaleza: "Naturaleza",
  cuerpo_humano: "Cuerpo humano",
  espacio: "Espacio",
  tecnologia: "Tecnología",
  culturas: "Culturas",
};
