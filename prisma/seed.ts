/**
 * Población de datos de demo para EduPlay.
 * Ejecutar: npx prisma db seed  (o npm run db:seed)
 */
import "dotenv/config";
import {
  ActivityApprovalStatus,
  ActivityType,
  AchievementRarity,
  ContentCategory,
  Difficulty,
  FriendStatus,
  ParentChildRelationStatus,
  PostType,
  PrismaClient,
  ReactionType,
  SubscriptionTier,
  UserStatus,
  UserType,
  VerificationMethod,
  VerificationStatus,
  Visibility,
} from "@prisma/client";

import { buildVisualSeedRows } from "./seeds/visualQuestions";

const prisma = new PrismaClient();

type QuizSeedRow = {
  question: string;
  options: [string, string, string, string];
  correct: number;
  category: "astronomy" | "math" | "science" | "history" | "geography" | "creativity";
  difficulty: Difficulty;
};

function shuffleInPlace<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]!;
    a[i] = a[j]!;
    a[j] = t;
  }
  return a;
}

function ensureNoDuplicateQuestions(rows: QuizSeedRow[]): void {
  const seen = new Set<string>();
  for (const row of rows) {
    const key = `${row.category}::${row.question.trim().toLowerCase()}`;
    if (seen.has(key)) {
      throw new Error(`Pregunta duplicada detectada en seed: ${row.category} -> ${row.question}`);
    }
    seen.add(key);
  }
}

function buildQuizSeedRows(): QuizSeedRow[] {
  const astronomy: QuizSeedRow[] = [
    { question: "¿Cuál es el planeta más grande?", options: ["Marte", "Júpiter", "Venus", "Mercurio"], correct: 1, category: "astronomy", difficulty: Difficulty.EASY },
    { question: "¿Qué es el Sol?", options: ["Un planeta", "Un satélite", "Una estrella", "Un cometa"], correct: 2, category: "astronomy", difficulty: Difficulty.EASY },
    { question: "¿Qué planeta está más cerca del Sol?", options: ["Venus", "Mercurio", "Marte", "Tierra"], correct: 1, category: "astronomy", difficulty: Difficulty.EASY },
    { question: "¿Qué planeta es conocido como planeta rojo?", options: ["Saturno", "Neptuno", "Marte", "Urano"], correct: 2, category: "astronomy", difficulty: Difficulty.EASY },
    { question: "¿Cómo se llama nuestra galaxia?", options: ["Andrómeda", "Vía Láctea", "Orión", "Sombrero"], correct: 1, category: "astronomy", difficulty: Difficulty.EASY },
    { question: "¿Qué satélite natural tiene la Tierra?", options: ["Titán", "Europa", "La Luna", "Fobos"], correct: 2, category: "astronomy", difficulty: Difficulty.EASY },
    { question: "¿Qué planeta tiene anillos visibles?", options: ["Mercurio", "Saturno", "Venus", "Marte"], correct: 1, category: "astronomy", difficulty: Difficulty.EASY },
    { question: "¿Qué instrumento se usa para observar estrellas?", options: ["Microscopio", "Telescopio", "Termómetro", "Barómetro"], correct: 1, category: "astronomy", difficulty: Difficulty.EASY },
    { question: "¿Cuál es la estrella más cercana a la Tierra?", options: ["Sirio", "Alfa Centauri", "El Sol", "Polaris"], correct: 2, category: "astronomy", difficulty: Difficulty.EASY },
    { question: "¿Qué planeta es famoso por sus grandes tormentas?", options: ["Júpiter", "Venus", "Mercurio", "Tierra"], correct: 0, category: "astronomy", difficulty: Difficulty.EASY },
    { question: "¿Qué planeta tiene más de una luna?", options: ["Solo la Tierra", "Muchos planetas", "Ninguno", "Solo Mercurio"], correct: 1, category: "astronomy", difficulty: Difficulty.EASY },
    { question: "¿Qué cuerpo gira alrededor de un planeta?", options: ["Satélite", "Cometa", "Asteroide", "Nebulosa"], correct: 0, category: "astronomy", difficulty: Difficulty.EASY },
    { question: "¿Qué causa el día y la noche?", options: ["La Luna", "La rotación de la Tierra", "Las nubes", "Los planetas"], correct: 1, category: "astronomy", difficulty: Difficulty.MEDIUM },
    { question: "¿Qué causa las estaciones del año?", options: ["Distancia al Sol", "Inclinación de la Tierra", "Fases lunares", "Viento solar"], correct: 1, category: "astronomy", difficulty: Difficulty.MEDIUM },
    { question: "¿Cómo se llama una roca espacial pequeña?", options: ["Nebulosa", "Asteroide", "Galaxia", "Pulsar"], correct: 1, category: "astronomy", difficulty: Difficulty.EASY },
    { question: "¿Qué son los cometas?", options: ["Estrellas apagadas", "Bolas de hielo y polvo", "Planetas pequeños", "Satélites"], correct: 1, category: "astronomy", difficulty: Difficulty.MEDIUM },
    { question: "¿Dónde está el cinturón de asteroides principal?", options: ["Entre Marte y Júpiter", "Entre Venus y Tierra", "Cerca de Neptuno", "Dentro del Sol"], correct: 0, category: "astronomy", difficulty: Difficulty.MEDIUM },
    { question: "¿Qué planeta tarda más en dar una vuelta al Sol?", options: ["Mercurio", "Júpiter", "Neptuno", "Tierra"], correct: 2, category: "astronomy", difficulty: Difficulty.MEDIUM },
    { question: "¿Cómo se llama el camino aparente del Sol en el cielo?", options: ["Ecuador", "Eclíptica", "Órbita lunar", "Horizonte"], correct: 1, category: "astronomy", difficulty: Difficulty.HARD },
    { question: "¿Qué planeta está inclinado y parece girar de costado?", options: ["Saturno", "Urano", "Marte", "Venus"], correct: 1, category: "astronomy", difficulty: Difficulty.MEDIUM },
    { question: "¿Qué gas abunda en el Sol?", options: ["Oxígeno", "Helio e hidrógeno", "Nitrógeno", "Dióxido de carbono"], correct: 1, category: "astronomy", difficulty: Difficulty.MEDIUM },
    { question: "¿Qué son las fases de la Luna?", options: ["Cambios de forma visibles", "Cambios de tamaño real", "Sombras de estrellas", "Luz de planetas"], correct: 0, category: "astronomy", difficulty: Difficulty.EASY },
    { question: "¿Cuál es el planeta más caliente del sistema solar?", options: ["Mercurio", "Venus", "Marte", "Júpiter"], correct: 1, category: "astronomy", difficulty: Difficulty.MEDIUM },
    { question: "¿Qué nombre recibe una estrella que explota?", options: ["Nova", "Supernova", "Quásar", "Púlsar"], correct: 1, category: "astronomy", difficulty: Difficulty.HARD },
    { question: "¿Qué planeta tiene el día más largo (rotación lenta)?", options: ["Tierra", "Venus", "Marte", "Neptuno"], correct: 1, category: "astronomy", difficulty: Difficulty.HARD },
    { question: "¿Qué planeta tiene la Gran Mancha Roja?", options: ["Saturno", "Júpiter", "Neptuno", "Urano"], correct: 1, category: "astronomy", difficulty: Difficulty.EASY },
    { question: "¿Qué significa \"órbita\"?", options: ["Brillo de una estrella", "Camino de un objeto alrededor de otro", "Velocidad de la luz", "Tipo de cometa"], correct: 1, category: "astronomy", difficulty: Difficulty.EASY },
    { question: "¿Qué planeta enano está más lejos conocido del Sol entre estos?", options: ["Plutón", "Ceres", "Haumea", "Makemake"], correct: 0, category: "astronomy", difficulty: Difficulty.HARD },
    { question: "¿Qué planeta tiene más lunas conocidas entre estos?", options: ["Saturno", "Venus", "Tierra", "Mercurio"], correct: 0, category: "astronomy", difficulty: Difficulty.HARD },
    { question: "¿Qué parte del sistema solar nos protege del viento solar?", options: ["Magnetosfera terrestre", "Nubes", "Océanos", "Montañas"], correct: 0, category: "astronomy", difficulty: Difficulty.HARD },
  ];

  const math: QuizSeedRow[] = [
    { question: "5 + 3 = ?", options: ["6", "7", "8", "9"], correct: 2, category: "math", difficulty: Difficulty.EASY },
    { question: "10 - 4 = ?", options: ["4", "5", "6", "7"], correct: 2, category: "math", difficulty: Difficulty.EASY },
    { question: "7 + 6 = ?", options: ["12", "13", "14", "15"], correct: 1, category: "math", difficulty: Difficulty.EASY },
    { question: "9 - 2 = ?", options: ["5", "6", "7", "8"], correct: 2, category: "math", difficulty: Difficulty.EASY },
    { question: "3 x 4 = ?", options: ["7", "10", "12", "14"], correct: 2, category: "math", difficulty: Difficulty.EASY },
    { question: "12 / 3 = ?", options: ["3", "4", "5", "6"], correct: 1, category: "math", difficulty: Difficulty.EASY },
    { question: "¿Cuál es un número par?", options: ["11", "13", "16", "19"], correct: 2, category: "math", difficulty: Difficulty.EASY },
    { question: "¿Cuál es un número primo?", options: ["9", "12", "15", "17"], correct: 3, category: "math", difficulty: Difficulty.MEDIUM },
    { question: "15 + 9 = ?", options: ["23", "24", "25", "26"], correct: 1, category: "math", difficulty: Difficulty.EASY },
    { question: "20 - 11 = ?", options: ["8", "9", "10", "11"], correct: 1, category: "math", difficulty: Difficulty.EASY },
    { question: "6 x 7 = ?", options: ["36", "40", "42", "48"], correct: 2, category: "math", difficulty: Difficulty.EASY },
    { question: "24 / 6 = ?", options: ["2", "3", "4", "5"], correct: 2, category: "math", difficulty: Difficulty.EASY },
    { question: "¿Qué fracción representa la mitad?", options: ["1/3", "1/2", "2/3", "3/4"], correct: 1, category: "math", difficulty: Difficulty.MEDIUM },
    { question: "¿Cuál es mayor?", options: ["0.4", "0.7", "0.2", "0.5"], correct: 1, category: "math", difficulty: Difficulty.MEDIUM },
    { question: "¿Cuánto es 30% de 100?", options: ["3", "30", "300", "13"], correct: 1, category: "math", difficulty: Difficulty.MEDIUM },
    { question: "8 + 9 + 1 = ?", options: ["16", "17", "18", "19"], correct: 2, category: "math", difficulty: Difficulty.EASY },
    { question: "14 - 6 = ?", options: ["6", "7", "8", "9"], correct: 2, category: "math", difficulty: Difficulty.EASY },
    { question: "9 x 5 = ?", options: ["40", "45", "50", "55"], correct: 1, category: "math", difficulty: Difficulty.EASY },
    { question: "49 / 7 = ?", options: ["6", "7", "8", "9"], correct: 1, category: "math", difficulty: Difficulty.EASY },
    { question: "¿Qué número falta? 2, 4, 6, __", options: ["7", "8", "9", "10"], correct: 1, category: "math", difficulty: Difficulty.EASY },
    { question: "¿Qué figura tiene 3 lados?", options: ["Cuadrado", "Triángulo", "Rectángulo", "Círculo"], correct: 1, category: "math", difficulty: Difficulty.EASY },
    { question: "¿Cuántos grados tiene un ángulo recto?", options: ["45", "90", "120", "180"], correct: 1, category: "math", difficulty: Difficulty.MEDIUM },
    { question: "¿Cuál es el perímetro de un cuadrado de lado 5?", options: ["10", "15", "20", "25"], correct: 2, category: "math", difficulty: Difficulty.MEDIUM },
    { question: "¿Cuál es el área de un rectángulo 4x3?", options: ["7", "12", "14", "16"], correct: 1, category: "math", difficulty: Difficulty.MEDIUM },
    { question: "¿Qué es 2 al cuadrado?", options: ["2", "3", "4", "8"], correct: 2, category: "math", difficulty: Difficulty.MEDIUM },
    { question: "¿Cuál es el resultado de 100 - 75?", options: ["20", "25", "30", "35"], correct: 1, category: "math", difficulty: Difficulty.EASY },
    { question: "¿Qué decimal equivale a 1/4?", options: ["0.25", "0.5", "0.75", "0.2"], correct: 0, category: "math", difficulty: Difficulty.HARD },
    { question: "¿Cuánto es 11 x 11?", options: ["111", "121", "131", "141"], correct: 1, category: "math", difficulty: Difficulty.MEDIUM },
    { question: "¿Cuál es el mínimo común múltiplo de 2 y 3?", options: ["5", "6", "8", "9"], correct: 1, category: "math", difficulty: Difficulty.HARD },
    { question: "¿Cuál es la raíz cuadrada de 81?", options: ["7", "8", "9", "10"], correct: 2, category: "math", difficulty: Difficulty.MEDIUM },
  ];

  const science: QuizSeedRow[] = [
    { question: "¿Qué estado es el agua?", options: ["Solo sólido", "Solo gaseoso", "Puede ser sólido, líquido y gaseoso", "Ninguno"], correct: 2, category: "science", difficulty: Difficulty.EASY },
    { question: "¿Qué necesitan las plantas para crecer?", options: ["Luz, agua y aire", "Solo arena", "Solo oscuridad", "Solo frío"], correct: 0, category: "science", difficulty: Difficulty.EASY },
    { question: "¿Qué órgano bombea la sangre?", options: ["Pulmón", "Cerebro", "Corazón", "Hígado"], correct: 2, category: "science", difficulty: Difficulty.EASY },
    { question: "¿Qué gas respiramos principalmente?", options: ["Oxígeno", "Helio", "Hidrógeno", "Neón"], correct: 0, category: "science", difficulty: Difficulty.EASY },
    { question: "¿Qué hace un imán?", options: ["Ilumina", "Atrae metales", "Produce agua", "Enfría"], correct: 1, category: "science", difficulty: Difficulty.EASY },
    { question: "¿Qué parte de la planta absorbe agua?", options: ["Flor", "Raíz", "Hoja", "Fruto"], correct: 1, category: "science", difficulty: Difficulty.EASY },
    { question: "¿Qué planeta es el tercero desde el Sol?", options: ["Marte", "Venus", "Tierra", "Mercurio"], correct: 2, category: "science", difficulty: Difficulty.EASY },
    { question: "¿Qué tipo de animal es una rana?", options: ["Reptil", "Mamífero", "Anfibio", "Ave"], correct: 2, category: "science", difficulty: Difficulty.MEDIUM },
    { question: "¿Cuál es la fuente principal de energía de la Tierra?", options: ["La Luna", "El Sol", "El viento", "Los volcanes"], correct: 1, category: "science", difficulty: Difficulty.EASY },
    { question: "¿Qué instrumento mide la temperatura?", options: ["Regla", "Termómetro", "Balanza", "Microscopio"], correct: 1, category: "science", difficulty: Difficulty.EASY },
    { question: "¿Qué produce la fotosíntesis?", options: ["Oxígeno y alimento", "Solo calor", "Solo agua", "Plástico"], correct: 0, category: "science", difficulty: Difficulty.MEDIUM },
    { question: "¿Qué estado tiene forma y volumen fijos?", options: ["Líquido", "Gas", "Plasma", "Sólido"], correct: 3, category: "science", difficulty: Difficulty.EASY },
    { question: "¿Qué cambia en la evaporación?", options: ["Gas a líquido", "Líquido a gas", "Sólido a líquido", "Gas a sólido"], correct: 1, category: "science", difficulty: Difficulty.MEDIUM },
    { question: "¿Qué animales tienen columna vertebral?", options: ["Vertebrados", "Invertebrados", "Anélidos", "Moluscos"], correct: 0, category: "science", difficulty: Difficulty.MEDIUM },
    { question: "¿Cuál es el metal líquido a temperatura ambiente?", options: ["Hierro", "Cobre", "Mercurio", "Aluminio"], correct: 2, category: "science", difficulty: Difficulty.HARD },
    { question: "¿Qué capa de la atmósfera tiene ozono?", options: ["Troposfera", "Estratosfera", "Mesosfera", "Exosfera"], correct: 1, category: "science", difficulty: Difficulty.HARD },
    { question: "¿Qué sistema controla el cuerpo con señales eléctricas?", options: ["Digestivo", "Nervioso", "Respiratorio", "Circulatorio"], correct: 1, category: "science", difficulty: Difficulty.MEDIUM },
    { question: "¿Qué fuerza nos mantiene en el suelo?", options: ["Magnetismo", "Gravedad", "Fricción", "Electricidad"], correct: 1, category: "science", difficulty: Difficulty.EASY },
    { question: "¿Qué órgano usamos para respirar?", options: ["Pulmones", "Riñones", "Estómago", "Piel"], correct: 0, category: "science", difficulty: Difficulty.EASY },
    { question: "¿Cómo se llama el cambio de sólido a líquido?", options: ["Condensación", "Fusión", "Sublimación", "Evaporación"], correct: 1, category: "science", difficulty: Difficulty.MEDIUM },
    { question: "¿Qué parte del ojo regula la entrada de luz?", options: ["Retina", "Iris", "Nervio óptico", "Córnea"], correct: 1, category: "science", difficulty: Difficulty.HARD },
    { question: "¿Qué mide una balanza?", options: ["Temperatura", "Masa", "Volumen", "Tiempo"], correct: 1, category: "science", difficulty: Difficulty.EASY },
    { question: "¿Qué órgano filtra la sangre?", options: ["Corazón", "Pulmón", "Riñón", "Páncreas"], correct: 2, category: "science", difficulty: Difficulty.MEDIUM },
    { question: "¿Qué gas expulsamos al respirar?", options: ["Oxígeno", "Nitrógeno", "Dióxido de carbono", "Helio"], correct: 2, category: "science", difficulty: Difficulty.EASY },
    { question: "¿Qué tipo de energía tiene un objeto en movimiento?", options: ["Potencial", "Cinética", "Térmica", "Química"], correct: 1, category: "science", difficulty: Difficulty.HARD },
    { question: "¿Qué elemento químico tiene símbolo O?", options: ["Oro", "Oxígeno", "Osmio", "Óxido"], correct: 1, category: "science", difficulty: Difficulty.MEDIUM },
    { question: "¿Qué animal es mamífero?", options: ["Tortuga", "Delfín", "Trucha", "Águila"], correct: 1, category: "science", difficulty: Difficulty.EASY },
    { question: "¿Qué sucede en la condensación?", options: ["Gas a líquido", "Líquido a gas", "Sólido a gas", "Líquido a sólido"], correct: 0, category: "science", difficulty: Difficulty.MEDIUM },
    { question: "¿Qué parte del cuerpo protege el cerebro?", options: ["Costillas", "Cráneo", "Columna", "Piel"], correct: 1, category: "science", difficulty: Difficulty.EASY },
    { question: "¿Qué partícula tiene carga negativa?", options: ["Protón", "Neutrón", "Electrón", "Positrón"], correct: 2, category: "science", difficulty: Difficulty.HARD },
  ];

  const history: QuizSeedRow[] = [
    { question: "¿Dónde se desarrolló el Antiguo Egipto?", options: ["Río Nilo", "Río Amazonas", "Río Sena", "Río Támesis"], correct: 0, category: "history", difficulty: Difficulty.EASY },
    { question: "¿Quién gobernaba en Egipto antiguo?", options: ["Cónsules", "Faraones", "Reyes mayas", "Samuráis"], correct: 1, category: "history", difficulty: Difficulty.EASY },
    { question: "¿Cómo se llama la escritura egipcia?", options: ["Cuneiforme", "Jeroglíficos", "Latín", "Rúnico"], correct: 1, category: "history", difficulty: Difficulty.EASY },
    { question: "¿Qué construyeron los egipcios famosos?", options: ["Castillos", "Pirámides", "Rascacielos", "Acueductos"], correct: 1, category: "history", difficulty: Difficulty.EASY },
    { question: "¿Qué civilización construyó el Coliseo?", options: ["Egipcia", "Romana", "China", "Inca"], correct: 1, category: "history", difficulty: Difficulty.EASY },
    { question: "¿Cuál fue un idioma del Imperio Romano?", options: ["Latín", "Quechua", "Alemán", "Náhuatl"], correct: 0, category: "history", difficulty: Difficulty.MEDIUM },
    { question: "¿En qué periodo hubo castillos y caballeros?", options: ["Edad Media", "Edad de Piedra", "Renacimiento", "Edad Contemporánea"], correct: 0, category: "history", difficulty: Difficulty.EASY },
    { question: "¿Qué vino después de la Edad Media en Europa?", options: ["Edad Antigua", "Renacimiento", "Prehistoria", "Bronce"], correct: 1, category: "history", difficulty: Difficulty.MEDIUM },
    { question: "¿Qué imperio construyó caminos y acueductos?", options: ["Romano", "Mongol", "Azteca", "Persa"], correct: 0, category: "history", difficulty: Difficulty.MEDIUM },
    { question: "¿Qué continente tuvo civilizaciones maya e inca?", options: ["Europa", "Asia", "América", "Oceanía"], correct: 2, category: "history", difficulty: Difficulty.EASY },
    { question: "¿Quiénes eran los samuráis?", options: ["Guerreros japoneses", "Navegantes vikingos", "Sacerdotes egipcios", "Soldados romanos"], correct: 0, category: "history", difficulty: Difficulty.MEDIUM },
    { question: "¿Qué muralla famosa está en China?", options: ["Muralla de Adriano", "Gran Muralla China", "Muro de Berlín", "Muro de los Lamentos"], correct: 1, category: "history", difficulty: Difficulty.EASY },
    { question: "¿Qué civilización usó la democracia en Atenas?", options: ["Griega", "Egipcia", "Fenicia", "Babilónica"], correct: 0, category: "history", difficulty: Difficulty.MEDIUM },
    { question: "¿Cómo se llamaba la ruta comercial entre Asia y Europa?", options: ["Ruta del Oro", "Ruta de la Seda", "Ruta del Ámbar", "Ruta de la Sal"], correct: 1, category: "history", difficulty: Difficulty.MEDIUM },
    { question: "¿Quién descubrió América en 1492 para Europa?", options: ["Magallanes", "Colón", "Vespucci", "Cortés"], correct: 1, category: "history", difficulty: Difficulty.EASY },
    { question: "¿Qué invento ayudó a difundir libros en masa?", options: ["Brújula", "Imprenta", "Reloj", "Telescopio"], correct: 1, category: "history", difficulty: Difficulty.MEDIUM },
    { question: "¿Qué periodo artístico y científico surgió en Europa?", options: ["Renacimiento", "Edad de Hierro", "Neolítico", "Barroco"], correct: 0, category: "history", difficulty: Difficulty.MEDIUM },
    { question: "¿Qué país tuvo revolución en 1789?", options: ["España", "Francia", "Italia", "Portugal"], correct: 1, category: "history", difficulty: Difficulty.MEDIUM },
    { question: "¿Qué guerra fue entre Norte y Sur en EE. UU.?", options: ["Guerra Civil", "Primera Guerra Mundial", "Guerra Fría", "Guerra de Crimea"], correct: 0, category: "history", difficulty: Difficulty.HARD },
    { question: "¿Qué conflicto global comenzó en 1914?", options: ["Segunda Guerra Mundial", "Primera Guerra Mundial", "Guerra Fría", "Guerra de Corea"], correct: 1, category: "history", difficulty: Difficulty.MEDIUM },
    { question: "¿Qué conflicto global comenzó en 1939?", options: ["Primera Guerra Mundial", "Segunda Guerra Mundial", "Guerra de Vietnam", "Guerra de los Cien Años"], correct: 1, category: "history", difficulty: Difficulty.MEDIUM },
    { question: "¿Qué organización internacional nació tras la Segunda Guerra?", options: ["OTAN", "ONU", "UE", "OEA"], correct: 1, category: "history", difficulty: Difficulty.MEDIUM },
    { question: "¿Quién lideró la independencia de la India por la no violencia?", options: ["Nehru", "Gandhi", "Mandela", "Churchill"], correct: 1, category: "history", difficulty: Difficulty.MEDIUM },
    { question: "¿Qué muro cayó en 1989?", options: ["Muro de Berlín", "Gran Muralla", "Muro Adriano", "Muro de Viena"], correct: 0, category: "history", difficulty: Difficulty.MEDIUM },
    { question: "¿Qué cultura construyó Machu Picchu?", options: ["Maya", "Inca", "Azteca", "Olmeca"], correct: 1, category: "history", difficulty: Difficulty.EASY },
    { question: "¿Qué civilización habitó gran parte de México central antes de la conquista?", options: ["Inca", "Azteca", "Fenicia", "Persa"], correct: 1, category: "history", difficulty: Difficulty.EASY },
    { question: "¿Qué navegante dio la primera vuelta al mundo (expedición)?", options: ["Colón", "Magallanes-Elcano", "Cook", "Drake"], correct: 1, category: "history", difficulty: Difficulty.HARD },
    { question: "¿Qué invento mejoró la navegación marítima medieval?", options: ["Imprenta", "Brújula", "Teléfono", "Motor a vapor"], correct: 1, category: "history", difficulty: Difficulty.MEDIUM },
    { question: "¿Cuál fue una civilización de Mesopotamia?", options: ["Sumeria", "Maya", "Inca", "Olmeca"], correct: 0, category: "history", difficulty: Difficulty.HARD },
    { question: "¿Qué periodo viene antes de la Historia escrita?", options: ["Prehistoria", "Edad Moderna", "Edad Contemporánea", "Renacimiento"], correct: 0, category: "history", difficulty: Difficulty.EASY },
  ];

  const geography: QuizSeedRow[] = [
    { question: "¿Cuál es el continente más grande?", options: ["África", "Europa", "Asia", "Oceanía"], correct: 2, category: "geography", difficulty: Difficulty.EASY },
    { question: "¿En qué continente está Argentina?", options: ["Europa", "América del Sur", "Asia", "África"], correct: 1, category: "geography", difficulty: Difficulty.EASY },
    { question: "¿Cuál es el océano más grande?", options: ["Atlántico", "Índico", "Pacífico", "Ártico"], correct: 2, category: "geography", difficulty: Difficulty.EASY },
    { question: "¿Qué línea divide la Tierra en norte y sur?", options: ["Meridiano de Greenwich", "Ecuador", "Trópico de Cáncer", "Polo Norte"], correct: 1, category: "geography", difficulty: Difficulty.EASY },
    { question: "¿Cuál de estos es un país?", options: ["Andes", "Sahara", "Chile", "Amazonas"], correct: 2, category: "geography", difficulty: Difficulty.EASY },
    { question: "¿Cuántos continentes se enseñan normalmente en la escuela?", options: ["3", "5", "6", "7"], correct: 2, category: "geography", difficulty: Difficulty.MEDIUM },
    { question: "¿Qué continente tiene el desierto del Sahara?", options: ["Asia", "América", "África", "Europa"], correct: 2, category: "geography", difficulty: Difficulty.EASY },
    { question: "¿Qué país tiene forma de bota?", options: ["Italia", "Brasil", "Canadá", "India"], correct: 0, category: "geography", difficulty: Difficulty.EASY },
    { question: "¿Qué instrumento usamos para ubicarnos?", options: ["Termómetro", "Brújula", "Microscopio", "Regla"], correct: 1, category: "geography", difficulty: Difficulty.EASY },
    { question: "¿Qué mar baña la costa este de España?", options: ["Mar del Norte", "Mar Mediterráneo", "Mar Rojo", "Mar Negro"], correct: 1, category: "geography", difficulty: Difficulty.MEDIUM },
    { question: "¿Cuál es la capital de Francia?", options: ["Roma", "Madrid", "París", "Lisboa"], correct: 2, category: "geography", difficulty: Difficulty.EASY },
    { question: "¿Qué continente tiene más países?", options: ["Europa", "África", "Oceanía", "América del Sur"], correct: 1, category: "geography", difficulty: Difficulty.HARD },
    { question: "¿Qué país es famoso por la Torre Eiffel?", options: ["Francia", "Alemania", "México", "Perú"], correct: 0, category: "geography", difficulty: Difficulty.EASY },
    { question: "¿Qué continente está al sur de Europa?", options: ["América", "África", "Asia", "Oceanía"], correct: 1, category: "geography", difficulty: Difficulty.EASY },
    { question: "¿Cuál es el río más largo de Sudamérica?", options: ["Nilo", "Amazonas", "Danubio", "Misisipi"], correct: 1, category: "geography", difficulty: Difficulty.MEDIUM },
    { question: "¿En qué hemisferio está Japón?", options: ["Sur y Oeste", "Norte y Este", "Sur y Este", "Norte y Oeste"], correct: 1, category: "geography", difficulty: Difficulty.HARD },
    { question: "¿Qué país limita con Argentina y Brasil?", options: ["Uruguay", "Chile", "Ecuador", "Panamá"], correct: 0, category: "geography", difficulty: Difficulty.MEDIUM },
    { question: "¿Qué cordillera cruza varios países de Sudamérica?", options: ["Alpes", "Andes", "Himalaya", "Urales"], correct: 1, category: "geography", difficulty: Difficulty.EASY },
    { question: "¿Qué mapa muestra relieve y montañas?", options: ["Mapa político", "Mapa físico", "Mapa vial", "Mapa del clima"], correct: 1, category: "geography", difficulty: Difficulty.MEDIUM },
    { question: "¿Qué país tiene como capital Tokio?", options: ["Corea del Sur", "China", "Japón", "Tailandia"], correct: 2, category: "geography", difficulty: Difficulty.EASY },
    { question: "¿Cuál es la capital de Brasil?", options: ["Río de Janeiro", "Brasilia", "São Paulo", "Salvador"], correct: 1, category: "geography", difficulty: Difficulty.MEDIUM },
    { question: "¿En qué continente está Egipto?", options: ["Europa", "África", "Asia", "América"], correct: 1, category: "geography", difficulty: Difficulty.EASY },
    { question: "¿Qué país tiene como capital Canberra?", options: ["Australia", "Nueva Zelanda", "Canadá", "Sudáfrica"], correct: 0, category: "geography", difficulty: Difficulty.HARD },
    { question: "¿Qué océano está entre América y Europa/África?", options: ["Índico", "Pacífico", "Atlántico", "Ártico"], correct: 2, category: "geography", difficulty: Difficulty.MEDIUM },
    { question: "¿Cuál de estos países está en África?", options: ["Kenia", "Japón", "Noruega", "Chile"], correct: 0, category: "geography", difficulty: Difficulty.EASY },
    { question: "¿Qué continente incluye a India y China?", options: ["Asia", "Europa", "Oceanía", "América"], correct: 0, category: "geography", difficulty: Difficulty.EASY },
    { question: "¿Cuál es la capital de México?", options: ["Guadalajara", "Monterrey", "Ciudad de México", "Puebla"], correct: 2, category: "geography", difficulty: Difficulty.MEDIUM },
    { question: "¿Qué país ocupa gran parte del oeste de Sudamérica junto a los Andes?", options: ["Chile", "Uruguay", "Paraguay", "Guyana"], correct: 0, category: "geography", difficulty: Difficulty.MEDIUM },
    { question: "¿Qué punto cardinal indica donde sale el Sol?", options: ["Norte", "Sur", "Este", "Oeste"], correct: 2, category: "geography", difficulty: Difficulty.EASY },
    { question: "¿Cuál de estos países es europeo?", options: ["Portugal", "Perú", "Canadá", "Marruecos"], correct: 0, category: "geography", difficulty: Difficulty.EASY },
  ];

  const creativity: QuizSeedRow[] = [
    { question: "¿Qué colores forman el color verde?", options: ["Rojo y azul", "Azul y amarillo", "Rojo y amarillo", "Negro y blanco"], correct: 1, category: "creativity", difficulty: Difficulty.EASY },
    { question: "¿Cuál es un color cálido?", options: ["Azul", "Violeta", "Rojo", "Celeste"], correct: 2, category: "creativity", difficulty: Difficulty.EASY },
    { question: "¿Qué herramienta usamos para pintar acuarela?", options: ["Pincel", "Martillo", "Regla", "Tijera"], correct: 0, category: "creativity", difficulty: Difficulty.EASY },
    { question: "¿Qué ayuda a imaginar una historia?", options: ["La creatividad", "Solo copiar", "No pensar", "Borrar todo"], correct: 0, category: "creativity", difficulty: Difficulty.EASY },
    { question: "¿Qué mezcla crea color naranja?", options: ["Azul + amarillo", "Rojo + amarillo", "Rojo + azul", "Verde + azul"], correct: 1, category: "creativity", difficulty: Difficulty.EASY },
    { question: "¿Qué elemento puede dar ritmo en un dibujo?", options: ["Repetición", "Silencio", "Vacío total", "Borrar"], correct: 0, category: "creativity", difficulty: Difficulty.MEDIUM },
    { question: "¿Qué es un collage?", options: ["Pintar solo con rojo", "Pegar materiales para crear una obra", "Dibujar sin mirar", "Romper papel"], correct: 1, category: "creativity", difficulty: Difficulty.EASY },
    { question: "¿Cuál de estas acciones mejora una idea creativa?", options: ["Probar variantes", "Rendirse rápido", "No experimentar", "Copiar siempre igual"], correct: 0, category: "creativity", difficulty: Difficulty.MEDIUM },
    { question: "¿Qué color transmite calma con frecuencia?", options: ["Azul", "Rojo", "Naranja", "Amarillo fuerte"], correct: 0, category: "creativity", difficulty: Difficulty.MEDIUM },
    { question: "¿Qué forma suele sentirse más dinámica?", options: ["Línea diagonal", "Línea horizontal", "Cuadrado estático", "Círculo pequeño"], correct: 0, category: "creativity", difficulty: Difficulty.HARD },
    { question: "¿Qué técnica usa puntos pequeños para crear imágenes?", options: ["Puntillismo", "Origami", "Grabado", "Mosaico"], correct: 0, category: "creativity", difficulty: Difficulty.HARD },
    { question: "¿Qué hace un borrador en arte?", options: ["Daña el papel siempre", "Ayuda a corregir y explorar", "Solo pinta", "Corta cartón"], correct: 1, category: "creativity", difficulty: Difficulty.EASY },
    { question: "¿Qué material sirve para modelar figuras?", options: ["Arcilla", "Vidrio líquido", "Tiza mojada", "Arena seca"], correct: 0, category: "creativity", difficulty: Difficulty.EASY },
    { question: "¿Qué parte de una historia presenta el problema?", options: ["Inicio", "Nudo", "Final", "Título"], correct: 1, category: "creativity", difficulty: Difficulty.MEDIUM },
    { question: "¿Qué combinación tiene alto contraste?", options: ["Blanco y negro", "Celeste y azul", "Verde y turquesa", "Rosa y lila"], correct: 0, category: "creativity", difficulty: Difficulty.MEDIUM },
    { question: "¿Qué es improvisar en arte?", options: ["Crear en el momento", "Copiar exacto", "No terminar", "Evitar ideas"], correct: 0, category: "creativity", difficulty: Difficulty.MEDIUM },
    { question: "¿Qué recurso hace un personaje más memorable?", options: ["Detalles únicos", "Sin rasgos", "Mismo peinado para todos", "Sin nombre"], correct: 0, category: "creativity", difficulty: Difficulty.MEDIUM },
    { question: "¿Qué color se obtiene al mezclar azul y rojo?", options: ["Naranja", "Violeta", "Verde", "Marrón"], correct: 1, category: "creativity", difficulty: Difficulty.EASY },
    { question: "¿Cuál de estas actividades entrena la imaginación?", options: ["Inventar finales", "Memorizar sin comprender", "Repetir siempre igual", "No dibujar"], correct: 0, category: "creativity", difficulty: Difficulty.EASY },
    { question: "¿Qué hace una paleta de colores en diseño?", options: ["Define combinaciones coherentes", "Borra errores", "Mide distancias", "Recorta papel"], correct: 0, category: "creativity", difficulty: Difficulty.HARD },
    { question: "¿Qué recurso literario compara usando \"como\"?", options: ["Metáfora", "Símil", "Hipérbole", "Rima"], correct: 1, category: "creativity", difficulty: Difficulty.HARD },
    { question: "¿Qué color suele asociarse con la naturaleza?", options: ["Verde", "Gris", "Negro", "Violeta"], correct: 0, category: "creativity", difficulty: Difficulty.EASY },
    { question: "¿Qué actividad combina papel doblado para crear figuras?", options: ["Origami", "Acuarela", "Escultura en piedra", "Fotografía"], correct: 0, category: "creativity", difficulty: Difficulty.EASY },
    { question: "¿Cuál de estas opciones fomenta ideas nuevas?", options: ["Hacer siempre lo mismo", "Explorar materiales distintos", "Evitar preguntas", "Copiar sin cambios"], correct: 1, category: "creativity", difficulty: Difficulty.MEDIUM },
    { question: "¿Qué significa \"boceto\" en arte?", options: ["Obra final enmarcada", "Dibujo rápido inicial", "Escultura de metal", "Foto editada"], correct: 1, category: "creativity", difficulty: Difficulty.EASY },
    { question: "¿Qué color resulta de mezclar rojo y blanco?", options: ["Marrón", "Rosa", "Naranja", "Beige"], correct: 1, category: "creativity", difficulty: Difficulty.EASY },
    { question: "¿Qué ayuda a construir una buena historieta?", options: ["Viñetas con secuencia", "Texto sin orden", "Solo un dibujo", "Sin personajes"], correct: 0, category: "creativity", difficulty: Difficulty.MEDIUM },
    { question: "¿Qué técnica usa recortes de revistas para componer una imagen?", options: ["Mosaico", "Collage", "Grabado", "Carboncillo"], correct: 1, category: "creativity", difficulty: Difficulty.EASY },
    { question: "¿Qué decisión mejora la armonía visual?", options: ["Usar demasiados estilos sin orden", "Mantener una paleta coherente", "Cambiar tipografía en cada palabra", "No dejar espacios"], correct: 1, category: "creativity", difficulty: Difficulty.HARD },
    { question: "¿Qué ejercicio creativo ayuda antes de escribir un cuento?", options: ["Lluvia de ideas", "Copiar una enciclopedia", "Memorizar fechas", "Borrar todo"], correct: 0, category: "creativity", difficulty: Difficulty.MEDIUM },
  ];

  const all = [...astronomy, ...math, ...science, ...history, ...geography, ...creativity];
  ensureNoDuplicateQuestions(all);
  return shuffleInPlace(all);
}

async function main() {
  await prisma.$transaction(
    async (tx) => {
      await tx.activityApproval.deleteMany();
      await tx.parentChildRelation.deleteMany();
      await tx.reaction.deleteMany();
      await tx.moderationLog.deleteMany();
      await tx.post.deleteMany();
      await tx.userAchievement.deleteMany();
      await tx.gameResult.deleteMany();
      await tx.friend.deleteMany();
      await tx.userInterest.deleteMany();
      await tx.userMission.deleteMany();
      await tx.screenTime.deleteMany();
      await tx.user.deleteMany();
      await tx.achievement.deleteMany();
      await tx.game.deleteMany();
      await tx.quizQuestion.deleteMany();
      await tx.visualQuestion.deleteMany();
      await tx.educationalContent.deleteMany();
      await tx.parentSettings.deleteMany();
      await tx.minorProfile.deleteMany();
      await tx.parentProfile.deleteMany();
      await tx.parent.deleteMany();
    },
    { timeout: 60_000 }
  );

  /**
   * Credenciales demo (entorno local / staging):
   * - Padres:
   *   - parent1@eduplay.demo / EduPlayDemo2026
   *   - parent2@eduplay.demo / EduPlayDemo2026
   * - Menores (username + password):
   *   - lucia_explora / EduPlayDemo2026
   *   - mateo_numeros / EduPlayDemo2026
   *   - sofia_ciencia / EduPlayDemo2026
   *   - daniel_mapas / EduPlayDemo2026
   *   - emma_lectora / EduPlayDemo2026
   */
  const demoParentPasswordHash = "$2b$10$sMZjqxFg2qdrdazBREswkeOfyJpD9CxtAfwTjzmZQPjiMB0p/wpVu";

  const [parent1, parent2] = await Promise.all([
    prisma.parent.create({
      data: {
        email: "parent1@eduplay.demo",
        password: demoParentPasswordHash,
      },
    }),
    prisma.parent.create({
      data: {
        email: "parent2@eduplay.demo",
        password: demoParentPasswordHash,
      },
    }),
  ]);

  const [parentUser1, parentUser2] = await Promise.all([
    prisma.user.create({
      data: {
        username: "parent1_demo",
        realName: "Padre Demo 1",
        passwordHash: demoParentPasswordHash,
        age: 37,
        parentId: parent1.id,
        type: UserType.parent,
        status: UserStatus.active,
        level: 1,
        experience: 0,
        parentAccountApprovedAt: new Date(),
      },
    }),
    prisma.user.create({
      data: {
        username: "parent2_demo",
        realName: "Padre Demo 2",
        passwordHash: demoParentPasswordHash,
        age: 39,
        parentId: parent2.id,
        type: UserType.parent,
        status: UserStatus.active,
        level: 1,
        experience: 0,
        parentAccountApprovedAt: new Date(),
      },
    }),
  ]);

  await Promise.all([
    prisma.parentProfile.create({
      data: {
        userId: parentUser1.id,
        verificationStatus: VerificationStatus.verified,
        verificationMethod: VerificationMethod.email,
        subscriptionTier: SubscriptionTier.premium,
      },
    }),
    prisma.parentProfile.create({
      data: {
        userId: parentUser2.id,
        verificationStatus: VerificationStatus.pending,
        verificationMethod: VerificationMethod.phone,
        subscriptionTier: SubscriptionTier.basic,
      },
    }),
  ]);

  const users = await Promise.all([
    prisma.user.create({
      data: {
        username: "lucia_explora",
        realName: "Lucía Fernández",
        passwordHash: demoParentPasswordHash,
        age: 8,
        parentId: parent1.id,
        type: UserType.minor,
        status: UserStatus.active,
        level: 3,
        experience: 45,
        avatarUrl: null,
        parentAccountApprovedAt: new Date(),
      },
    }),
    prisma.user.create({
      data: {
        username: "mateo_numeros",
        realName: "Mateo Gómez",
        passwordHash: demoParentPasswordHash,
        age: 10,
        parentId: parent1.id,
        type: UserType.minor,
        status: UserStatus.active,
        level: 2,
        experience: 30,
        avatarUrl: null,
        parentAccountApprovedAt: new Date(),
      },
    }),
    prisma.user.create({
      data: {
        username: "sofia_ciencia",
        realName: "Sofía Martín",
        passwordHash: demoParentPasswordHash,
        age: 6,
        parentId: parent1.id,
        type: UserType.minor,
        status: UserStatus.inactive,
        level: 4,
        experience: 20,
        avatarUrl: null,
        parentAccountApprovedAt: null,
      },
    }),
    prisma.user.create({
      data: {
        username: "daniel_mapas",
        realName: "Daniel Ruiz",
        passwordHash: demoParentPasswordHash,
        age: 12,
        parentId: parent2.id,
        type: UserType.minor,
        status: UserStatus.active,
        level: 2,
        experience: 80,
        avatarUrl: null,
        parentAccountApprovedAt: new Date(),
      },
    }),
    prisma.user.create({
      data: {
        username: "emma_lectora",
        realName: "Emma Torres",
        passwordHash: demoParentPasswordHash,
        age: 9,
        parentId: parent2.id,
        type: UserType.minor,
        status: UserStatus.active,
        level: 3,
        experience: 10,
        avatarUrl: null,
        parentAccountApprovedAt: new Date(),
      },
    }),
  ]);

  const [u1, u2, u3, u4, u5] = users;

  await Promise.all([
    prisma.minorProfile.create({
      data: {
        userId: u1.id,
        parentId: parentUser1.id,
        age: 8,
        gradeLevel: "3rd",
        school: "Escuela Aurora",
        interests: ["science", "creativity"],
        dailyTimeLimit: 60,
        contentRestrictions: { allowExternalLinks: false, chatFilterLevel: "high" },
        canMakePurchases: false,
        canAddFriends: false,
        canPostContent: false,
      },
    }),
    prisma.minorProfile.create({
      data: {
        userId: u2.id,
        parentId: parentUser1.id,
        age: 10,
        gradeLevel: "5th",
        school: "Colegio Horizonte",
        interests: ["math", "science"],
        dailyTimeLimit: 90,
        contentRestrictions: { allowExternalLinks: false, chatFilterLevel: "medium" },
        canMakePurchases: false,
        canAddFriends: true,
        canPostContent: true,
      },
    }),
    prisma.minorProfile.create({
      data: {
        userId: u3.id,
        parentId: parentUser1.id,
        age: 6,
        gradeLevel: "1st",
        school: "Jardín Semillas",
        interests: ["science", "art"],
        dailyTimeLimit: 45,
        contentRestrictions: { allowExternalLinks: false, chatFilterLevel: "high", approveEverything: true },
        canMakePurchases: false,
        canAddFriends: false,
        canPostContent: false,
      },
    }),
    prisma.minorProfile.create({
      data: {
        userId: u4.id,
        parentId: parentUser2.id,
        age: 12,
        gradeLevel: "7th",
        school: "Instituto Rutas",
        interests: ["geography", "math"],
        dailyTimeLimit: 120,
        contentRestrictions: { allowExternalLinks: true, chatFilterLevel: "low" },
        canMakePurchases: false,
        canAddFriends: true,
        canPostContent: true,
      },
    }),
    prisma.minorProfile.create({
      data: {
        userId: u5.id,
        parentId: parentUser2.id,
        age: 9,
        gradeLevel: "4th",
        school: "Escuela Letras",
        interests: ["education", "creativity"],
        dailyTimeLimit: 75,
        contentRestrictions: { allowExternalLinks: false, chatFilterLevel: "medium" },
        canMakePurchases: false,
        canAddFriends: true,
        canPostContent: true,
      },
    }),
  ]);

  await prisma.parentChildRelation.createMany({
    data: [
      {
        parentId: parentUser1.id,
        childId: u1.id,
        status: ParentChildRelationStatus.active,
        approvalRequiredFor: ["friend_request", "post", "purchase", "content_access"],
      },
      {
        parentId: parentUser1.id,
        childId: u2.id,
        status: ParentChildRelationStatus.active,
        approvalRequiredFor: ["purchase", "content_access"],
      },
      {
        parentId: parentUser1.id,
        childId: u3.id,
        status: ParentChildRelationStatus.pending,
        approvalRequiredFor: ["friend_request", "post", "purchase", "content_access"],
      },
      {
        parentId: parentUser2.id,
        childId: u4.id,
        status: ParentChildRelationStatus.active,
        approvalRequiredFor: ["purchase"],
      },
      {
        parentId: parentUser2.id,
        childId: u5.id,
        status: ParentChildRelationStatus.active,
        approvalRequiredFor: ["friend_request", "purchase"],
      },
    ],
  });

  await prisma.activityApproval.createMany({
    data: [
      {
        minorId: u3.id,
        parentId: parentUser1.id,
        activityType: ActivityType.content_access,
        activityData: { contentCategory: "science", requestedBy: "sofia_ciencia" },
        status: ActivityApprovalStatus.pending,
      },
      {
        minorId: u1.id,
        parentId: parentUser1.id,
        activityType: ActivityType.friend_request,
        activityData: { targetUsername: "emma_lectora" },
        status: ActivityApprovalStatus.approved,
        respondedAt: new Date(),
      },
      {
        minorId: u4.id,
        parentId: parentUser2.id,
        activityType: ActivityType.post,
        activityData: { draftTitle: "Mi mapa del mundo" },
        status: ActivityApprovalStatus.approved,
        respondedAt: new Date(),
      },
    ],
  });

  const games = await Promise.all([
    prisma.game.create({
      data: { name: "Matemáticas rápidas", category: ContentCategory.math, difficulty: "medium" },
    }),
    prisma.game.create({
      data: { name: "Viaje por el cosmos", category: ContentCategory.astronomy, difficulty: "easy" },
    }),
    prisma.game.create({
      data: { name: "Laboratorio virtual", category: ContentCategory.science, difficulty: "hard" },
    }),
    prisma.game.create({
      data: { name: "Capitales del mundo", category: ContentCategory.geography, difficulty: "medium" },
    }),
    prisma.game.create({
      data: { name: "Línea del tiempo", category: ContentCategory.history, difficulty: "easy" },
    }),
    prisma.game.create({
      data: {
        name: "Quiz de historia",
        category: ContentCategory.history,
        difficulty: "medium",
      },
    }),
    prisma.game.create({
      data: {
        name: "Desafío geográfico",
        category: ContentCategory.geography,
        difficulty: "medium",
      },
    }),
    prisma.game.create({
      data: {
        name: "Tarea creativa de dibujo",
        category: ContentCategory.creativity,
        difficulty: "easy",
      },
    }),
    prisma.game.create({
      data: {
        name: "Programación para principiantes",
        category: ContentCategory.science,
        difficulty: "medium",
      },
    }),
  ]);

  const gMath = games[0]!;
  const gAstro = games[1]!;
  const gQuizHistoria = games[5]!;
  const gDesafioGeo = games[6]!;
  const gDibujoCreativo = games[7]!;
  const gProgBasics = games[8]!;

  await prisma.educationalContent.createMany({
    data: [
      {
        title: "¿Qué es el sistema solar?",
        description: "Una explicación corta del lugar donde está la Tierra.",
        content:
          "El sistema solar es como una gran familia en el espacio. El Sol está en el centro y le da luz y calor a los planetas. La Tierra es uno de esos planetas y gira alrededor del Sol junto con otros como Marte y Júpiter.",
        category: "Astronomy",
        difficulty: Difficulty.EASY,
        imageUrl: null,
      },
      {
        title: "Los planetas del sistema solar",
        description: "Aprende los nombres de los planetas en orden.",
        content:
          "Los planetas, desde el más cercano al Sol, son: Mercurio, Venus, Tierra, Marte, Júpiter, Saturno, Urano y Neptuno. Cada planeta es diferente: algunos son rocosos y otros son gigantes de gas. Recordar su orden es un juego divertido.",
        category: "Astronomy",
        difficulty: Difficulty.EASY,
        imageUrl: null,
      },
      {
        title: "¿Qué es una fracción?",
        description: "Entiende las fracciones con ejemplos fáciles.",
        content:
          "Una fracción muestra una parte de un todo. Si una pizza está cortada en 4 partes iguales y comes 1 parte, comiste 1/4. Las fracciones nos ayudan a repartir cosas de forma justa.",
        category: "Math",
        difficulty: Difficulty.EASY,
        imageUrl: null,
      },
      {
        title: "Suma y resta básica",
        description: "Practica operaciones simples de todos los días.",
        content:
          "Sumar es juntar cantidades y restar es quitar cantidades. Por ejemplo: 3 + 2 = 5 y 5 - 2 = 3. Usamos suma y resta cuando contamos juguetes, lápices o frutas.",
        category: "Math",
        difficulty: Difficulty.EASY,
        imageUrl: null,
      },
      {
        title: "Estados de la materia",
        description: "Descubre cómo pueden cambiar los materiales.",
        content:
          "La materia puede estar en estado sólido, líquido o gaseoso. El hielo es sólido, el agua es líquida y el vapor es gas. A veces la materia cambia de estado con el frío o el calor.",
        category: "Science",
        difficulty: Difficulty.MEDIUM,
        imageUrl: null,
      },
      {
        title: "¿Qué es la energía?",
        description: "Una idea sencilla de dónde viene la energía.",
        content:
          "La energía es lo que permite que las cosas se muevan o funcionen. Tu cuerpo usa energía de los alimentos para correr y jugar. También usamos energía del Sol, del viento y de la electricidad en casa.",
        category: "Science",
        difficulty: Difficulty.MEDIUM,
        imageUrl: null,
      },
      {
        title: "Antiguo Egipto",
        description: "Conoce una civilización muy antigua y fascinante.",
        content:
          "El Antiguo Egipto fue una civilización que vivió hace miles de años cerca del río Nilo. Construyeron pirámides y tenían faraones, que eran sus gobernantes. También escribían con símbolos llamados jeroglíficos.",
        category: "History",
        difficulty: Difficulty.MEDIUM,
        imageUrl: null,
      },
      {
        title: "La Edad Media",
        description: "Una introducción amigable a esta etapa histórica.",
        content:
          "La Edad Media fue un periodo de la historia entre la Antigüedad y la Edad Moderna. Había castillos, caballeros y aldeas. En ese tiempo, las personas vivían y trabajaban de forma muy distinta a la actualidad.",
        category: "History",
        difficulty: Difficulty.MEDIUM,
        imageUrl: null,
      },
    ],
  });

  await prisma.quizQuestion.createMany({
    data: buildQuizSeedRows(),
  });

  await prisma.visualQuestion.createMany({
    data: buildVisualSeedRows().map((row) => ({
      imageUrl: row.imageUrl,
      question: row.question,
      options: row.options,
      correct: row.correct,
      category: row.category,
      difficulty: row.difficulty,
    })),
  });

  const achievements = await Promise.all([
    prisma.achievement.create({
      data: {
        title: "Primera suma perfecta",
        description: "Completa tu primer reto de sumas sin errores.",
        category: ContentCategory.math,
        badgeColor: "#2563eb",
        badgeIcon: "➗",
        rarity: AchievementRarity.COMMON,
      },
    }),
    prisma.achievement.create({
      data: {
        title: "Explorador del sistema solar",
        description: "Identifica los planetas en orden.",
        category: ContentCategory.astronomy,
        badgeColor: "#7c3aed",
        badgeIcon: "🌌",
        rarity: AchievementRarity.RARE,
      },
    }),
    prisma.achievement.create({
      data: {
        title: "Científico en práctica",
        description: "Termina un módulo de experimentos virtuales.",
        category: ContentCategory.science,
        badgeColor: "#059669",
        badgeIcon: "🧪",
        rarity: AchievementRarity.COMMON,
      },
    }),
    prisma.achievement.create({
      data: {
        title: "Lector curioso",
        description: "Lee tres textos educativos seguidos.",
        category: ContentCategory.education,
        badgeColor: "#d97706",
        badgeIcon: "📚",
        rarity: AchievementRarity.COMMON,
      },
    }),
    prisma.achievement.create({
      data: {
        title: "Maestro del mapa",
        description: "Localiza 10 capitales correctamente.",
        category: ContentCategory.geography,
        badgeColor: "#0ea5e9",
        badgeIcon: "🌍",
        rarity: AchievementRarity.EPIC,
      },
    }),
    prisma.achievement.create({
      data: {
        title: "Rompecabezas maestro",
        description: "Completa un puzzle avanzado sin ayuda.",
        category: ContentCategory.puzzle,
        badgeColor: "#db2777",
        badgeIcon: "🧩",
        rarity: AchievementRarity.RARE,
      },
    }),
    prisma.achievement.create({
      data: {
        title: "Historiador experto 📜",
        description: "Responde correctamente 20 preguntas de historia en el quiz.",
        category: ContentCategory.history,
        badgeColor: "#b45309",
        badgeIcon: "📜",
        rarity: AchievementRarity.EPIC,
      },
    }),
    prisma.achievement.create({
      data: {
        title: "Explorador del mundo 🌍",
        description: "Completa el desafío geográfico con al menos 90% de aciertos.",
        category: ContentCategory.geography,
        badgeColor: "#0284c7",
        badgeIcon: "🌍",
        rarity: AchievementRarity.RARE,
      },
    }),
    prisma.achievement.create({
      data: {
        title: "Artista creativo 🎨",
        description: "Termina tres tareas creativas de dibujo con buena valoración.",
        category: ContentCategory.creativity,
        badgeColor: "#db2777",
        badgeIcon: "🎨",
        rarity: AchievementRarity.RARE,
      },
    }),
  ]);

  const [achMath, achAstro, achScience, achEdu, achGeo, achPuzzle, achHistExpert, achGeoExplorer, achArtist] =
    achievements;

  /* 10 publicaciones: 5 POST + 2 GAME_RESULT + 3 ACHIEVEMENT */

  await prisma.post.create({
    data: {
      userId: u1.id,
      type: PostType.POST,
      visibility: Visibility.PUBLIC,
      content: "Aprendí sobre el sistema solar 🌌",
      category: ContentCategory.astronomy,
      imageUrl: null,
    },
  });

  await prisma.post.create({
    data: {
      userId: u2.id,
      type: PostType.POST,
      visibility: Visibility.PUBLIC,
      content: "Resolví problemas de matemáticas ➗",
      category: ContentCategory.math,
      imageUrl: null,
    },
  });

  await prisma.post.create({
    data: {
      userId: u3.id,
      type: PostType.POST,
      visibility: Visibility.PUBLIC,
      content: "Hice experimentos con mezclas y volúmenes en el laboratorio virtual 🧪",
      category: ContentCategory.science,
      imageUrl: null,
    },
  });

  await prisma.post.create({
    data: {
      userId: u4.id,
      type: PostType.POST,
      visibility: Visibility.PUBLIC,
      content: "Leí un texto sobre inventores y cómo cambió la ciencia 📚",
      category: ContentCategory.education,
      imageUrl: null,
    },
  });

  await prisma.post.create({
    data: {
      userId: u5.id,
      type: PostType.POST,
      visibility: Visibility.PUBLIC,
      content: "Geografía: aprendí los océanos y mares más importantes 🌊",
      category: ContentCategory.geography,
      imageUrl: null,
    },
  });

  const gr1 = await prisma.gameResult.create({
    data: { userId: u1.id, gameId: gMath.id, score: 185 },
  });
  await prisma.post.create({
    data: {
      userId: u1.id,
      type: PostType.GAME_RESULT,
      visibility: Visibility.PUBLIC,
      content: "Completé un juego con puntuación 185 🎮",
      category: gMath.category,
      gameResultId: gr1.id,
      imageUrl: null,
    },
  });

  const gr2 = await prisma.gameResult.create({
    data: { userId: u2.id, gameId: gAstro.id, score: 220 },
  });
  await prisma.post.create({
    data: {
      userId: u2.id,
      type: PostType.GAME_RESULT,
      visibility: Visibility.PUBLIC,
      content: "Completé un juego con puntuación 220 🎮",
      category: gAstro.category,
      gameResultId: gr2.id,
      imageUrl: null,
    },
  });

  const ua1 = await prisma.userAchievement.create({
    data: { userId: u4.id, achievementId: achGeo.id },
  });
  await prisma.post.create({
    data: {
      userId: u4.id,
      type: PostType.ACHIEVEMENT,
      visibility: Visibility.PUBLIC,
      content: "¡Desbloqueé el logro Maestro del mapa! 🌍",
      category: achGeo.category,
      userAchievementId: ua1.id,
      imageUrl: null,
    },
  });

  const ua2 = await prisma.userAchievement.create({
    data: { userId: u5.id, achievementId: achPuzzle.id },
  });
  await prisma.post.create({
    data: {
      userId: u5.id,
      type: PostType.ACHIEVEMENT,
      visibility: Visibility.PUBLIC,
      content: "¡Desbloqueé el logro Rompecabezas maestro! 🧩",
      category: achPuzzle.category,
      userAchievementId: ua2.id,
      imageUrl: null,
    },
  });

  const ua3 = await prisma.userAchievement.create({
    data: { userId: u1.id, achievementId: achMath.id },
  });
  await prisma.post.create({
    data: {
      userId: u1.id,
      type: PostType.ACHIEVEMENT,
      visibility: Visibility.PUBLIC,
      content: "¡Desbloqueé el logro Primera suma perfecta! ➗",
      category: achMath.category,
      userAchievementId: ua3.id,
      imageUrl: null,
    },
  });

  await prisma.post.createMany({
    data: [
      {
        userId: u1.id,
        type: PostType.POST,
        visibility: Visibility.PUBLIC,
        content:
          "Repasé civilizaciones antiguas con el quiz de historia: Egipto, Grecia y Roma 🏛️",
        category: ContentCategory.history,
        imageUrl: null,
      },
      {
        userId: u2.id,
        type: PostType.POST,
        visibility: Visibility.PUBLIC,
        content:
          "Completé un rompecabezas de 100 piezas sobre mapamundi: buen entrenamiento para la memoria 🧩",
        category: ContentCategory.puzzle,
        imageUrl: null,
      },
      {
        userId: u3.id,
        type: PostType.POST,
        visibility: Visibility.PUBLIC,
        content:
          "Hoy practiqué coordinación con ejercicios inspirados en deportes de equipo ⚽",
        category: ContentCategory.sports,
        imageUrl: null,
      },
      {
        userId: u4.id,
        type: PostType.POST,
        visibility: Visibility.PUBLIC,
        content:
          "Fracciones y porcentajes en la vida real: recetas y repartos de pizza 🍕",
        category: ContentCategory.math,
        imageUrl: null,
      },
      {
        userId: u5.id,
        type: PostType.POST,
        visibility: Visibility.PUBLIC,
        content:
          "Observé la Luna y aprendí las fases con un dibujo en el cuaderno 🌙",
        category: ContentCategory.astronomy,
        imageUrl: null,
      },
      {
        userId: u1.id,
        type: PostType.POST,
        visibility: Visibility.PUBLIC,
        content:
          "Experimento casero: densidad con agua, sal y huevo — ¡flotó! 🧪",
        category: ContentCategory.science,
        imageUrl: null,
      },
      {
        userId: u2.id,
        type: PostType.POST,
        visibility: Visibility.PUBLIC,
        content:
          "Ríos y cuencas: tracé el recorrido del Amazonas en el mapa interactivo 🗺️",
        category: ContentCategory.geography,
        imageUrl: null,
      },
      {
        userId: u3.id,
        type: PostType.POST,
        visibility: Visibility.PUBLIC,
        content:
          "Leí una ficha sobre hábitos de estudio y tomé notas con colores 📖",
        category: ContentCategory.education,
        imageUrl: null,
      },
      {
        userId: u4.id,
        type: PostType.POST,
        visibility: Visibility.PUBLIC,
        content:
          "Tarea creativa de dibujo: inventé un personaje y su mundo en tres viñetas ✏️",
        category: ContentCategory.education,
        imageUrl: null,
      },
      {
        userId: u5.id,
        type: PostType.POST,
        visibility: Visibility.PUBLIC,
        content:
          "Secuencias y bucles en programación: hice que el personaje repita un patrón 💻",
        category: ContentCategory.science,
        imageUrl: null,
      },
    ],
  });

  const gr3 = await prisma.gameResult.create({
    data: { userId: u3.id, gameId: gQuizHistoria.id, score: 300 },
  });
  await prisma.post.create({
    data: {
      userId: u3.id,
      type: PostType.GAME_RESULT,
      visibility: Visibility.PUBLIC,
      content: "¡300 puntos en Quiz de historia! 📜",
      category: gQuizHistoria.category,
      gameResultId: gr3.id,
      imageUrl: null,
    },
  });

  const gr4 = await prisma.gameResult.create({
    data: { userId: u4.id, gameId: gDesafioGeo.id, score: 260 },
  });
  await prisma.post.create({
    data: {
      userId: u4.id,
      type: PostType.GAME_RESULT,
      visibility: Visibility.PUBLIC,
      content: "Desafío geográfico completado con 260 puntos 🌍",
      category: gDesafioGeo.category,
      gameResultId: gr4.id,
      imageUrl: null,
    },
  });

  const gr5 = await prisma.gameResult.create({
    data: { userId: u2.id, gameId: gDibujoCreativo.id, score: 195 },
  });
  await prisma.post.create({
    data: {
      userId: u2.id,
      type: PostType.GAME_RESULT,
      visibility: Visibility.PUBLIC,
      content: "Terminé la tarea creativa de dibujo con 195 puntos 🎨",
      category: gDibujoCreativo.category,
      gameResultId: gr5.id,
      imageUrl: null,
    },
  });

  const gr6 = await prisma.gameResult.create({
    data: { userId: u5.id, gameId: gProgBasics.id, score: 240 },
  });
  await prisma.post.create({
    data: {
      userId: u5.id,
      type: PostType.GAME_RESULT,
      visibility: Visibility.PUBLIC,
      content: "Primer módulo de programación para principiantes: 240 pts 💻",
      category: gProgBasics.category,
      gameResultId: gr6.id,
      imageUrl: null,
    },
  });

  const uaHist = await prisma.userAchievement.create({
    data: { userId: u2.id, achievementId: achHistExpert.id },
  });
  await prisma.post.create({
    data: {
      userId: u2.id,
      type: PostType.ACHIEVEMENT,
      visibility: Visibility.PUBLIC,
      content: "¡Desbloqueé el logro Historiador experto 📜!",
      category: achHistExpert.category,
      userAchievementId: uaHist.id,
      imageUrl: null,
    },
  });

  const uaGeoExp = await prisma.userAchievement.create({
    data: { userId: u3.id, achievementId: achGeoExplorer.id },
  });
  await prisma.post.create({
    data: {
      userId: u3.id,
      type: PostType.ACHIEVEMENT,
      visibility: Visibility.PUBLIC,
      content: "¡Desbloqueé el logro Explorador del mundo 🌍!",
      category: achGeoExplorer.category,
      userAchievementId: uaGeoExp.id,
      imageUrl: null,
    },
  });

  const uaArt = await prisma.userAchievement.create({
    data: { userId: u4.id, achievementId: achArtist.id },
  });
  await prisma.post.create({
    data: {
      userId: u4.id,
      type: PostType.ACHIEVEMENT,
      visibility: Visibility.PUBLIC,
      content: "¡Desbloqueé el logro Artista creativo 🎨!",
      category: achArtist.category,
      userAchievementId: uaArt.id,
      imageUrl: null,
    },
  });

  await prisma.userAchievement.create({
    data: { userId: u2.id, achievementId: achAstro.id },
  });
  await prisma.userAchievement.create({
    data: { userId: u3.id, achievementId: achScience.id },
  });
  await prisma.userAchievement.create({
    data: { userId: u5.id, achievementId: achEdu.id },
  });

  const acceptedFriend = {
    status: FriendStatus.ACCEPTED,
    requiresParentApproval: false,
    parentApproved: true,
  };

  await prisma.friend.createMany({
    data: [
      { userId: u1.id, friendId: u2.id, ...acceptedFriend },
      { userId: u2.id, friendId: u1.id, ...acceptedFriend },
      { userId: u1.id, friendId: u3.id, ...acceptedFriend },
      { userId: u3.id, friendId: u1.id, ...acceptedFriend },
      { userId: u2.id, friendId: u4.id, ...acceptedFriend },
      { userId: u4.id, friendId: u2.id, ...acceptedFriend },
      { userId: u3.id, friendId: u5.id, ...acceptedFriend },
      { userId: u5.id, friendId: u3.id, ...acceptedFriend },
    ],
  });

  const allPosts = await prisma.post.findMany({
    select: { id: true },
    orderBy: { createdAt: "asc" },
    take: 10,
  });

  if (allPosts.length >= 4) {
    await prisma.reaction.createMany({
      data: [
        { userId: u2.id, postId: allPosts[0]!.id, type: ReactionType.LIKE },
        { userId: u3.id, postId: allPosts[0]!.id, type: ReactionType.STAR },
        { userId: u1.id, postId: allPosts[1]!.id, type: ReactionType.CLAP },
        { userId: u4.id, postId: allPosts[2]!.id, type: ReactionType.LIKE },
        { userId: u5.id, postId: allPosts[3]!.id, type: ReactionType.STAR },
      ],
      skipDuplicates: true,
    });
  }

  console.log(
    "Seed OK: padres demo + menores con perfiles/restricciones, relaciones parent-child, aprobaciones de actividad, juegos/logros/posts y reacciones."
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
