import {
  ContentCategory,
  Difficulty,
  MissionType,
  QuizKnowledgeArea,
} from "@prisma/client";

export const BULK_ROOT_CATEGORY_SLUG = "eduplay-catalogo-masivo";

export type BulkQuizQuestion = {
  text: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
};

export type BulkQuizChunk = {
  title: string;
  description: string;
  topicSlug: string;
  knowledgeArea: QuizKnowledgeArea;
  legacyCategory: ContentCategory;
  difficulty: Difficulty;
  questions: BulkQuizQuestion[];
};

export type Mulberry32 = () => number;

export function mulberry32(seed: number): Mulberry32 {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rng: Mulberry32): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

function makeMcq(
  text: string,
  correct: string,
  distractors: string[],
  explanation: string,
  rng: Mulberry32,
): BulkQuizQuestion {
  const opts = shuffle([correct, ...distractors.filter((d) => d !== correct)], rng).slice(0, 4);
  if (!opts.includes(correct)) opts[0] = correct;
  return { text, options: shuffle(opts, rng), correctAnswer: correct, explanation };
}

const PLANET_ORDER = ["Mercurio", "Venus", "Tierra", "Marte", "Júpiter", "Saturno", "Urano", "Neptuno"];

const CAPITALS: [string, string][] = [
  ["Argentina", "Buenos Aires"],
  ["México", "Ciudad de México"],
  ["Colombia", "Bogotá"],
  ["Chile", "Santiago"],
  ["Perú", "Lima"],
  ["Brasil", "Brasilia"],
  ["España", "Madrid"],
  ["Francia", "París"],
  ["Italia", "Roma"],
  ["Reino Unido", "Londres"],
  ["Estados Unidos", "Washington D.C."],
  ["Japón", "Tokio"],
  ["China", "Pekín"],
  ["India", "Nueva Delhi"],
  ["Australia", "Canberra"],
  ["Egipto", "El Cairo"],
  ["Canadá", "Ottawa"],
  ["Alemania", "Berlín"],
  ["Portugal", "Lisboa"],
  ["Grecia", "Atenas"],
];

const HISTORY_FACTS: { q: string; a: string; d: string[]; ex: string }[] = [
  {
    q: "¿En qué año llegó Cristóbal Colón a América?",
    a: "1492",
    d: ["1490", "1500", "1510"],
    ex: "La llegada se asocia al 12 de octubre de 1492.",
  },
  {
    q: "¿Qué faraón encargó la Gran Piramide de Guiza más grande (Keops)?",
    a: "Keops",
    d: ["Ramsés II", "Tutankamón", "Cleopatra"],
    ex: "La Gran Pirámide de Keops es la más grande del complejo de Guiza.",
  },
  {
    q: "¿En qué fecha se declara la independencia de Argentina?",
    a: "9 de julio de 1816",
    d: ["25 de mayo de 1810", "9 de julio de 1810", "20 de junio de 1817"],
    ex: "El 9 de julio de 1816 se declaró la independencia en Tucumán.",
  },
  {
    q: "¿Quién dio el Grito de Dolores en México (1810)?",
    a: "Miguel Hidalgo",
    d: ["Morelos", "Iturbide", "Juárez"],
    ex: "Miguel Hidalgo inició el movimiento el 16 de septiembre de 1810.",
  },
  {
    q: "¿Cómo se llamaban las tres carabelas más conocidas del primer viaje de Colón?",
    a: "Niña, Pinta y Santa María",
    d: ["Victoria, Trinidad y San Antonio", "Mayflower, Susan, Dove", "Endeavour, Discovery, Adventure"],
    ex: "Niña, Pinta y Santa María son los nombres tradicionales en los textos escolares.",
  },
];

const GRAMMAR_MCQ: { q: string; a: string; d: string[]; ex: string }[] = [
  {
    q: "¿Cuál de estas palabras es un sustantivo propio?",
    a: "México",
    d: ["ciudad", "país", "bandera"],
    ex: "Los nombres propios escriben con mayúscula inicial.",
  },
  {
    q: "En la frase 'Las galletas crujientes', ¿qué es 'crujientes'?",
    a: "Un adjetivo",
    d: ["Un verbo", "Un adverbio", "Un artículo"],
    ex: "Describe a las galletas, así que califica al sustantivo.",
  },
  {
    q: "¿Cuál es el plural de 'avión'?",
    a: "aviones",
    d: ["aviónes", "avionas", "avionis"],
    ex: "Palabras en -n suelen formar plural en -es.",
  },
];

const ART_MCQ: { q: string; a: string; d: string[]; ex: string }[] = [
  {
    q: "¿En qué museo se exhibe la Mona Lisa?",
    a: "Louvre (París)",
    d: ["Prado", "Met de Nueva York", "British Museum"],
    ex: "La pintura está en el museo del Louvre.",
  },
  {
    q: "¿Qué mezcla de colores primarios da verde?",
    a: "Azul + amarillo",
    d: ["Rojo + azul", "Rojo + amarillo", "Azul + blanco"],
    ex: "El azul con el amarillo produce verde.",
  },
  {
    q: "¿Quién compuso 'Las cuatro estaciones'?",
    a: "Antonio Vivaldi",
    d: ["Mozart", "Beethoven", "Chopin"],
    ex: "Vivaldi compuso el ciclo de conciertos 'Las cuatro estaciones'.",
  },
];

const BIOLOGY_MCQ: { q: string; a: string; d: string[]; ex: string }[] = [
  {
    q: "¿Qué órgano bombea la sangre por el cuerpo?",
    a: "El corazón",
    d: ["Los pulmones", "El hígado", "El cerebro"],
    ex: "El corazón impulsa la circulación.",
  },
  {
    q: "¿Qué gas respiramos del aire para vivir?",
    a: "Oxígeno",
    d: ["Dióxido de carbono", "Nitrógeno puro", "Hidrógeno"],
    ex: "Los pulmones intercambian oxígeno.",
  },
  {
    q: "¿Qué tipo de animal es un delfín?",
    a: "Mamífero",
    d: ["Pez", "Reptil", "Anfibio"],
    ex: "Los delfines amamantan a sus crías; son mamíferos acuáticos.",
  },
];

const LOGIC_PUZZLES: { q: string; a: string; d: string[]; ex: string }[] = [
  {
    q: "En la serie 2, 4, 8, 16… ¿qué número sigue?",
    a: "32",
    d: ["24", "30", "20"],
    ex: "Cada paso multiplica por 2.",
  },
  {
    q: "Si todos los pájaros vuelan y Pipo es un pájaro, entonces…",
    a: "Pipo vuela",
    d: ["Pipo nada", "Pipo no es pájaro", "No se puede saber"],
    ex: "Deducción directa del enunciado.",
  },
  {
    q: "¿Qué número sigue: 1, 1, 2, 3, 5, 8, ___(Fibonacci)?",
    a: "13",
    d: ["11", "12", "10"],
    ex: "5 + 8 = 13.",
  },
];

const EMOTION_MCQ: { q: string; a: string; d: string[]; ex: string }[] = [
  {
    q: "Si un amigo se cayó y se lastimó, una respuesta empática es…",
    a: "Preguntarle si está bien y ofrecer ayuda",
    d: ["Reírse", "Ignorarlo", "Culparlo"],
    ex: "La empatía se muestra con cuidado y respeto.",
  },
  {
    q: "¿Cuál es una forma sana de calmar la rabia?",
    a: "Respirar hondo y contar hasta diez",
    d: ["Gritar a alguien", "Romper cosas", "Guardar todo sin hablar siempre"],
    ex: "Pausar y respirar ayuda a regular emociones.",
  },
];

function takeRotated<T>(arr: readonly T[], i: number): T {
  return arr[i % arr.length]!;
}

function generateMathArithmetic(rng: Mulberry32, count: number, topicSlug: string): BulkQuizChunk[] {
  const chunks: BulkQuizChunk[] = [];
  let buffer: BulkQuizQuestion[] = [];
  const flush = () => {
    if (buffer.length === 0) return;
    chunks.push({
      title: `Aritmética básica ${chunks.length + 1}`,
      description: "Sumas, restas y multiplicación con números verificables.",
      topicSlug,
      knowledgeArea: QuizKnowledgeArea.mathematics,
      legacyCategory: ContentCategory.math,
      difficulty: Difficulty.EASY,
      questions: buffer,
    });
    buffer = [];
  };

  for (let i = 0; i < count; i++) {
    const kind = i % 3;
    if (kind === 0) {
      const a = 10 + Math.floor(rng() * 120);
      const b = 10 + Math.floor(rng() * 120);
      const correct = String(a + b);
      buffer.push(
        makeMcq(
          `¿Cuánto es ${a} + ${b}?`,
          correct,
          [String(a + b + 5), String(Math.max(0, a + b - 7)), String(a + b + 12)],
          `${a} + ${b} = ${a + b}.`,
          rng,
        ),
      );
    } else if (kind === 1) {
      const a = 50 + Math.floor(rng() * 200);
      const b = 5 + Math.floor(rng() * 35);
      const correct = String(a - b);
      buffer.push(
        makeMcq(
          `¿Cuánto es ${a} − ${b}?`,
          correct,
          [String(a - b + 4), String(Math.max(0, a - b - 6)), String(a + b)],
          `${a} − ${b} = ${a - b}.`,
          rng,
        ),
      );
    } else {
      const n = 2 + Math.floor(rng() * 11);
      const m = 2 + Math.floor(rng() * 11);
      const prod = n * m;
      buffer.push(
        makeMcq(
          `¿Cuánto es ${n} × ${m}?`,
          String(prod),
          [String(prod + n), String(Math.max(0, prod - m)), String(prod + 7)],
          `${n} × ${m} = ${prod}.`,
          rng,
        ),
      );
    }
    if (buffer.length >= 10) flush();
  }
  flush();
  return chunks;
}

function generateMathDivisionAndMoneyTime(rng: Mulberry32, count: number, topicSlug: string): BulkQuizChunk[] {
  const chunks: BulkQuizChunk[] = [];
  let buffer: BulkQuizQuestion[] = [];
  const flush = () => {
    if (buffer.length === 0) return;
    chunks.push({
      title: `Divisiones y tiempo ${chunks.length + 1}`,
      description: "Divisiones exactas y lectura de reloj simple.",
      topicSlug,
      knowledgeArea: QuizKnowledgeArea.mathematics,
      legacyCategory: ContentCategory.math,
      difficulty: Difficulty.MEDIUM,
      questions: buffer,
    });
    buffer = [];
  };

  for (let i = 0; i < count; i++) {
    if (i % 2 === 0) {
      const divisor = 2 + Math.floor(rng() * 9);
      const quotient = 3 + Math.floor(rng() * 12);
      const dividend = divisor * quotient;
      buffer.push(
        makeMcq(
          `¿Cuánto es ${dividend} ÷ ${divisor}?`,
          String(quotient),
          [String(quotient + 1), String(Math.max(0, quotient - 2)), String(quotient + 3)],
          `${divisor} × ${quotient} = ${dividend}, entonces ${dividend} ÷ ${divisor} = ${quotient}.`,
          rng,
        ),
      );
    } else {
      const hour = 1 + Math.floor(rng() * 11);
      const extra = [15, 30, 0][Math.floor(rng() * 3)]!;
      const label =
        extra === 0
          ? `si el minutero apunta al 12 y el horario al ${hour}`
          : extra === 30
            ? `si son las ${hour}:30`
            : `si son las ${hour}:15`;
      const correct =
        extra === 0 ? `${hour}:00` : extra === 30 ? `${hour}:30` : `${hour}:15`;
      buffer.push(
        makeMcq(
          `¿Cómo se lee un reloj ${label}?`,
          correct,
          [`${hour + 1}:00`, `${hour}:45`, `${Math.max(1, hour - 1)}:30`],
          `El horario indica la hora y el minutero los minutos.`,
          rng,
        ),
      );
    }
    if (buffer.length >= 10) flush();
  }
  flush();
  return chunks;
}

function generateGeometry(rng: Mulberry32, count: number, topicSlug: string): BulkQuizChunk[] {
  const chunks: BulkQuizChunk[] = [];
  let buffer: BulkQuizQuestion[] = [];
  const flush = () => {
    if (buffer.length === 0) return;
    chunks.push({
      title: `Geometría básica ${chunks.length + 1}`,
      description: "Perímetros y áreas simples.",
      topicSlug,
      knowledgeArea: QuizKnowledgeArea.mathematics,
      legacyCategory: ContentCategory.math,
      difficulty: Difficulty.MEDIUM,
      questions: buffer,
    });
    buffer = [];
  };

  for (let i = 0; i < count; i++) {
    if (i % 2 === 0) {
      const side = 3 + Math.floor(rng() * 8);
      const per = 4 * side;
      buffer.push(
        makeMcq(
          `¿Cuál es el perímetro de un cuadrado de lado ${side} cm?`,
          `${per} cm`,
          [`${per + 4} cm`, `${Math.max(0, per - side)} cm`, `${side * side} cm`],
          `Perímetro = 4 × lado = 4 × ${side} = ${per}.`,
          rng,
        ),
      );
    } else {
      const w = 4 + Math.floor(rng() * 6);
      const h = 3 + Math.floor(rng() * 6);
      const area = w * h;
      buffer.push(
        makeMcq(
          `¿Cuál es el área de un rectángulo de ${w} cm × ${h} cm?`,
          `${area} cm²`,
          [`${area + w} cm²`, `${2 * w + 2 * h} cm²`, `${w + h} cm²`],
          `Área = base × altura = ${w} × ${h} = ${area}.`,
          rng,
        ),
      );
    }
    if (buffer.length >= 10) flush();
  }
  flush();
  return chunks;
}

function chunksFromBank(
  rng: Mulberry32,
  bank: { q: string; a: string; d: string[]; ex: string }[],
  count: number,
  prefixTitle: string,
  topicSlug: string,
  knowledgeArea: QuizKnowledgeArea,
  legacyCategory: ContentCategory,
  difficulty: Difficulty,
): BulkQuizChunk[] {
  const chunks: BulkQuizChunk[] = [];
  let buffer: BulkQuizQuestion[] = [];
  const flush = (idx: number) => {
    if (buffer.length === 0) return;
    chunks.push({
      title: `${prefixTitle} ${idx}`,
      description: "Preguntas curadas y verificables.",
      topicSlug,
      knowledgeArea,
      legacyCategory,
      difficulty,
      questions: buffer,
    });
    buffer = [];
  };
  let chunkIndex = 1;
  for (let i = 0; i < count; i++) {
    const row = takeRotated(bank, i);
    buffer.push(makeMcq(row.q, row.a, row.d, row.ex, rng));
    if (buffer.length >= 10) flush(chunkIndex++);
  }
  flush(chunkIndex);
  return chunks;
}

function generateSolarSystem(rng: Mulberry32, count: number, topicSlug: string): BulkQuizChunk[] {
  const bank: { q: string; a: string; d: string[]; ex: string }[] = [
    {
      q: "¿Cuántos planetas principales tiene el sistema solar?",
      a: "8",
      d: ["7", "9", "10"],
      ex: "Hay ocho planetas desde Mercurio hasta Neptuno.",
    },
    {
      q: "¿Qué astro es una estrella?",
      a: "El Sol",
      d: ["La Luna", "La Tierra", "Júpiter"],
      ex: "El Sol produce luz por fusión; es una estrella.",
    },
    {
      q: "¿Cuál es el planeta más grande?",
      a: "Júpiter",
      d: ["Saturno", "Neptuno", "Tierra"],
      ex: "Júpiter es el más masivo del sistema.",
    },
    {
      q: "¿En qué orden va la Tierra desde el Sol?",
      a: "Tercer planeta",
      d: ["Segundo", "Cuarto", "Quinto"],
      ex: "Mercurio (1), Venus (2), Tierra (3), Marte (4)...",
    },
    ...PLANET_ORDER.map((planet, idx) => ({
      q: `¿Qué planeta ocupa la posición ${idx + 1} desde el Sol?`,
      a: planet,
      d: shuffle([...PLANET_ORDER.filter((p) => p !== planet)], rng).slice(0, 3),
      ex: `El orden es: ${PLANET_ORDER.join(", ")}.`,
    })),
  ];
  return chunksFromBank(rng, bank, count, "Sistema solar", topicSlug, QuizKnowledgeArea.natural_sciences, ContentCategory.astronomy, Difficulty.EASY);
}

function generateStatesOfMatter(rng: Mulberry32, count: number, topicSlug: string): BulkQuizChunk[] {
  const facts = [
    {
      q: "¿En qué estado está el hielo a temperatura ambiente típica?",
      a: "Sólido",
      d: ["Líquido", "Gas", "Plasma"],
      ex: "El hielo es agua en estado sólido.",
    },
    {
      q: "¿Cómo se llama el paso de líquido a gas por calor en la superficie?",
      a: "Evaporación",
      d: ["Condensación", "Fusión", "Solidificación"],
      ex: "La evaporación pasa de líquido a gas.",
    },
    {
      q: "¿Qué estado tiene forma y volumen propios en un bloque rígido?",
      a: "Sólido",
      d: ["Líquido", "Gas", "Todo lo anterior"],
      ex: "Un sólido mantiene forma rígida.",
    },
  ];
  return chunksFromBank(rng, facts, count, "Estados de la materia", topicSlug, QuizKnowledgeArea.natural_sciences, ContentCategory.science, Difficulty.EASY);
}

function generateGeography(rng: Mulberry32, count: number, topicSlug: string): BulkQuizChunk[] {
  const bank: { q: string; a: string; d: string[]; ex: string }[] = CAPITALS.map(([country, capital]) => ({
    q: `¿Cuál es la capital de ${country}?`,
    a: capital,
    d: shuffle(
      CAPITALS.filter((c) => c[0] !== country).map((c) => c[1]),
      rng,
    ).slice(0, 3),
    ex: `La capital de ${country} es ${capital}.`,
  }));
  bank.push({
    q: "¿Cuál es el río más largo del mundo (medición común en textos escolares)?",
    a: "El Nilo",
    d: ["Amazonas", "Yangtsé", "Misisipi"],
    ex: "En muchos libros se cita al Nilo como el más largo (~6.650 km).",
  });
  bank.push({
    q: "¿Cuál es la montaña más alta sobre el nivel del mar?",
    a: "Everest",
    d: ["Aconcagua", "K2", "Kilimanjaro"],
    ex: "El Everest supera los 8.800 m sobre el nivel del mar.",
  });
  return chunksFromBank(rng, bank, count, "Geografía", topicSlug, QuizKnowledgeArea.social_sciences, ContentCategory.geography, Difficulty.MEDIUM);
}

function generateHistory(rng: Mulberry32, count: number, topicSlug: string): BulkQuizChunk[] {
  const extra = [
    {
      q: "¿Quién escribió *Don Quijote de la Mancha*?",
      a: "Miguel de Cervantes",
      d: ["Lope de Vega", "García Lorca", "Borges"],
      ex: "Cervantes publicó la novela en dos partes (1605 y 1615).",
    },
    {
      q: "¿En qué siglo inventó Gutenberg la imprenta de tipos móviles (aprox.)?",
      a: "Siglo XV",
      d: ["Siglo XIV", "Siglo XVI", "Siglo XIII"],
      ex: "La imprenta de tipos móviles se asocia al siglo XV.",
    },
  ];
  const bank = [...HISTORY_FACTS, ...extra];
  return chunksFromBank(rng, bank, count, "Historia", topicSlug, QuizKnowledgeArea.social_sciences, ContentCategory.history, Difficulty.MEDIUM);
}

function generateLanguage(rng: Mulberry32, count: number, topicSlug: string): BulkQuizChunk[] {
  const extra = [
    {
      q: "¿Cuál es un sinónimo de 'feliz'?",
      a: "Contento",
      d: ["Enfadado", "Triste", "Serio"],
      ex: "Contento y alegre son sinónimos de feliz en muchos contextos.",
    },
    {
      q: "¿Qué palabra es antónimo de 'grande'?",
      a: "Pequeño",
      d: ["Alto", "Ancho", "Largo"],
      ex: "Pequeño es lo opuesto a grande.",
    },
  ];
  const bank = [...GRAMMAR_MCQ, ...extra];
  return chunksFromBank(rng, bank, count, "Lenguaje y lectura", topicSlug, QuizKnowledgeArea.language, ContentCategory.education, Difficulty.EASY);
}

function generateArt(rng: Mulberry32, count: number, topicSlug: string): BulkQuizChunk[] {
  const bank = [
    ...ART_MCQ,
    {
      q: "¿Qué pintor cortó su oreja en un episodio muy difundido (leyenda popular/cultura general)?",
      a: "Vincent van Gogh",
      d: ["Picasso", "Dalí", "Monet"],
      ex: "Van Gogh es la figura asociada popularmente a ese episodio.",
    },
  ];
  return chunksFromBank(rng, bank, count, "Arte y cultura", topicSlug, QuizKnowledgeArea.art_culture, ContentCategory.creativity, Difficulty.EASY);
}

function generateLogic(rng: Mulberry32, count: number, topicSlug: string): BulkQuizChunk[] {
  const bank = [...LOGIC_PUZZLES];
  return chunksFromBank(rng, bank, count, "Lógica", topicSlug, QuizKnowledgeArea.logic_thinking, ContentCategory.puzzle, Difficulty.MEDIUM);
}

function generateEmotions(rng: Mulberry32, count: number, topicSlug: string): BulkQuizChunk[] {
  return chunksFromBank(
    rng,
    EMOTION_MCQ,
    count,
    "Emociones y valores",
    topicSlug,
    QuizKnowledgeArea.emotions_values,
    ContentCategory.education,
    Difficulty.EASY,
  );
}

function generateMoneyProblems(rng: Mulberry32, count: number, topicSlug: string): BulkQuizChunk[] {
  const currencies = ["pesos argentinos", "pesos mexicanos", "euros"] as const;
  const chunks: BulkQuizChunk[] = [];
  let buffer: BulkQuizQuestion[] = [];
  const flush = () => {
    if (buffer.length === 0) return;
    chunks.push({
      title: `Dinero cotidiano ${chunks.length + 1}`,
      description: "Suma simple de billetes y monedas en contexto.",
      topicSlug,
      knowledgeArea: QuizKnowledgeArea.mathematics,
      legacyCategory: ContentCategory.math,
      difficulty: Difficulty.EASY,
      questions: buffer,
    });
    buffer = [];
  };

  for (let i = 0; i < count; i++) {
    const cur = currencies[i % currencies.length]!;
    const a = 20 + Math.floor(rng() * 120);
    const b = 5 + Math.floor(rng() * 80);
    const correct = String(a + b);
    buffer.push(
      makeMcq(
        `Tenés ${a} ${cur} y recibís ${b} ${cur} de regalo. ¿Cuánto tienes en total?`,
        correct,
        [...[a + b + 10, Math.max(0, a + b - 15), a + b + 3].map(String)],
        `Total = ${a} + ${b} = ${a + b} ${cur}.`,
        rng,
      ),
    );
    if (buffer.length >= 10) flush();
  }
  flush();
  return chunks;
}

export const BULK_EDUCATIONAL_TREE = {
  slug: BULK_ROOT_CATEGORY_SLUG,
  name: "Catálogo educativo extendido (semilla masiva)",
  icon: "📚",
  subjects: [
    {
      slug: "matematicas-masivas",
      name: "Matemáticas",
      topics: [
        ["m-aritmetica", "Aritmética y tablas", "Operaciones básicas y memorización."],
        ["m-division-tiempo", "División y medición del tiempo", "Reparto equitativo y lectura horaria."],
        ["m-geometria", "Geometría básica", "Figuras, perímetro y área."],
        ["m-dinero", "Problemas con dinero", "Suma de cantidades en distintas monedas."],
      ],
    },
    {
      slug: "ciencias-naturales-masivas",
      name: "Ciencias naturales",
      topics: [
        ["n-sistema-solar", "Sistema solar", "Planetas y conceptos astronómicos básicos."],
        ["n-cuerpo-ecosistemas", "Cuerpo humano y clasificación", "Órganos, hábitats y cadenas simples."],
        ["n-materia-agua", "Materia y ciclo del agua", "Estados, cambios y recorrido del agua."],
      ],
    },
    {
      slug: "ciencias-sociales-masivas",
      name: "Ciencias sociales",
      topics: [
        ["s-historia", "Historia general", "Hitos verificables y civilizaciones."],
        ["s-geografia", "Geografía humana", "Capitales, accidentes y curiosidades geográficas."],
      ],
    },
    {
      slug: "lenguaje-masivas",
      name: "Lenguaje",
      topics: [["l-gramatica-vocabulario", "Gramática y vocabulario", "Clases de palabras y relaciones de significado."]],
    },
    {
      slug: "arte-cultura-masivas",
      name: "Arte y cultura",
      topics: [["a-arte-musica", "Arte y música", "Color, obras y músicas famosas."]],
    },
    {
      slug: "logica-masivas",
      name: "Pensamiento lógico",
      topics: [["p-acertijos", "Acertijos", "Patrones, series y deducción."]],
    },
    {
      slug: "emociones-valores-masivas",
      name: "Emociones y valores",
      topics: [["e-bienestar", "Bienestar emocional", "Empatía y regulación sencilla."]],
    },
  ],
} as const;

export function buildAllBulkQuizChunks(seed = 0xedb1ca1): BulkQuizChunk[] {
  const rng = mulberry32(seed);
  const chunks: BulkQuizChunk[] = [];
  chunks.push(...generateMathArithmetic(rng, 90, "m-aritmetica"));
  chunks.push(...generateMoneyProblems(rng, 30, "m-dinero"));
  chunks.push(...generateMathDivisionAndMoneyTime(rng, 40, "m-division-tiempo"));
  chunks.push(...generateGeometry(rng, 40, "m-geometria"));
  chunks.push(...generateSolarSystem(rng, 90, "n-sistema-solar"));
  chunks.push(
    ...chunksFromBank(
      rng,
      BIOLOGY_MCQ,
      70,
      "Vida y cuerpo",
      "n-cuerpo-ecosistemas",
      QuizKnowledgeArea.natural_sciences,
      ContentCategory.science,
      Difficulty.EASY,
    ),
  );
  chunks.push(...generateStatesOfMatter(rng, 40, "n-materia-agua"));
  chunks.push(...generateHistory(rng, 75, "s-historia"));
  chunks.push(...generateGeography(rng, 75, "s-geografia"));
  chunks.push(...generateLanguage(rng, 150, "l-gramatica-vocabulario"));
  chunks.push(...generateArt(rng, 100, "a-arte-musica"));
  chunks.push(...generateLogic(rng, 100, "p-acertijos"));
  chunks.push(...generateEmotions(rng, 100, "e-bienestar"));
  return chunks;
}

export const BULK_THEMATIC_MISSIONS: {
  slug: string;
  title: string;
  theme: string;
  narrative: string;
  reward: string;
  stepCount: number;
}[] = [
  {
    slug: "mision-mate-salon",
    title: "Detective del salón de clases",
    theme: "Matemáticas",
    narrative: "Resolvé pistas numéricas para encontrar el número mágico del salón.",
    reward: "Insignia de calculista",
    stepCount: 5,
  },
  {
    slug: "mision-laboratorio-agua",
    title: "Laboratorio del agua",
    theme: "Ciencias",
    narrative: "Seguí el viaje de una gota: evaporación, nubes y lluvia.",
    reward: "Frasco de científico",
    stepCount: 5,
  },
  {
    slug: "mision-cronista-historia",
    title: "Cronista de la historia",
    theme: "Historia",
    narrative: "Ordená fechas clave y personajes de Latinoamérica.",
    reward: "Pluma de historiador",
    stepCount: 5,
  },
];

export const BULK_MISSION_TEMPLATES: {
  title: string;
  description: string;
  category: ContentCategory;
  targetValue: number;
  type: MissionType;
}[] = [
  {
    title: "Racha de sabios",
    description: "Respondé 5 preguntas correctas en quizzes del catálogo masivo.",
    category: ContentCategory.education,
    targetValue: 5,
    type: MissionType.CORRECT_ANSWERS,
  },
  {
    title: "Explorador de materias",
    description: "Completá 3 quizzes de materias distintas durante el día.",
    category: ContentCategory.science,
    targetValue: 3,
    type: MissionType.PLAY_GAMES,
  },
  {
    title: "Lectura curiosa",
    description: "Leé 2 contenidos educativos publicados (Aprender).",
    category: ContentCategory.education,
    targetValue: 2,
    type: MissionType.READ_CONTENT,
  },
];

export const BULK_ACHIEVEMENTS: {
  title: string;
  description: string;
  category: ContentCategory;
  slug: string;
  systemKind: "PROGRESS" | "SKILL" | "SOCIAL" | "SPECIAL" | "COLLECTIBLE";
  rarity: "COMMON" | "RARE" | "EPIC" | "LEGENDARY";
  collectionKey?: string;
}[] = [
  {
    title: "Sembrador de curiosidad",
    description: "Completaste 20 quizzes del catálogo extendido.",
    category: ContentCategory.education,
    slug: "bulk-sembrador-curiosidad",
    systemKind: "PROGRESS",
    rarity: "RARE",
  },
  {
    title: "Matemático en práctica",
    description: "Respondiste correctamente 50 preguntas de matemáticas generadas.",
    category: ContentCategory.math,
    slug: "bulk-mate-practica",
    systemKind: "SKILL",
    rarity: "COMMON",
    collectionKey: "bulk-mates",
  },
  {
    title: "Explorador del mapa",
    description: "Domina capitales: completá 10 quizzes de geografía.",
    category: ContentCategory.geography,
    slug: "bulk-mapa-explorador",
    systemKind: "SKILL",
    rarity: "COMMON",
    collectionKey: "bulk-geo",
  },
];
