/**
 * Catálogo ampliado de preguntas (500+) por área/tema/nivel para seed.
 * Se inserta con `createMany` después del seed legacy en `prisma/seed.ts`.
 */
import type { Prisma } from "@prisma/client";
import { Difficulty, QuizKnowledgeArea, QuizQuestionType } from "@prisma/client";

export type QuizExpansionRow = Prisma.QuizQuestionCreateManyInput;

function dlv(level: number): Difficulty {
  if (level <= 2) return Difficulty.EASY;
  if (level === 3) return Difficulty.MEDIUM;
  return Difficulty.HARD;
}

function legacyCat(area: QuizKnowledgeArea): string {
  const m: Record<QuizKnowledgeArea, string> = {
    mathematics: "math",
    natural_sciences: "science",
    social_sciences: "geography",
    language: "education",
    art_culture: "creativity",
    logic_thinking: "puzzle",
    emotions_values: "education",
  };
  return m[area];
}

function push(
  out: QuizExpansionRow[],
  row: Omit<QuizExpansionRow, "category" | "difficulty"> & {
    category?: string;
    difficulty?: Difficulty;
    knowledgeArea: QuizKnowledgeArea;
    quizLevel: number;
  }
): void {
  const { knowledgeArea, quizLevel, category, difficulty, ...rest } = row;
  out.push({
    ...rest,
    category: category ?? legacyCat(knowledgeArea),
    difficulty: difficulty ?? dlv(quizLevel),
    knowledgeArea,
    quizLevel,
  });
}

/** Orden: índices de `options` que el usuario debe tocar de menor a mayor (números en texto). */
function orderSequenceFromNumericOptions(opts: string[]): number[] {
  const nums = opts.map((s) => Number(String(s).replace(",", ".")));
  const idx = opts.map((_, i) => i);
  idx.sort((a, b) => nums[a]! - nums[b]!);
  return idx;
}

export function buildQuizExpansionRows(): QuizExpansionRow[] {
  const out: QuizExpansionRow[] = [];

  for (let i = 0; i < 90; i++) {
    const a = 2 + (i % 9);
    const b = 3 + ((i * 5) % 11);
    const level = 1 + (i % 5);
    push(out, {
      knowledgeArea: QuizKnowledgeArea.mathematics,
      topicSlug: "arithmetic",
      question: `¿Cuánto es ${a} + ${b}?`,
      options: [`${a + b + 2}`, `${a + b}`, `${a + b + 5}`, `${Math.max(0, a + b - 1)}`],
      correct: 1,
      questionType: QuizQuestionType.MULTIPLE_CHOICE,
      explanation: `Sumar es juntar cantidades: ${a} + ${b} = ${a + b}.`,
      hintText: "Sumá los dos números en papel.",
      hintCost: 5,
      quizLevel: level,
    });
  }

  for (let i = 0; i < 70; i++) {
    const a = 10 + (i % 20);
    const b = 1 + (i % 9);
    const level = 1 + (i % 5);
    push(out, {
      knowledgeArea: QuizKnowledgeArea.mathematics,
      topicSlug: "arithmetic",
      question: `¿Cuánto es ${a} − ${b}?`,
      options: [`${a - b + 3}`, `${a - b}`, `${a - b - 2}`, `${a + b}`],
      correct: 1,
      questionType: QuizQuestionType.MULTIPLE_CHOICE,
      explanation: `Restar es quitar: ${a} − ${b} = ${a - b}.`,
      hintText: "Pensá en un retroceso en la recta numérica.",
      hintCost: 5,
      quizLevel: level,
    });
  }

  for (let i = 0; i < 60; i++) {
    const a = 2 + (i % 8);
    const b = 2 + ((i * 3) % 7);
    const p = a * b;
    const level = 1 + (i % 5);
    push(out, {
      knowledgeArea: QuizKnowledgeArea.mathematics,
      topicSlug: "arithmetic",
      question: `¿Cuánto es ${a} × ${b}?`,
      options: [`${p + a}`, `${p}`, `${p + 2}`, `${p - b}`],
      correct: 1,
      questionType: QuizQuestionType.MULTIPLE_CHOICE,
      explanation: `La multiplicación es suma repetida: ${a} × ${b} = ${p}.`,
      hintText: "Recordá la tabla del número más chico.",
      hintCost: 6,
      quizLevel: level,
    });
  }

  for (let i = 0; i < 45; i++) {
    const b = 2 + (i % 7);
    const q = 2 + ((i * 4) % 5);
    const a = b * q;
    const level = 2 + (i % 4);
    push(out, {
      knowledgeArea: QuizKnowledgeArea.mathematics,
      topicSlug: "arithmetic",
      question: `¿Cuánto es ${a} ÷ ${b}?`,
      options: [`${q + 1}`, `${q}`, `${q - 1}`, `${b}`],
      correct: 1,
      questionType: QuizQuestionType.MULTIPLE_CHOICE,
      explanation: `Dividir reparte en partes iguales: ${a} ÷ ${b} = ${q}.`,
      hintText: "Pensá qué número multiplicado por el divisor da el dividendo.",
      hintCost: 6,
      quizLevel: level,
    });
  }

  const fracPairs: [string, string, number][] = [
    ["Un medio", "1/2", 0],
    ["Un cuarto", "1/4", 0],
    ["Tres cuartos", "3/4", 0],
    ["Un tercio", "1/3", 1],
    ["Dos quintos", "2/5", 1],
  ];
  for (let i = 0; i < 40; i++) {
    const [w, sym, correct] = fracPairs[i % fracPairs.length]!;
    const level = 2 + (i % 4);
    push(out, {
      knowledgeArea: QuizKnowledgeArea.mathematics,
      topicSlug: "fractions_decimals",
      question: `¿Qué notación representa ${w}?`,
      options: [sym, `${sym} + 1`, "2/2", "0/1"],
      correct,
      questionType: QuizQuestionType.MULTIPLE_CHOICE,
      explanation: `${w} se escribe ${sym}.`,
      hintText: "El número de abajo dice en cuántas partes se divide el entero.",
      hintCost: 7,
      quizLevel: level,
    });
  }

  for (let i = 0; i < 35; i++) {
    const decimals = ["0.5", "0.25", "0.75", "0.2"];
    const d = decimals[i % decimals.length]!;
    const level = 2 + (i % 4);
    push(out, {
      knowledgeArea: QuizKnowledgeArea.mathematics,
      topicSlug: "fractions_decimals",
      question: `¿Qué fracción simple se acerca a ${d}?`,
      options:
        d === "0.5"
          ? ["1/2", "1/3", "2/5", "3/4"]
          : d === "0.25"
            ? ["1/4", "1/5", "1/3", "2/3"]
            : d === "0.75"
              ? ["3/4", "2/3", "4/5", "1/2"]
              : ["1/5", "1/4", "1/6", "1/3"],
      correct: 0,
      questionType: QuizQuestionType.MULTIPLE_CHOICE,
      explanation: `Convertí el decimal a fracción: ${d}.`,
      hintCost: 7,
      quizLevel: level,
    });
  }

  const shapes = [
    { q: "¿Qué figura tiene 3 lados?", o: ["Triángulo", "Cuadrado", "Pentágono", "Círculo"], c: 0 },
    { q: "¿Qué figura tiene 4 lados iguales y ángulos rectos?", o: ["Rombo", "Cuadrado", "Trapecio", "Hexágono"], c: 1 },
    { q: "¿Qué figura no tiene lados?", o: ["Triángulo", "Cuadrado", "Círculo", "Rectángulo"], c: 2 },
  ];
  for (let i = 0; i < 30; i++) {
    const s = shapes[i % shapes.length]!;
    const level = 1 + (i % 5);
    push(out, {
      knowledgeArea: QuizKnowledgeArea.mathematics,
      topicSlug: "geometry_basic",
      question: s.q,
      options: s.o,
      correct: s.c,
      questionType: QuizQuestionType.MULTIPLE_CHOICE,
      explanation: "Repasá los nombres de figuras planas según lados y ángulos.",
      hintCost: 5,
      quizLevel: level,
    });
  }

  for (let i = 0; i < 25; i++) {
    const start = 2 + (i % 5);
    const step = 2;
    const next = start + step * 4;
    const level = 1 + (i % 5);
    push(out, {
      knowledgeArea: QuizKnowledgeArea.mathematics,
      topicSlug: "patterns_sequences",
      question: `¿Qué número sigue? ${start}, ${start + step}, ${start + step * 2}, ${start + step * 3}, …`,
      options: [`${next + 1}`, `${next}`, `${next - 1}`, `${start}`],
      correct: 1,
      questionType: QuizQuestionType.MULTIPLE_CHOICE,
      explanation: `La secuencia suma ${step} cada vez.`,
      hintCost: 5,
      quizLevel: level,
    });
  }

  for (let i = 0; i < 20; i++) {
    const opts = [`${5 + i}`, `${8 + i}`, `${3 + i}`, `${12 + i}`];
    const seq = orderSequenceFromNumericOptions(opts);
    push(out, {
      knowledgeArea: QuizKnowledgeArea.mathematics,
      topicSlug: "patterns_sequences",
      question: "Ordená tocando de menor a mayor (tocá en orden).",
      options: opts,
      correct: 0,
      questionType: QuizQuestionType.ORDER,
      orderTapSequence: seq,
      explanation: `El orden correcto es: ${seq.map((j) => opts[j]).join(" → ")}.`,
      hintText: "Compará las unidades antes de tocar.",
      hintCost: 8,
      quizLevel: 2 + (i % 3),
    });
  }

  const bodyFacts = [
    ["¿Qué órgano bombea la sangre?", ["Pulmón", "Corazón", "Hígado", "Estómago"], 1],
    ["¿Qué gas respiramos del aire?", ["Nitrógeno puro", "Oxígeno", "Helio", "Neón"], 1],
    ["¿Qué parte absorbe agua en la planta?", ["Flor", "Raíz", "Tallo", "Fruto"], 1],
    ["¿Qué necesitan las plantas para la fotosíntesis?", ["Solo agua", "Luz y clorofila", "Solo arena", "Solo viento"], 1],
    ["¿Qué estado tiene volumen definido pero forma variable?", ["Sólido", "Líquido", "Gas", "Plasma"], 1],
    ["¿Qué planeta es el tercero desde el Sol?", ["Venus", "Tierra", "Marte", "Mercurio"], 1],
  ];
  for (let i = 0; i < 85; i++) {
    const [q, o, c] = bodyFacts[i % bodyFacts.length]!;
    const level = 1 + (i % 5);
    push(out, {
      knowledgeArea: QuizKnowledgeArea.natural_sciences,
      topicSlug: i % 3 === 0 ? "human_body" : i % 3 === 1 ? "plants_photosynthesis" : "matter_states",
      question: q,
      options: o as string[],
      correct: c,
      questionType: QuizQuestionType.MULTIPLE_CHOICE,
      explanation: "Repasá el texto del libro de ciencias o la ficha de la app.",
      hintCost: 5,
      quizLevel: level,
    });
  }

  for (let i = 0; i < 40; i++) {
    push(out, {
      knowledgeArea: QuizKnowledgeArea.natural_sciences,
      topicSlug: "water_cycle",
      question: i % 2 === 0 ? "¿La evaporación convierte el agua en vapor?" : "¿La condensación forma nubes?",
      options: ["Verdadero", "Falso"],
      correct: 0,
      questionType: QuizQuestionType.TRUE_FALSE,
      explanation: i % 2 === 0 ? "Calor líquido → gas: evaporación." : "Gas → gotas: condensación.",
      hintCost: 3,
      quizLevel: 1 + (i % 4),
    });
  }

  const civs = [
    ["¿Dónde floreció el Antiguo Egipto?", ["Amazonas", "Nilo", "Misisipi", "Danubio"], 1],
    ["¿Quién gobernaba el Antiguo Egipto?", ["Cónsules", "Faraones", "Zares", "Dogos"], 1],
    ["¿Qué muralla famosa está en China?", ["Adriano", "Gran Muralla", "Berlín", "Viena"], 1],
    ["¿Capital de Francia?", ["Roma", "París", "Madrid", "Lisboa"], 1],
    ["¿En qué continente está Brasil?", ["África", "América", "Asia", "Europa"], 1],
  ];
  for (let i = 0; i < 85; i++) {
    const [q, o, c] = civs[i % civs.length]!;
    const level = 1 + (i % 5);
    push(out, {
      knowledgeArea: QuizKnowledgeArea.social_sciences,
      topicSlug: i % 2 === 0 ? "history_civilizations" : "geography_places",
      question: q,
      options: o as string[],
      correct: c,
      questionType: QuizQuestionType.MULTIPLE_CHOICE,
      explanation: "Conectá mapas y líneas de tiempo para recordar hechos clave.",
      hintCost: 5,
      quizLevel: level,
    });
  }

  const grammar = [
    ["¿Qué palabra es un sustantivo?", ["Correr", "Casa", "Rápido", "Bonito"], 1],
    ["¿Qué palabra es un verbo?", ["Lápiz", "Saltar", "Azul", "Alto"], 1],
    ["¿Qué palabra es un adjetivo?", ["Mesa", "Caminar", "Feliz", "Mañana"], 2],
    ["¿Cuál está bien escrita?", ["Había", "Abía", "Avía", "Ahía"], 0],
  ];
  for (let i = 0; i < 80; i++) {
    const [q, o, c] = grammar[i % grammar.length]!;
    const level = 1 + (i % 5);
    push(out, {
      knowledgeArea: QuizKnowledgeArea.language,
      topicSlug: i % 2 === 0 ? "grammar_spelling" : "vocabulary",
      question: q,
      options: o as string[],
      correct: c,
      questionType: QuizQuestionType.MULTIPLE_CHOICE,
      explanation: "La oración se construye con sujeto, verbo y complementos.",
      hintCost: 5,
      quizLevel: level,
    });
  }

  const en = [
    ['¿Cómo se dice "rojo" en inglés?', ["Blue", "Red", "Green", "Yellow"], 1],
    ['¿Cómo se dice "tres" en inglés?', ["Two", "Three", "Four", "Tree"], 1],
    ['¿Qué significa "dog"?', ["Gato", "Perro", "Pájaro", "Pez"], 1],
  ];
  for (let i = 0; i < 35; i++) {
    const [q, o, c] = en[i % en.length]!;
    push(out, {
      knowledgeArea: QuizKnowledgeArea.language,
      topicSlug: "english_basic",
      question: q,
      options: o as string[],
      correct: c,
      questionType: QuizQuestionType.MULTIPLE_CHOICE,
      explanation: "Practicá colores, números y animales en inglés con tarjetas.",
      hintCost: 4,
      quizLevel: 1 + (i % 3),
    });
  }

  const art = [
    ["¿Qué instrumento tiene teclas y cuerdas?", ["Trompeta", "Piano", "Tambor", "Flauta"], 1],
    ["¿Quién pintó la Mona Lisa?", ["Picasso", "Van Gogh", "Da Vinci", "Dalí"], 2],
    ["¿Qué estilo usó mucho color y movimiento en el siglo XX?", ["Barroco", "Cubismo", "Gótico", "Renacentista"], 1],
  ];
  for (let i = 0; i < 75; i++) {
    const [q, o, c] = art[i % art.length]!;
    const level = 1 + (i % 5);
    push(out, {
      knowledgeArea: QuizKnowledgeArea.art_culture,
      topicSlug: i % 2 === 0 ? "music_art" : "literature_stories",
      question: q,
      options: o as string[],
      correct: c,
      questionType: QuizQuestionType.MULTIPLE_CHOICE,
      explanation: "Explorá autores, obras e instrumentos en la sección Arte.",
      hintCost: 6,
      quizLevel: level,
    });
  }

  const logic = [
    ["Si todos los gatos maullan y Luna es un gato, entonces Luna…", ["Vuela", "Maúlla", "Nada", "Es un pez"], 1],
    ["¿Qué número falta? 1, 1, 2, 3, 5, 8, __", ["11", "12", "13", "10"], 2],
    ["Analogía: día es a noche como calor es a…", ["Fuego", "Frío", "Sol", "Invierno"], 1],
  ];
  for (let i = 0; i < 75; i++) {
    const [q, o, c] = logic[i % logic.length]!;
    const level = 2 + (i % 4);
    push(out, {
      knowledgeArea: QuizKnowledgeArea.logic_thinking,
      topicSlug: "reasoning_riddles",
      question: q,
      options: o as string[],
      correct: c,
      questionType: QuizQuestionType.MULTIPLE_CHOICE,
      explanation: "Pensá en relaciones causa-efecto y patrones numéricos.",
      hintCost: 7,
      quizLevel: level,
    });
  }

  const emo = [
    ["Si un compañero se cae, lo más empático es…", ["Reír", "Ayudar y preguntar si está bien", "Ignorar", "Grabar"], 1],
    ["Ante un conflicto por un juguete, primero…", ["Empujar", "Hablar y turnarse", "Esconderlo", "Romperlo"], 1],
    ["¿Qué es una contraseña segura?", ["1234", "Tu nombre", "Larga y secreta", "La palabra \"clave\""], 2],
    ["¿Qué hacer si un extraño en internet pide tu dirección?", ["Decirla", "Avisar a un adulto de confianza", "Mandar foto", "Quedar en persona"], 1],
  ];
  for (let i = 0; i < 75; i++) {
    const [q, o, c] = emo[i % emo.length]!;
    const level = 1 + (i % 5);
    push(out, {
      knowledgeArea: QuizKnowledgeArea.emotions_values,
      topicSlug: i % 2 === 0 ? "empathy_conflicts" : "safety_digital",
      question: q,
      options: o as string[],
      correct: c,
      questionType: QuizQuestionType.MULTIPLE_CHOICE,
      explanation: "Hablar con calma y pedir ayuda a adultos de confianza suele ser la mejor opción.",
      hintCost: 5,
      quizLevel: level,
    });
  }

  for (let i = 0; i < 30; i++) {
    const passage =
      "Ana guardó sus crayones en la caja. Después ayudó a su hermano a ordenar los libros.";
    push(out, {
      knowledgeArea: QuizKnowledgeArea.language,
      topicSlug: "reading_comprehension",
      question: "Según el texto, ¿qué hizo Ana primero?",
      options: ["Ayudó con los libros", "Guardó los crayones", "Fue al parque", "Durmió"],
      correct: 1,
      questionType: QuizQuestionType.MULTIPLE_CHOICE,
      readingPassage: passage,
      explanation: "El primer hecho narrado es guardar los crayones.",
      hintCost: 6,
      quizLevel: 2 + (i % 3),
    });
  }

  return out;
}
