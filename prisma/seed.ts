/**
 * Seed curado de EduPlay.
 *
 * Modo completo (por defecto):
 *   npm run db:seed
 *   Borra la base y recrea todo (cuentas demo + catálogo).
 *
 * Modo seguro (conserva usuarios ya creados; no ejecuta clearDatabase ni cuentas demo):
 *   npm run db:seed:safe
 *   También podés usar la variable SEED_SKIP_DB_CLEAR=1 (ver script en package.json).
 *
 * Si el catálogo educativo ya existe (al menos una fila en EducationalCategory), en modo seguro no se inserta de nuevo para evitar duplicados por unique/slug.
 *
 * Credenciales demo (solo tras modo completo):
 * - Padres: maria@eduplay.demo, carlos@eduplay.demo, ana@eduplay.demo
 * - Menores: lucia_demo, mateo_demo, sofia_demo, daniel_demo, emma_demo
 * - Contraseña para todos: EduPlay2024!
 */
import "dotenv/config";
import bcrypt from "bcrypt";
import type { Prisma } from "@prisma/client";
import {
  AchievementRarity,
  AchievementSystemKind,
  ChallengeBucket,
  ContentCategory,
  Difficulty,
  EducationalContentType,
  LiveEventStatus,
  MissionType,
  NotificationKind,
  ParentChildRelationStatus,
  PrismaClient,
  QuizKnowledgeArea,
  QuizQuestionType,
  StreakKind,
  SubscriptionTier,
  UserStatus,
  UserType,
  VerificationMethod,
  VerificationStatus,
} from "@prisma/client";

import { LEARN_MARKDOWN_BY_TOPIC_KEY } from "./learnBodiesSeed";
import { EDUCATIONAL_ASSET_SEED_DATA } from "./lib/educationalAssetCatalog";
import { ES_NAME_TO_FLAG_CODE } from "./lib/countryFlagsSeed";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "EduPlay2024!";
const BCRYPT_ROUNDS = 10;

export const CHILD_LOGINS = {
  lucia: "lucia_demo",
  mateo: "mateo_demo",
  sofia: "sofia_demo",
  daniel: "daniel_demo",
  emma: "emma_demo",
} as const;

type TopicKey =
  | "sistema-solar"
  | "sumas-restas"
  | "estados-materia"
  | "civilizaciones-antiguas"
  | "paises-capitales"
  | "colores-arte"
  | "dinosaurios"
  | "logica-acertijos"
  | "musica-instrumentos"
  | "comprension-luna"
  | "metamorfosis"
  | "volcan-casero"
  | "egipto-ninos"
  | "frida-kahlo"
  | "mapamundi"
  | "tablas"
  | "selva";

type QuizQuestionSeed = {
  text: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  /** `EducationalAsset.name` del catálogo (p. ej. `bandera_cn`). */
  imageAssetName?: string;
};

type QuizSeed = {
  title: string;
  description: string;
  category: ContentCategory;
  topicKey: TopicKey;
  difficulty: Difficulty;
  knowledgeArea: QuizKnowledgeArea;
  readingPassage?: string;
  questions: QuizQuestionSeed[];
};

type ContentSeed = {
  title: string;
  description: string;
  type: EducationalContentType;
  category: string;
  difficulty: Difficulty;
  topicKey: TopicKey;
  durationMinutes: number;
  data: Prisma.JsonObject;
};

type VisualQuestionSeed = {
  /** Clave única en `EducationalAsset.name` (catálogo Commons). */
  assetName: string;
  imageLabel: string;
  question: string;
  options: string[];
  correctAnswer: string;
  category: string;
  difficulty: Difficulty;
};

function logStep(msg: string): void {
  console.log(`[seed] ${msg}`);
}

function handleSeedError(err: unknown): never {
  console.error("[seed] Error:", err);
  if (err instanceof Error) console.error(err.stack);
  throw err;
}

/** Modo seguro: no borrar la BD ni crear cuentas demo (solo catálogo si está vacío). */
function seedSkipDbClear(): boolean {
  const v = process.env.SEED_SKIP_DB_CLEAR?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function correctIndex(question: QuizQuestionSeed | VisualQuestionSeed): number {
  const index = question.options.indexOf(question.correctAnswer);
  if (index < 0) {
    throw new Error(`Respuesta correcta no encontrada: ${question.correctAnswer}`);
  }
  return index;
}

function imageUrl(label: string): string {
  return `https://placehold.co/900x675/png?text=${encodeURIComponent(label)}`;
}

function assetSlug(label: string): string {
  return label
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function makeOptions(answer: string, pool: readonly string[]): string[] {
  return [answer, ...pool.filter((option) => option !== answer)].slice(0, 4);
}

async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

async function clearDatabase(): Promise<void> {
  await prisma.$transaction(
    async (tx) => {
      await tx.contentReport.deleteMany();
      await tx.reaction.deleteMany();
      await tx.post.deleteMany();
      await tx.userAchievement.deleteMany();
      await tx.gameResult.deleteMany();
      await tx.activityApproval.deleteMany();
      await tx.parentChildRelation.deleteMany();
      await tx.quizSession.deleteMany();
      await tx.quizAttempt.deleteMany();
      await tx.userQuizFlashcard.deleteMany();
      await tx.quizQuestion.deleteMany();
      await tx.quiz.deleteMany();
      await tx.miniGameSession.deleteMany();
      await tx.studyGroupMessage.deleteMany();
      await tx.studyGroupMember.deleteMany();
      await tx.studyGroup.deleteMany();
      await tx.liveEventAttendee.deleteMany();
      await tx.liveEvent.deleteMany();
      await tx.appNotification.deleteMany();
      await tx.userStreak.deleteMany();
      await tx.userGamificationSnapshot.deleteMany();
      await tx.thematicMissionVote.deleteMany();
      await tx.userThematicMissionProgress.deleteMany();
      await tx.thematicMission.deleteMany();
      await tx.educationalContent.deleteMany();
      await tx.educationalTopic.deleteMany();
      await tx.educationalSubject.deleteMany();
      await tx.educationalCategory.deleteMany();
      await tx.chatMessage.deleteMany();
      await tx.chat.deleteMany();
      await tx.message.deleteMany();
      await tx.friend.deleteMany();
      await tx.userMission.deleteMany();
      await tx.mission.deleteMany();
      await tx.dailyChallengeBonus.deleteMany();
      await tx.userGamifiedChallenge.deleteMany();
      await tx.xpGainLedger.deleteMany();
      await tx.analyticsEvent.deleteMany();
      await tx.userInterest.deleteMany();
      await tx.moderationLog.deleteMany();
      await tx.visualQuestion.deleteMany();
      await tx.educationalAsset.deleteMany();
      await tx.userMediaUpload.deleteMany();
      await tx.quizDailyProgress.deleteMany();
      await tx.userQuizStreak.deleteMany();
      await tx.userQuizAreaSkill.deleteMany();
      await tx.iapProcessedTransaction.deleteMany();
      await tx.parentUserBlock.deleteMany();
      await tx.parentFamilyEvent.deleteMany();
      await tx.parentSettings.deleteMany();
      await tx.screenTime.deleteMany();
      await tx.minorProfile.deleteMany();
      await tx.parentProfile.deleteMany();
      await tx.achievement.deleteMany();
      await tx.game.deleteMany();
      await tx.miniGame.deleteMany();
      await tx.user.deleteMany();
      await tx.parent.deleteMany();
    },
    { timeout: 120_000 },
  );
}

const CATEGORIES = [
  {
    slug: "ciencias-naturales",
    name: "Ciencias Naturales",
    icon: "🧪",
    subjects: [
      {
        slug: "espacio-y-vida",
        name: "Espacio, vida y materia",
        topics: [
          ["sistema-solar", "Sistema Solar", "Planetas, Sol, Luna y órbitas."],
          ["estados-materia", "Estados de la materia", "Sólidos, líquidos, gases y cambios cotidianos."],
          ["dinosaurios", "Dinosaurios", "Animales prehistóricos, fósiles y extinción."],
          ["metamorfosis", "Metamorfosis", "Transformación de oruga a mariposa."],
          ["volcan-casero", "Experimentos seguros", "Reacciones químicas simples para observar en casa."],
          ["selva", "Animales de la selva", "Fauna, sonidos, hábitats y conservación."],
        ],
      },
    ],
  },
  {
    slug: "matematicas",
    name: "Matemáticas",
    icon: "🔢",
    subjects: [
      {
        slug: "numeros-y-tablas",
        name: "Números y tablas",
        topics: [
          ["sumas-restas", "Sumas y restas divertidas", "Operaciones con situaciones de la vida diaria."],
          ["tablas", "Tablas de multiplicar", "Patrones y canciones para multiplicar."],
        ],
      },
    ],
  },
  {
    slug: "ciencias-sociales",
    name: "Ciencias Sociales",
    icon: "🌍",
    subjects: [
      {
        slug: "historia-y-geografia",
        name: "Historia y geografía",
        topics: [
          ["civilizaciones-antiguas", "Civilizaciones antiguas", "Egipto, Roma y hechos históricos."],
          ["paises-capitales", "Países y capitales", "Continentes, países, capitales y ríos."],
          ["egipto-ninos", "Niños del Antiguo Egipto", "Vida cotidiana hace 3.000 años."],
          ["mapamundi", "Mapamundi interactivo", "Continentes, animales y curiosidades."],
        ],
      },
    ],
  },
  {
    slug: "arte-y-cultura",
    name: "Arte y Cultura",
    icon: "🎨",
    subjects: [
      {
        slug: "arte-musica",
        name: "Arte y música",
        topics: [
          ["colores-arte", "Colores y arte", "Mezclas, artistas y arcoíris."],
          ["musica-instrumentos", "Música e instrumentos", "Notas, familias de instrumentos y compositores."],
          ["frida-kahlo", "Frida Kahlo", "Autorretratos, símbolos y legado."],
        ],
      },
    ],
  },
  {
    slug: "lenguaje",
    name: "Lenguaje",
    icon: "📖",
    subjects: [
      {
        slug: "lectura",
        name: "Lectura",
        topics: [["comprension-luna", "Comprensión lectora", "Leer, recordar detalles e interpretar una historia."]],
      },
    ],
  },
  {
    slug: "pensamiento-logico",
    name: "Pensamiento Lógico",
    icon: "🧠",
    subjects: [
      {
        slug: "acertijos",
        name: "Lógica y acertijos",
        topics: [["logica-acertijos", "Lógica y acertijos", "Deducciones, trampas de lenguaje y patrones."]],
      },
    ],
  },
] as const;

const LUNA_PASSAGE =
  "Era un día soleado y Luna estaba aburrida. No sabía qué hacer. De pronto, vio algo brillante entre las flores de su jardín. ¡Era un mapa antiguo! Luna siguió las pistas del mapa con la ayuda de su gato Milo. Cruzaron el jardín, pasaron por el árbol grande y llegaron al final del camino. Allí encontraron un cofre. Luna lo abrió con emoción. ¡Era un cofre lleno de libros antiguos sobre aventuras y magia! Luna aprendió que la verdadera aventura está en las historias que leemos.";

const QUIZZES: QuizSeed[] = [
  {
    title: "🪐 Planetas del Sistema Solar",
    description: "Descubrí los secretos de nuestros vecinos espaciales.",
    category: ContentCategory.astronomy,
    topicKey: "sistema-solar",
    difficulty: Difficulty.EASY,
    knowledgeArea: QuizKnowledgeArea.natural_sciences,
    questions: [
      { text: "¿Cuál es el planeta más grande del sistema solar?", options: ["Marte", "Júpiter", "Saturno", "Tierra"], correctAnswer: "Júpiter", explanation: "🪐 ¡Júpiter es enorme! Cabrían 1.300 Tierras dentro de él. Tiene una mancha roja que es una tormenta gigante que dura siglos." },
      { text: "¿Qué planeta es conocido como el 'planeta rojo'?", options: ["Venus", "Marte", "Mercurio", "Júpiter"], correctAnswer: "Marte", explanation: "🔴 Marte es rojo porque su superficie tiene óxido de hierro (herrumbre). ¡Es como si estuviera oxidado!" },
      { text: "¿Cuántos planetas hay en el sistema solar?", options: ["7", "8", "9", "10"], correctAnswer: "8", explanation: "🌌 Son 8: Mercurio, Venus, Tierra, Marte, Júpiter, Saturno, Urano y Neptuno. Plutón era el noveno pero ahora es 'planeta enano'." },
      { text: "¿La Tierra gira alrededor de...?", options: ["La Luna", "Marte", "El Sol", "Júpiter"], correctAnswer: "El Sol", explanation: "☀️ ¡Exacto! Un viaje completo alrededor del Sol dura 365 días. Eso es un año. El Sol es una estrella y está en el centro." },
      { text: "¿Qué planeta tiene los anillos más famosos?", options: ["Júpiter", "Urano", "Saturno", "Neptuno"], correctAnswer: "Saturno", explanation: "💫 Saturno tiene anillos enormes hechos de millones de pedacitos de hielo y roca. ¡Algunos pedazos son del tamaño de una casa!" },
    ],
  },
  {
    title: "🔢 Sumas y Restas Divertidas",
    description: "Problemas cotidianos para calcular sin miedo.",
    category: ContentCategory.math,
    topicKey: "sumas-restas",
    difficulty: Difficulty.EASY,
    knowledgeArea: QuizKnowledgeArea.mathematics,
    questions: [
      { text: "Tenés 15 caramelos y tu mamá te da 7 más. ¿Cuántos tenés?", options: ["20", "21", "22", "23"], correctAnswer: "22", explanation: "🍬 15 + 7 = 22. Truco: 15 + 5 = 20, y después 20 + 2 = 22. ¡Más caramelos para compartir!" },
      { text: "Tenías 43 pesos y gastaste 18 en un juguete. ¿Cuánto te queda?", options: ["23", "24", "25", "26"], correctAnswer: "25", explanation: "💰 43 - 18 = 25. Podés hacer: 43 - 10 = 33, y después 33 - 8 = 25. ¡Todavía te alcanza para un helado!" },
      { text: "¿Cuánto es el doble de 12?", options: ["20", "22", "24", "26"], correctAnswer: "24", explanation: "✌️ El doble es 12 + 12 = 24. O también: 10 + 10 = 20 y 2 + 2 = 4, entonces 20 + 4 = 24." },
      { text: "En la serie 2, 4, 6, 8, ... ¿qué número sigue?", options: ["9", "10", "11", "12"], correctAnswer: "10", explanation: "🔢 ¡Son números pares! Van de 2 en 2: 2, 4, 6, 8, 10, 12... Después del 8 viene el 10." },
      { text: "Una caja tiene 4 filas de 5 chocolates cada una. ¿Cuántos hay?", options: ["15", "18", "20", "25"], correctAnswer: "20", explanation: "🍫 4 × 5 = 20. También podés sumar: 5 + 5 + 5 + 5 = 20. ¡No te comas todos de una vez!" },
    ],
  },
  {
    title: "🧪 Estados de la Materia",
    description: "Sólidos, líquidos, gases y experimentos simples.",
    category: ContentCategory.science,
    topicKey: "estados-materia",
    difficulty: Difficulty.EASY,
    knowledgeArea: QuizKnowledgeArea.natural_sciences,
    questions: [
      { text: "¿En qué estado está el agua cuando hierve?", options: ["Sólido", "Líquido", "Gas", "Plasma"], correctAnswer: "Gas", explanation: "💨 Cuando hierve, el agua se convierte en vapor. El vapor es agua en estado gaseoso. ¡Cuidado con quemarte!" },
      { text: "¿El hielo es agua en estado...?", options: ["Líquido", "Sólido", "Gas", "Mixto"], correctAnswer: "Sólido", explanation: "🧊 ¡Exacto! El hielo es agua congelada. Cuando se derrite, vuelve a ser líquida. Y si hierve, se hace gas." },
      { text: "¿Qué necesita una planta para hacer fotosíntesis?", options: ["Solo agua", "Solo sol", "Sol, agua y aire", "Solo tierra"], correctAnswer: "Sol, agua y aire", explanation: "🌱 Las plantas necesitan luz del sol, agua y dióxido de carbono (un gas del aire). Con eso hacen su alimento. ¡Son chefs naturales!" },
      { text: "¿Qué pasa si mezclas aceite y agua?", options: ["Se disuelven", "No se mezclan", "Se hacen espuma", "Cambian de color"], correctAnswer: "No se mezclan", explanation: "🛢️ El aceite flota sobre el agua porque es menos denso. No se mezclan ni con mucha fuerza. ¡Probá en casa con un vaso!" },
      { text: "¿Cuál es el estado natural del oxígeno que respiramos?", options: ["Sólido", "Líquido", "Gas", "No tiene estado"], correctAnswer: "Gas", explanation: "🌬️ El oxígeno es un gas invisible. Sin él no podríamos vivir. ¡Las plantas lo producen y nosotros lo respiramos!" },
    ],
  },
  {
    title: "🏛️ Civilizaciones Antiguas",
    description: "Egipto, Roma y grandes momentos de la historia.",
    category: ContentCategory.history,
    topicKey: "civilizaciones-antiguas",
    difficulty: Difficulty.MEDIUM,
    knowledgeArea: QuizKnowledgeArea.social_sciences,
    questions: [
      { text: "¿Dónde vivían los faraones?", options: ["Roma", "Grecia", "Egipto", "China"], correctAnswer: "Egipto", explanation: "👑 Los faraones eran los reyes del Antiguo Egipto. Construyeron las pirámides hace más de 3.000 años. ¡Algunas aún existen!" },
      { text: "¿Qué construyeron los romanos para transportar agua?", options: ["Puentes", "Túneles", "Acueductos", "Canales"], correctAnswer: "Acueductos", explanation: "🏗️ Los acueductos llevaban agua desde las montañas hasta las ciudades. Algunos romanos aún funcionan hoy en día. ¡Ingeniería increíble!" },
      { text: "¿En qué año llegó Cristóbal Colón a América?", options: ["1490", "1492", "1500", "1510"], correctAnswer: "1492", explanation: "⛵ El 12 de octubre de 1492. Pensaba que había llegado a la India, pero había descubierto un nuevo continente. ¡Un error histórico!" },
      { text: "¿Qué inventaron los egipcios para escribir?", options: ["El alfabeto", "Los jeroglíficos", "La imprenta", "El papel"], correctAnswer: "Los jeroglíficos", explanation: "𓀀 Los jeroglíficos eran dibujos que representaban palabras. Los escribían en papiros y paredes de templos. ¡Cada dibujo cuenta una historia!" },
      { text: "¿Quién fue el primer presidente de Argentina?", options: ["San Martín", "Belgrano", "Bernardino Rivadavia", "Sarmiento"], correctAnswer: "Bernardino Rivadavia", explanation: "🇦🇷 Fue presidente en 1826. San Martín y Belgrano fueron héroes de la independencia, pero no presidentes constitucionales." },
    ],
  },
  {
    title: "🌍 Países y Capitales",
    description: "Capitales, continentes, ríos y mapas del mundo.",
    category: ContentCategory.geography,
    topicKey: "paises-capitales",
    difficulty: Difficulty.EASY,
    knowledgeArea: QuizKnowledgeArea.social_sciences,
    questions: [
      { text: "¿Cuál es la capital de Francia?", options: ["Londres", "Madrid", "París", "Roma"], correctAnswer: "París", explanation: "🗼 París es famosa por la Torre Eiffel. Allí también está el museo del Louvre, donde está la Mona Lisa." },
      { text: "¿En qué continente está Argentina?", options: ["Europa", "África", "Asia", "América del Sur"], correctAnswer: "América del Sur", explanation: "🌎 Argentina está en el sur de Sudamérica. Limita con Chile, Bolivia, Paraguay, Brasil y Uruguay. ¡Y tiene la Patagonia!" },
      { text: "¿Qué país tiene forma de bota?", options: ["España", "Grecia", "Italia", "Portugal"], correctAnswer: "Italia", explanation: "👢 Italia parece una bota que 'patea' la isla de Sicilia. Es famosa por la pizza, la pasta y Roma." },
      { text: "¿Cuál es el río más largo del mundo?", options: ["Amazonas", "Nilo", "Misisipi", "Yangtsé"], correctAnswer: "Nilo", explanation: "🌊 El Nilo en África mide unos 6.650 km. El Amazonas en Sudamérica es muy cercano. ¡Ambos son gigantes!" },
      { text: "¿Cuántos continentes hay en el mundo?", options: ["5", "6", "7", "8"], correctAnswer: "7", explanation: "🗺️ Son 7: África, Antártida, Asia, Europa, América del Norte, América del Sur y Oceanía. ¡Cada uno es un mundo diferente!" },
    ],
  },
  {
    title: "🚩 Banderas: ¿Qué país es?",
    description: "Mirá la bandera y elegí el país correcto.",
    category: ContentCategory.geography,
    topicKey: "paises-capitales",
    difficulty: Difficulty.EASY,
    knowledgeArea: QuizKnowledgeArea.social_sciences,
    questions: [
      {
        text: "¿De qué país es esta bandera?",
        options: ["China", "Argentina", "Brasil", "España"],
        correctAnswer: "China",
        explanation:
          "Esta es la bandera de China: roja con 5 estrellas amarillas. La estrella grande representa el Partido Comunista y las 4 pequeñas representan las clases sociales.",
        imageAssetName: "bandera_cn",
      },
      {
        text: "¿De qué país es esta bandera?",
        options: makeOptions("Argentina", ["Brasil", "Uruguay", "Chile", "Paraguay", "Bolivia", "Perú"]),
        correctAnswer: "Argentina",
        explanation: "🇦🇷 La bandera argentina tiene tres franjas celeste y blanca y el Sol de Mayo en el centro.",
        imageAssetName: "bandera_ar",
      },
      {
        text: "¿De qué país es esta bandera?",
        options: makeOptions("Brasil", ["Argentina", "Colombia", "Venezuela", "Uruguay", "México", "Chile"]),
        correctAnswer: "Brasil",
        explanation: "🇧🇷 La bandera de Brasil es verde con un rombo amarillo y un círculo azul con el lema «Ordem e Progresso».",
        imageAssetName: "bandera_br",
      },
      {
        text: "¿De qué país es esta bandera?",
        options: makeOptions("México", ["Italia", "España", "Argentina", "Colombia", "Perú", "Chile"]),
        correctAnswer: "México",
        explanation: "🇲🇽 La bandera de México tiene verde, blanco y rojo con el escudo nacional al centro.",
        imageAssetName: "bandera_mx",
      },
      {
        text: "¿De qué país es esta bandera?",
        options: makeOptions("Japón", ["China", "Corea del Sur", "Vietnam", "Bangladesh", "Tailandia", "India"]),
        correctAnswer: "Japón",
        explanation: "🇯🇵 La bandera de Japón es un círculo rojo en el centro sobre un fondo blanco (Hinomaru).",
        imageAssetName: "bandera_jp",
      },
      {
        text: "¿De qué país es esta bandera?",
        options: makeOptions("Francia", ["Italia", "Alemania", "España", "Reino Unido", "Portugal", "Bélgica"]),
        correctAnswer: "Francia",
        explanation: "🇫🇷 La bandera francesa tricolor es azul, blanco y rojo en franjas verticales.",
        imageAssetName: "bandera_fr",
      },
      {
        text: "¿De qué país es esta bandera?",
        options: makeOptions("Alemania", ["Austria", "Bélgica", "Países Bajos", "Suecia", "Polonia", "Suiza"]),
        correctAnswer: "Alemania",
        explanation: "🇩🇪 La bandera alemana es negra, roja y dorada en franjas horizontales.",
        imageAssetName: "bandera_de",
      },
      {
        text: "¿De qué país es esta bandera?",
        options: makeOptions("Italia", ["España", "Grecia", "Irlanda", "Portugal", "Hungría", "Croacia"]),
        correctAnswer: "Italia",
        explanation: "🇮🇹 La bandera italiana es verde, blanca y roja en franjas verticales.",
        imageAssetName: "bandera_it",
      },
      {
        text: "¿De qué país es esta bandera?",
        options: makeOptions("Reino Unido", ["Australia", "Canadá", "Nueva Zelanda", "Estados Unidos", "Irlanda", "Escocia"]),
        correctAnswer: "Reino Unido",
        explanation: "🇬🇧 La Union Jack combina las cruces de Inglaterra, Escocia e Irlanda del Norte.",
        imageAssetName: "bandera_gb",
      },
      {
        text: "¿De qué país es esta bandera?",
        options: makeOptions("Estados Unidos", ["Canadá", "México", "Liberia", "Malasia", "Cuba", "Puerto Rico"]),
        correctAnswer: "Estados Unidos",
        explanation: "🇺🇸 La bandera de EE. UU. tiene 13 franjas y 50 estrellas que representan a los estados.",
        imageAssetName: "bandera_us",
      },
    ],
  },
  {
    title: "🎨 Colores y Arte",
    description: "Mezclas, artistas famosos y colores del arcoíris.",
    category: ContentCategory.creativity,
    topicKey: "colores-arte",
    difficulty: Difficulty.EASY,
    knowledgeArea: QuizKnowledgeArea.art_culture,
    questions: [
      { text: "¿Cuáles son los colores primarios?", options: ["Rojo, verde, azul", "Rojo, azul, amarillo", "Naranja, verde, violeta", "Blanco, negro, gris"], correctAnswer: "Rojo, azul, amarillo", explanation: "🎨 Rojo, azul y amarillo. Con ellos podés mezclar para obtener otros colores. ¡Son la base de todo!" },
      { text: "¿Qué color se forma al mezclar azul y amarillo?", options: ["Naranja", "Violeta", "Verde", "Marrón"], correctAnswer: "Verde", explanation: "💚 ¡Verde! Probá mezclar pinturas azul y amarilla en casa. También se ve en la naturaleza: cielo azul + sol amarillo = plantas verdes." },
      { text: "¿Quién pintó la Mona Lisa?", options: ["Miguel Ángel", "Leonardo da Vinci", "Van Gogh", "Picasso"], correctAnswer: "Leonardo da Vinci", explanation: "🖼️ Leonardo da Vinci la pintó alrededor de 1503. Está en el museo del Louvre en París. ¡Su sonrisa es un misterio!" },
      { text: "¿Qué artista mexicana se pintaba con monos en sus cuadros?", options: ["Diego Rivera", "Frida Kahlo", "Tamara de Lempicka", "Remedios Varo"], correctAnswer: "Frida Kahlo", explanation: "🐒 Frida Kahlo era una pintora mexicana famosa por sus autorretratos. Los monos eran sus mascotas y aparecían en sus cuadros." },
      { text: "¿Cuántos colores tiene el arcoíris?", options: ["5", "6", "7", "8"], correctAnswer: "7", explanation: "🌈 7 colores: rojo, naranja, amarillo, verde, azul, añil y violeta. Se forma cuando la luz del sol pasa por gotas de agua. ¡Mágico!" },
    ],
  },
  {
    title: "🦕 Dinosaurios",
    description: "Nombres, fósiles y curiosidades prehistóricas.",
    category: ContentCategory.science,
    topicKey: "dinosaurios",
    difficulty: Difficulty.EASY,
    knowledgeArea: QuizKnowledgeArea.natural_sciences,
    questions: [
      { text: "¿Qué significa 'dinosaurio'?", options: ["Reptil gigante", "Lagarto terrible", "Animal antiguo", "Bestia prehistórica"], correctAnswer: "Lagarto terrible", explanation: "🦖 Viene del griego: 'deinos' (terrible) + 'sauros' (lagarto). No son lagartos, pero así los llamaron cuando los descubrieron." },
      { text: "¿Qué dinosaurio tenía un cuello muy largo?", options: ["Tiranosaurio", "Velociraptor", "Braquiosaurio", "Triceratops"], correctAnswer: "Braquiosaurio", explanation: "🦕 Medía 25 metros, ¡como un edificio de 8 pisos! Su cuello largo le servía para comer hojas de árboles altos." },
      { text: "¿Qué dinosaurio era carnívoro con dientes enormes?", options: ["Braquiosaurio", "Diplodocus", "Tiranosaurio Rex", "Estegosaurio"], correctAnswer: "Tiranosaurio Rex", explanation: "🦷 El T-Rex tenía dientes de hasta 30 cm. Su nombre significa 'rey de los lagartos tiranos'. ¡Era el depredador supremo!" },
      { text: "¿Qué causó la extinción de los dinosaurios?", options: ["Una inundación", "Un terremoto", "Un meteorito", "Un volcán"], correctAnswer: "Un meteorito", explanation: "☄️ Hace 66 millones de años, un meteorito gigante chocó contra la Tierra. El polvo tapó el sol y cambió el clima. ¡Adiós, dinosaurios!" },
      { text: "¿Qué dinosaurio tenía placas en su espalda?", options: ["Tiranosaurio", "Velociraptor", "Estegosaurio", "Pteranodon"], correctAnswer: "Estegosaurio", explanation: "🔺 Tenía placas óseas en la espalda y púas en la cola. Las placas servían para regular su temperatura o impresionar a otros." },
    ],
  },
  {
    title: "🧠 Lógica y Acertijos",
    description: "Trampas de lenguaje, series y deducciones.",
    category: ContentCategory.puzzle,
    topicKey: "logica-acertijos",
    difficulty: Difficulty.MEDIUM,
    knowledgeArea: QuizKnowledgeArea.logic_thinking,
    questions: [
      { text: "Si todos los gatos tienen cola y Mimi es un gato, entonces...", options: ["Mimi no tiene cola", "Mimi tiene cola", "Mimi es un perro", "No se puede saber"], correctAnswer: "Mimi tiene cola", explanation: "🐱 ¡Lógica! Si TODOS los gatos tienen cola, y Mimi es gato → Mimi tiene cola. Es una deducción directa." },
      { text: "En una familia hay 2 padres y 2 hijos. ¿Cuántas personas son como mínimo?", options: ["2", "3", "4", "5"], correctAnswer: "3", explanation: "👨‍👩‍👦 Pueden ser 3: abuelo (padre), su hijo (padre e hijo), y el nieto (hijo). ¡El hijo es padre e hijo al mismo tiempo!" },
      { text: "¿Qué número sigue? 1, 1, 2, 3, 5, 8, ...", options: ["10", "11", "13", "15"], correctAnswer: "13", explanation: "🔢 Serie de Fibonacci: cada número es la suma de los dos anteriores. 5 + 8 = 13. ¡Aparece en la naturaleza todo el tiempo!" },
      { text: "Un tren eléctrico va de norte a sur. ¿Hacia dónde va el humo?", options: ["Norte", "Sur", "Este", "Ninguno"], correctAnswer: "Ninguno", explanation: "🚃 ¡Trampa! Es un tren ELÉCTRICO, no produce humo. Hay que leer bien antes de responder. ¡La lectura atenta es clave!" },
      { text: "Tengo 3 manzanas y VOS me sacás 2. ¿Cuántas tenés VOS?", options: ["1", "2", "3", "5"], correctAnswer: "2", explanation: "🍎 Si VOS me sacás 2, VOS tenés 2. La pregunta es cuántas tenés VOS, no cuántas me quedan a mí. ¡Trampa de lenguaje!" },
    ],
  },
  {
    title: "🎵 Música e Instrumentos",
    description: "Notas, piano, violín y familias musicales.",
    category: ContentCategory.creativity,
    topicKey: "musica-instrumentos",
    difficulty: Difficulty.EASY,
    knowledgeArea: QuizKnowledgeArea.art_culture,
    questions: [
      { text: "¿Cuántas notas musicales básicas hay?", options: ["5", "6", "7", "8"], correctAnswer: "7", explanation: "🎵 Do, re, mi, fa, sol, la, si. Con estas 7 notas se componen todas las melodías del mundo. ¡Solo 7!" },
      { text: "¿Qué instrumento tiene teclas blancas y negras?", options: ["Guitarra", "Violín", "Piano", "Flauta"], correctAnswer: "Piano", explanation: "🎹 Tiene 88 teclas. Es uno de los instrumentos más populares. ¡Tocar piano ejercita ambos hemisferios del cerebro!" },
      { text: "¿Qué instrumento se toca con arco?", options: ["Piano", "Guitarra", "Violín", "Trompeta"], correctAnswer: "Violín", explanation: "🎻 Se frotan las cuerdas con un arco. Tiene 4 cuerdas y es el más pequeño de su familia. ¡Suena hermoso!" },
      { text: "¿Qué familia de instrumentos usa aire para sonar?", options: ["Cuerda", "Percusión", "Viento", "Teclado"], correctAnswer: "Viento", explanation: "🎺 Flauta, trompeta, saxofón... El músico sopla aire dentro. ¡Es como darle vida al instrumento con tu aliento!" },
      { text: "¿Quién compuso 'Las Cuatro Estaciones'?", options: ["Mozart", "Beethoven", "Vivaldi", "Bach"], correctAnswer: "Vivaldi", explanation: "🍂 Antonio Vivaldi, alrededor de 1720. Describe musicalmente primavera, verano, otoño e invierno. ¡Escuchala!" },
    ],
  },
  {
    title: "📖 Comprensión Lectora: La Aventura de Luna",
    description: "Leé una historia breve y respondé con atención.",
    category: ContentCategory.education,
    topicKey: "comprension-luna",
    difficulty: Difficulty.EASY,
    knowledgeArea: QuizKnowledgeArea.language,
    readingPassage: LUNA_PASSAGE,
    questions: [
      { text: "¿Dónde encontró Luna el mapa?", options: ["En la escuela", "En su jardín", "En la playa", "En el bosque"], correctAnswer: "En su jardín", explanation: "📖 El texto dice: '...vio algo brillante entre las flores de su jardín. ¡Era un mapa antiguo!'" },
      { text: "¿Qué animal la ayudó?", options: ["Un perro", "Un gato", "Un pájaro", "Un conejo"], correctAnswer: "Un gato", explanation: "📖 El texto dice: '...con la ayuda de su gato Milo'. Milo es el nombre del gato." },
      { text: "¿Qué había en el cofre?", options: ["Monedas de oro", "Un cofre con libros", "Una caja de juguetes", "Una carta misteriosa"], correctAnswer: "Un cofre con libros", explanation: "📖 El texto dice: '...un cofre lleno de libros antiguos sobre aventuras y magia'." },
      { text: "¿Qué aprendió Luna?", options: ["Que el tesoro era oro", "Que leer es una aventura", "Que los gatos hablan", "Que los mapas son peligrosos"], correctAnswer: "Que leer es una aventura", explanation: "📖 El texto termina: 'Luna aprendió que la verdadera aventura está en las historias que leemos.'" },
      { text: "¿Cómo se sentía Luna al principio?", options: ["Triste", "Aburrida", "Emocionada", "Asustada"], correctAnswer: "Aburrida", explanation: "📖 El primer párrafo dice: 'Era un día soleado y Luna estaba aburrida. No sabía qué hacer.'" },
    ],
  },
];

const CONTENT: ContentSeed[] = [
  {
    title: "🚀 Viaje por el Sistema Solar",
    description: "Conocé los 8 planetas, el Sol y otros cuerpos celestes en un recorrido animado.",
    type: EducationalContentType.VIDEO,
    category: "astronomy",
    difficulty: Difficulty.EASY,
    topicKey: "sistema-solar",
    durationMinutes: 5,
    data: {
      chapters: ["El Sol: nuestra estrella", "Planetas interiores", "Planetas exteriores", "Datos curiosos"],
      objectives: ["Identificar los 8 planetas", "Entender qué es una órbita", "Diferenciar planetas rocosos y gaseosos"],
    },
  },
  {
    title: "🦋 De Oruga a Mariposa: Una Transformación Increíble",
    description: "Descubrí las 4 etapas de la metamorfosis en esta lectura interactiva.",
    type: EducationalContentType.READING,
    category: "science",
    difficulty: Difficulty.EASY,
    topicKey: "metamorfosis",
    durationMinutes: 8,
    data: {
      sections: ["Etapa 1: Huevo", "Etapa 2: Oruga", "Etapa 3: Crisálida", "Etapa 4: Mariposa"],
      embeddedQuestions: 3,
    },
  },
  {
    title: "🌋 Creá tu Propio Volcán en Casa",
    description: "Un experimento seguro y divertido para ver una erupción química.",
    type: EducationalContentType.EXPERIMENT,
    category: "science",
    difficulty: Difficulty.MEDIUM,
    topicKey: "volcan-casero",
    durationMinutes: 15,
    data: {
      materials: ["Botella plástica", "Arcilla", "Bicarbonato", "Vinagre", "Colorante rojo"],
      steps: ["Colocá la botella sobre una bandeja.", "Cubría los lados con arcilla formando un volcán.", "Agregá dos cucharadas de bicarbonato.", "Sumá unas gotas de colorante rojo.", "Verté vinagre despacio y observá la erupción."],
      scientificExplanation: "El bicarbonato (base) reacciona con el vinagre (ácido) produciendo gas.",
      precaution: "Pedí ayuda a un adulto.",
    },
  },
  {
    title: "⏰ Un Día en la Vida de un Niño Egipcio",
    description: "Viajá en el tiempo y descubrí cómo vivían los niños hace 3.000 años.",
    type: EducationalContentType.VIDEO,
    category: "history",
    difficulty: Difficulty.EASY,
    topicKey: "egipto-ninos",
    durationMinutes: 6,
    data: {
      chapters: ["Desayuno con pan y miel", "Aprendiendo jeroglíficos", "Juguetes de madera", "Historias de faraones"],
    },
  },
  {
    title: "🖌️ Frida Kahlo: La Pintora que Miró al Espejo",
    description: "Conocé la historia de la artista mexicana más famosa del mundo.",
    type: EducationalContentType.READING,
    category: "creativity",
    difficulty: Difficulty.EASY,
    topicKey: "frida-kahlo",
    durationMinutes: 7,
    data: {
      sections: ["Infancia en México", "El accidente", "Sus autorretratos", "Diego Rivera", "Legado"],
      activity: "Dibujá tu propio autorretrato",
    },
  },
  {
    title: "🌍 Explorá el Mundo: Mapamundi Interactivo",
    description: "Tocá cada continente y descubrí países, animales y curiosidades.",
    type: EducationalContentType.INTERACTIVE,
    category: "geography",
    difficulty: Difficulty.MEDIUM,
    topicKey: "mapamundi",
    durationMinutes: 10,
    data: {
      continents: [
        { name: "América del Sur", countries: ["Argentina", "Brasil", "Perú"], animals: ["Jaguar", "Cóndor"], curiosity: "Tiene la selva amazónica, una de las más grandes del mundo." },
        { name: "Europa", countries: ["Francia", "Italia", "España"], animals: ["Zorro rojo", "Lince"], curiosity: "Muchos países están muy cerca entre sí." },
        { name: "África", countries: ["Egipto", "Kenia", "Sudáfrica"], animals: ["León", "Elefante"], curiosity: "Allí está el desierto del Sahara." },
        { name: "Asia", countries: ["China", "Japón", "India"], animals: ["Tigre", "Panda"], curiosity: "Es el continente más grande y poblado." },
        { name: "Oceanía", countries: ["Australia", "Nueva Zelanda"], animals: ["Canguro", "Koala"], curiosity: "Tiene islas y arrecifes gigantes." },
        { name: "Antártida", countries: [], animals: ["Pingüino", "Foca"], curiosity: "Es el continente más frío." },
      ],
    },
  },
  {
    title: "🎵 La Canción de las Tablas: ¡Cantá y Aprendé!",
    description: "Aprendé las tablas del 2 al 9 con melodías pegadizas.",
    type: EducationalContentType.VIDEO,
    category: "math",
    difficulty: Difficulty.EASY,
    topicKey: "tablas",
    durationMinutes: 4,
    data: {
      chapters: ["Tabla del 2", "Tabla del 5", "Tabla del 9: truco de los dedos", "Tabla del 10"],
    },
  },
  {
    title: "🌿 Conocé los Animales de la Selva",
    description: "Tarjetas interactivas con fotos, sonidos y datos de 20 animales.",
    type: EducationalContentType.INTERACTIVE,
    category: "science",
    difficulty: Difficulty.EASY,
    topicKey: "selva",
    durationMinutes: 10,
    data: {
      animals: ["Jaguar", "Guacamayo", "Anaconda", "Perezoso", "Rana flecha", "Tucán", "Capibara", "Oso hormiguero", "Tigre", "Orangután", "Tapir", "Mono aullador", "Boa", "Puma", "Mariposa morpho", "Caimán", "Armadillo", "Ocelote", "Colibrí", "Hormiga cortadora"],
      factsPerAnimal: ["nombre", "foto", "sonido", "3 curiosidades", "¿peligroso?", "¿en peligro?"],
    },
  },
];

const PLANET_LEVELS = [
  ["Mercurio", "Es el planeta más cercano al Sol y tiene días muy calurosos y noches heladas."],
  ["Venus", "Es el planeta más caliente por su atmósfera espesa."],
  ["Tierra", "Es nuestro hogar y tiene agua líquida en la superficie."],
  ["Marte", "Es rojo por el óxido de hierro de su suelo."],
  ["Júpiter", "Es el planeta más grande y tiene una gran mancha roja."],
  ["Saturno", "Sus anillos están hechos de hielo y roca."],
  ["Urano", "Gira casi de costado, como si rodara alrededor del Sol."],
  ["Neptuno", "Tiene vientos muy fuertes y un color azul intenso."],
  ["Luna", "No es planeta: es el satélite natural de la Tierra."],
  ["Sol", "No es planeta: es una estrella que nos da luz y calor."],
] as const;

const COUNTRY_LEVELS = [
  ["Argentina", "Su capital es Buenos Aires y tiene la Patagonia."],
  ["Brasil", "Es el país más grande de América del Sur."],
  ["España", "Su capital es Madrid."],
  ["Francia", "Allí está la Torre Eiffel."],
  ["Italia", "Tiene forma de bota."],
  ["Japón", "Es un archipiélago en Asia."],
  ["Estados Unidos", "Su capital es Washington D. C."],
  ["Reino Unido", "Londres es su capital."],
  ["México", "Su bandera tiene un águila sobre un nopal."],
  ["Canadá", "Su bandera tiene una hoja de maple."],
  ["Australia", "También es un continente de Oceanía."],
  ["Alemania", "Su capital es Berlín."],
  ["China", "Es el país más poblado de Asia junto con India."],
  ["Egipto", "Allí están las pirámides de Giza."],
  ["Italia (mapa)", "Su forma recuerda a una bota."],
] as const;

const DINO_LEVELS = [
  ["Tiranosaurio Rex", "Tenía dientes enormes y era carnívoro."],
  ["Triceratops", "Tenía tres cuernos y un gran volante óseo."],
  ["Velociraptor", "Era pequeño, veloz y cazaba con garras curvas."],
  ["Estegosaurio", "Tenía placas en la espalda y púas en la cola."],
  ["Braquiosaurio", "Su cuello largo le ayudaba a comer hojas altas."],
  ["Pteranodon", "Era un reptil volador, no un dinosaurio terrestre."],
  ["Espinosaurio", "Tenía una gran vela en la espalda."],
  ["Anquilosaurio", "Tenía armadura y una cola como maza."],
  ["Parasaurolofo", "Tenía una cresta larga en la cabeza."],
  ["Diplodocus", "Era muy largo y herbívoro."],
] as const;

const MINI_GAMES = [
  {
    slug: "guess-planet",
    name: "🪐 Adiviná el Planeta",
    description: "Mirá imágenes de cuerpos celestes y elegí el nombre correcto.",
    category: ContentCategory.astronomy,
    difficulty: Difficulty.EASY,
    config: {
      mechanic: "visual-quiz",
      levels: PLANET_LEVELS.map(([answer, funFact], index) => ({
        index: index + 1,
        imageLabel: answer,
        question: "¿Qué planeta es este?",
        options: makeOptions(answer, ["Mercurio", "Venus", "Tierra", "Marte", "Júpiter", "Saturno", "Urano", "Neptuno", "Luna", "Sol"]),
        correctAnswer: answer,
        funFact,
      })),
    },
  },
  {
    slug: "identify-country",
    name: "🗺️ Identificá el País",
    description: "Banderas y mapas para reconocer países del mundo.",
    category: ContentCategory.geography,
    difficulty: Difficulty.MEDIUM,
    config: {
      mechanic: "flag-map-quiz",
      levels: COUNTRY_LEVELS.map(([answer, funFact], index) => ({
        index: index + 1,
        imageLabel: answer,
        question: index % 2 === 0 ? "¿De qué país es esta bandera?" : "¿Qué país tiene esta forma?",
        options: makeOptions(answer.replace(" (mapa)", ""), ["Argentina", "Brasil", "España", "Francia", "Italia", "Japón", "Estados Unidos", "Reino Unido", "México", "Canadá", "Australia", "Alemania", "China", "Egipto"]),
        correctAnswer: answer.replace(" (mapa)", ""),
        funFact,
      })),
    },
  },
  {
    slug: "dino-names",
    name: "🦕 Dinosaurios: ¿Sabés su nombre?",
    description: "Identificá dinosaurios y aprendé datos prehistóricos.",
    category: ContentCategory.science,
    difficulty: Difficulty.EASY,
    config: {
      mechanic: "visual-quiz",
      levels: DINO_LEVELS.map(([answer, funFact], index) => ({
        index: index + 1,
        imageLabel: answer,
        question: "¿Qué dinosaurio es este?",
        options: makeOptions(answer, ["Tiranosaurio Rex", "Triceratops", "Velociraptor", "Estegosaurio", "Braquiosaurio", "Pteranodon", "Espinosaurio", "Anquilosaurio", "Parasaurolofo", "Diplodocus"]),
        correctAnswer: answer,
        funFact,
      })),
    },
  },
  {
    slug: "spot-difference",
    name: "🔍 Encuentra la Diferencia",
    description: "Observá escenas educativas y encontrá 5 diferencias por nivel.",
    category: ContentCategory.puzzle,
    difficulty: Difficulty.MEDIUM,
    config: {
      mechanic: "spot-difference",
      timerSeconds: 60,
      hintsPerLevel: 3,
      levels: ["escuela", "parque", "museo", "zoológico", "biblioteca"].map((scene, index) => ({
        index: index + 1,
        scene,
        differences: 5,
        hints: ["Mirá los objetos pequeños.", "Compará colores.", "Revisá el fondo de la escena."],
      })),
    },
  },
  {
    slug: "world-puzzle",
    name: "🧩 Rompecabezas del Mundo",
    description: "Armá mapas, animales y monumentos en 3 dificultades.",
    category: ContentCategory.geography,
    difficulty: Difficulty.MEDIUM,
    config: {
      mechanic: "jigsaw",
      puzzles: [
        { difficulty: "easy", pieces: 4, images: ["Mapa Sudamérica", "León", "Torre Eiffel"] },
        { difficulty: "medium", pieces: 9, images: ["Mapamundi", "Elefante", "Pirámides"] },
        { difficulty: "hard", pieces: 16, images: ["Mapa Europa", "Tigre", "Coliseo"] },
      ],
    },
  },
] as const;

const VISUAL_QUESTIONS: VisualQuestionSeed[] = [
  ...PLANET_LEVELS.map(([answer]) => ({
    assetName: `planet_${assetSlug(answer)}`,
    imageLabel: answer,
    question:
      answer === "Luna" ? "¿Qué astro natural acompaña a la Tierra?" : answer === "Sol" ? "¿Qué estrella ilumina nuestro sistema?" : "¿Qué planeta es este?",
    options: makeOptions(answer, ["Mercurio", "Venus", "Tierra", "Marte", "Júpiter", "Saturno", "Urano", "Neptuno", "Luna", "Sol"]),
    correctAnswer: answer,
    category: "astronomy",
    difficulty: Difficulty.EASY,
  })),
  ...COUNTRY_LEVELS.map(([answer], index) => {
    const clean = answer.replace(" (mapa)", "");
    const isMap = index % 2 === 1;
    const code = ES_NAME_TO_FLAG_CODE[clean];
    const assetName = isMap ? `map_${assetSlug(clean)}` : code ? `bandera_${code}` : `flag_${assetSlug(clean)}`;
    return {
      assetName,
      imageLabel: clean,
      question: index % 2 === 0 ? "¿De qué país es esta bandera?" : "¿Qué país tiene esta forma?",
      options: makeOptions(clean, [
        "Argentina",
        "Brasil",
        "España",
        "Francia",
        "Italia",
        "Japón",
        "Estados Unidos",
        "Reino Unido",
        "México",
        "Canadá",
        "Australia",
        "Alemania",
        "China",
        "Egipto",
      ]),
      correctAnswer: clean,
      category: "geography",
      difficulty: index < 8 ? Difficulty.EASY : Difficulty.MEDIUM,
    };
  }),
  ...DINO_LEVELS.map(([answer]) => ({
    assetName: `dino_${assetSlug(answer)}`,
    imageLabel: answer,
    question: "¿Qué dinosaurio es este?",
    options: makeOptions(answer, [
      "Tiranosaurio Rex",
      "Triceratops",
      "Velociraptor",
      "Estegosaurio",
      "Braquiosaurio",
      "Pteranodon",
      "Espinosaurio",
      "Anquilosaurio",
      "Parasaurolofo",
      "Diplodocus",
    ]),
    correctAnswer: answer,
    category: "science",
    difficulty: Difficulty.EASY,
  })),
];

async function seedEducationalTree(tx: Prisma.TransactionClient): Promise<Map<TopicKey, string>> {
  const topicIds = new Map<TopicKey, string>();
  for (let categoryIndex = 0; categoryIndex < CATEGORIES.length; categoryIndex++) {
    const category = CATEGORIES[categoryIndex]!;
    const categoryRow = await tx.educationalCategory.create({
      data: { slug: category.slug, name: category.name, icon: category.icon, sortOrder: categoryIndex },
    });
    for (let subjectIndex = 0; subjectIndex < category.subjects.length; subjectIndex++) {
      const subject = category.subjects[subjectIndex]!;
      const subjectRow = await tx.educationalSubject.create({
        data: { categoryId: categoryRow.id, slug: subject.slug, name: subject.name, sortOrder: subjectIndex },
      });
      for (let topicIndex = 0; topicIndex < subject.topics.length; topicIndex++) {
        const [slug, name, summary] = subject.topics[topicIndex]!;
        const topic = await tx.educationalTopic.create({
          data: { subjectId: subjectRow.id, slug, name, summary, sortOrder: topicIndex },
        });
        topicIds.set(slug as TopicKey, topic.id);
      }
    }
  }
  return topicIds;
}

async function seedEducationalAssets(tx: Prisma.TransactionClient): Promise<Map<string, string>> {
  await tx.educationalAsset.createMany({
    data: EDUCATIONAL_ASSET_SEED_DATA.map((row) => ({
      type: row.type,
      category: row.category,
      name: row.name,
      title: row.title,
      description: row.description ?? null,
      urlSmall: row.urlSmall,
      urlMedium: row.urlMedium,
      urlLarge: row.urlLarge,
      source: row.source,
      sourceUrl: row.sourceUrl,
      license: row.license,
      tags: row.tags,
    })),
  });
  const rows = await tx.educationalAsset.findMany({ select: { id: true, name: true } });
  return new Map(rows.map((r) => [r.name, r.id]));
}

async function seedQuizzes(
  tx: Prisma.TransactionClient,
  topicIds: Map<TopicKey, string>,
  assetByName: Map<string, string>,
): Promise<{ id: string }[]> {
  const rows: { id: string }[] = [];
  for (const quiz of QUIZZES) {
    const created = await tx.quiz.create({
      data: {
        title: quiz.title,
        description: quiz.description,
        topicId: topicIds.get(quiz.topicKey),
        legacyCategory: quiz.category,
        difficulty: quiz.difficulty,
        questionCount: quiz.questions.length,
        published: true,
      },
    });
    rows.push({ id: created.id });
    for (const question of quiz.questions) {
      const imageAssetId = question.imageAssetName
        ? assetByName.get(question.imageAssetName) ?? null
        : null;
      await tx.quizQuestion.create({
        data: {
          quizId: created.id,
          question: question.text,
          options: question.options,
          correct: correctIndex(question),
          category: quiz.category,
          difficulty: quiz.difficulty,
          quizLevel: quiz.difficulty === Difficulty.EASY ? 1 : 2,
          knowledgeArea: quiz.knowledgeArea,
          topicSlug: quiz.topicKey,
          questionType: QuizQuestionType.MULTIPLE_CHOICE,
          explanation: question.explanation,
          hintText: `Releé la pregunta y buscá la pista clave: ${question.text.split(" ").slice(0, 5).join(" ")}...`,
          readingPassage: quiz.readingPassage ?? null,
          imageAssetId,
        },
      });
    }
  }
  return rows;
}

async function seedContent(
  tx: Prisma.TransactionClient,
  topicIds: Map<TopicKey, string>,
  assetByName: Map<string, string>,
): Promise<void> {
  const markdownByTopic = LEARN_MARKDOWN_BY_TOPIC_KEY as Partial<Record<TopicKey, string>>;
  for (const item of CONTENT) {
    const longForm = markdownByTopic[item.topicKey]?.trim();
    const body = longForm && longForm.length > 0 ? longForm : item.description.trim() || "Contenido EduPlay.";
    const heroName = `hero_${item.topicKey.replace(/-/g, "_")}`;
    const heroDef = EDUCATIONAL_ASSET_SEED_DATA.find((a) => a.name === heroName);
    const heroId = assetByName.get(heroName) ?? null;
    await tx.educationalContent.create({
      data: {
        title: item.title,
        description: item.description,
        content: body,
        contentType: item.type,
        category: item.category,
        difficulty: item.difficulty,
        imageUrl: heroDef?.urlMedium ?? imageUrl(item.title),
        heroImageAssetId: heroId,
        topicId: topicIds.get(item.topicKey),
        meta: {
          durationMinutes: item.durationMinutes,
          ...item.data,
        },
        published: true,
      },
    });
  }
}

async function seedMiniGames(tx: Prisma.TransactionClient, assetByName: Map<string, string>): Promise<{ id: string }[]> {
  const rows: { id: string }[] = [];
  for (let index = 0; index < MINI_GAMES.length; index++) {
    const game = MINI_GAMES[index]!;
    const created = await tx.miniGame.create({
      data: {
        slug: game.slug,
        name: game.name,
        description: game.description,
        category: game.category,
        difficulty: game.difficulty,
        config: game.config,
        isActive: true,
        sortOrder: index,
      },
    });
    rows.push({ id: created.id });
  }
  for (const question of VISUAL_QUESTIONS) {
    const def = EDUCATIONAL_ASSET_SEED_DATA.find((a) => a.name === question.assetName);
    const imageUrlResolved = def?.urlMedium ?? imageUrl(question.imageLabel);
    const imageAssetId = assetByName.get(question.assetName) ?? null;
    await tx.visualQuestion.create({
      data: {
        imageUrl: imageUrlResolved,
        imageAssetId,
        question: question.question,
        options: question.options,
        correct: correctIndex(question),
        category: question.category,
        difficulty: question.difficulty,
      },
    });
  }
  return rows;
}

async function seedDemoAccounts(): Promise<{
  parents: { maria: string; carlos: string; ana: string };
  parentUsers: { maria: string; carlos: string; ana: string };
  children: { lucia: string; mateo: string; sofia: string; daniel: string; emma: string };
}> {
  const parentHash = await hashPassword(DEMO_PASSWORD);
  const childHash = await hashPassword(DEMO_PASSWORD);
  const [parentMaria, parentCarlos, parentAna] = await Promise.all([
    prisma.parent.create({ data: { email: "maria@eduplay.demo", password: parentHash, isPremium: true } }),
    prisma.parent.create({ data: { email: "carlos@eduplay.demo", password: parentHash } }),
    prisma.parent.create({ data: { email: "ana@eduplay.demo", password: parentHash, isPremium: true } }),
  ]);
  const [userMaria, userCarlos, userAna] = await Promise.all([
    prisma.user.create({ data: { username: "maria_tutor", realName: "María López", passwordHash: parentHash, age: 38, parentId: parentMaria.id, type: UserType.parent, status: UserStatus.active, parentAccountApprovedAt: new Date() } }),
    prisma.user.create({ data: { username: "carlos_tutor", realName: "Carlos Pérez", passwordHash: parentHash, age: 40, parentId: parentCarlos.id, type: UserType.parent, status: UserStatus.active, parentAccountApprovedAt: new Date() } }),
    prisma.user.create({ data: { username: "ana_tutor", realName: "Ana Gómez", passwordHash: parentHash, age: 41, parentId: parentAna.id, type: UserType.parent, status: UserStatus.active, parentAccountApprovedAt: new Date() } }),
  ]);
  await Promise.all([
    prisma.parentProfile.create({ data: { userId: userMaria.id, verificationStatus: VerificationStatus.verified, verificationMethod: VerificationMethod.email, subscriptionTier: SubscriptionTier.premium } }),
    prisma.parentProfile.create({ data: { userId: userCarlos.id, verificationStatus: VerificationStatus.verified, verificationMethod: VerificationMethod.email, subscriptionTier: SubscriptionTier.basic } }),
    prisma.parentProfile.create({ data: { userId: userAna.id, verificationStatus: VerificationStatus.verified, verificationMethod: VerificationMethod.email, subscriptionTier: SubscriptionTier.premium } }),
  ]);

  const [lucia, mateo, sofia, daniel, emma] = await Promise.all([
    prisma.user.create({ data: { username: CHILD_LOGINS.lucia, realName: "Lucía", passwordHash: childHash, age: 8, parentId: parentMaria.id, type: UserType.minor, status: UserStatus.active, level: 5, experience: 450, quizCoins: 120, parentAccountApprovedAt: new Date() } }),
    prisma.user.create({ data: { username: CHILD_LOGINS.mateo, realName: "Mateo", passwordHash: childHash, age: 10, parentId: parentMaria.id, type: UserType.minor, status: UserStatus.active, level: 8, experience: 780, quizCoins: 200, parentAccountApprovedAt: new Date() } }),
    prisma.user.create({ data: { username: CHILD_LOGINS.sofia, realName: "Sofía", passwordHash: childHash, age: 6, parentId: parentCarlos.id, type: UserType.minor, status: UserStatus.active, level: 2, experience: 110, quizCoins: 40, parentAccountApprovedAt: new Date() } }),
    prisma.user.create({ data: { username: CHILD_LOGINS.daniel, realName: "Daniel", passwordHash: childHash, age: 12, parentId: parentAna.id, type: UserType.minor, status: UserStatus.active, level: 12, experience: 1180, quizCoins: 300, parentAccountApprovedAt: new Date() } }),
    prisma.user.create({ data: { username: CHILD_LOGINS.emma, realName: "Emma", passwordHash: childHash, age: 9, parentId: parentAna.id, type: UserType.minor, status: UserStatus.active, level: 6, experience: 560, quizCoins: 150, parentAccountApprovedAt: new Date() } }),
  ]);

  const childRows = [
    { user: lucia, parentUser: userMaria, parent: parentMaria, grade: "3", interests: ["math", "creativity"], limit: 90 },
    { user: mateo, parentUser: userMaria, parent: parentMaria, grade: "5", interests: ["science", "astronomy"], limit: 90 },
    { user: sofia, parentUser: userCarlos, parent: parentCarlos, grade: "1", interests: ["education"], limit: 45 },
    { user: daniel, parentUser: userAna, parent: parentAna, grade: "7", interests: ["geography", "history"], limit: 120 },
    { user: emma, parentUser: userAna, parent: parentAna, grade: "4", interests: ["creativity", "education"], limit: 75 },
  ];

  for (const row of childRows) {
    await prisma.minorProfile.create({
      data: {
        userId: row.user.id,
        parentId: row.parentUser.id,
        age: row.user.age,
        gradeLevel: row.grade,
        school: "Escuela Demo EduPlay",
        interests: row.interests,
        dailyTimeLimit: row.limit,
        contentRestrictions: {},
        canMakePurchases: false,
        canAddFriends: true,
        canPostContent: true,
      },
    });
    await prisma.parentSettings.create({
      data: { parentId: row.parent.id, childId: row.user.id, dailyScreenTimeLimit: row.limit },
    });
    await prisma.screenTime.create({
      data: { userId: row.user.id, dailyLimitMinutes: row.limit, usedTodaySeconds: 0, lastReset: new Date() },
    });
  }

  await prisma.parentChildRelation.createMany({
    data: [
      { parentId: userMaria.id, childId: lucia.id, status: ParentChildRelationStatus.active },
      { parentId: userMaria.id, childId: mateo.id, status: ParentChildRelationStatus.active },
      { parentId: userCarlos.id, childId: sofia.id, status: ParentChildRelationStatus.active },
      { parentId: userAna.id, childId: daniel.id, status: ParentChildRelationStatus.active },
      { parentId: userAna.id, childId: emma.id, status: ParentChildRelationStatus.active },
    ],
  });

  return {
    parents: { maria: parentMaria.id, carlos: parentCarlos.id, ana: parentAna.id },
    parentUsers: { maria: userMaria.id, carlos: userCarlos.id, ana: userAna.id },
    children: { lucia: lucia.id, mateo: mateo.id, sofia: sofia.id, daniel: daniel.id, emma: emma.id },
  };
}

async function seedSupportingData(
  tx: Prisma.TransactionClient,
  accounts: Awaited<ReturnType<typeof seedDemoAccounts>>,
  quizzes: { id: string }[],
  games: { id: string }[],
): Promise<void> {
  const missionDefs = [
    { title: "Completá un quiz real", description: "Respondé un cuestionario con preguntas educativas reales.", category: ContentCategory.education, targetValue: 1, type: MissionType.CORRECT_ANSWERS },
    { title: "Explorá un contenido", description: "Leé o mirá un recurso de Aprender.", category: ContentCategory.science, targetValue: 1, type: MissionType.READ_CONTENT },
    { title: "Jugá un minijuego", description: "Practicá con un juego educativo.", category: ContentCategory.puzzle, targetValue: 1, type: MissionType.PLAY_GAMES },
  ];
  const missions = await Promise.all(missionDefs.map((mission) => tx.mission.create({ data: mission })));
  await tx.userMission.createMany({
    data: missions.map((mission, index) => ({
      userId: accounts.children.lucia,
      missionId: mission.id,
      progress: index === 0 ? 1 : 0,
      completed: index === 0,
      rewardXpGranted: index === 0 ? 20 : null,
      date: new Date(),
    })),
  });

  const thematic = await tx.thematicMission.create({
    data: {
      slug: "aventura-del-sistema-solar",
      title: "Aventura del Sistema Solar",
      theme: "Astronomía",
      narrative: "Viajá por planetas, resolvé pistas y completá una bitácora espacial.",
      reward: "Insignia de Explorador Espacial",
      stepCount: 5,
      isActive: true,
    },
  });
  await tx.userThematicMissionProgress.create({
    data: {
      userId: accounts.children.mateo,
      missionSlug: thematic.slug,
      thematicMissionId: thematic.id,
      currentStepIndex: 2,
      completed: false,
      bestScore: 80,
    },
  });

  await tx.userGamifiedChallenge.create({
    data: {
      userId: accounts.children.lucia,
      bucket: ChallengeBucket.DAILY,
      periodKey: new Date().toISOString().slice(0, 10),
      challengeSlug: "daily-real-quiz",
      title: "Respondé 5 preguntas reales",
      description: "Completá cualquier quiz del catálogo curado.",
      target: 1,
      progress: 0,
      completed: false,
    },
  });

  const achievements = await Promise.all(
    [
      ["Explorador espacial", "Completó un reto del sistema solar.", ContentCategory.astronomy, "🪐"],
      ["Mente lógica", "Resolvió acertijos con atención.", ContentCategory.puzzle, "🧠"],
      ["Artista curioso", "Aprendió sobre colores y artistas.", ContentCategory.creativity, "🎨"],
    ].map(([title, description, category, icon], index) =>
      tx.achievement.create({
        data: {
          title: String(title),
          description: String(description),
          category: category as ContentCategory,
          badgeColor: "#6366F1",
          badgeIcon: String(icon),
          rarity: index === 0 ? AchievementRarity.RARE : AchievementRarity.COMMON,
          systemKind: AchievementSystemKind.PROGRESS,
          slug: `seed-${index}-${String(title).toLowerCase().replace(/\s+/g, "-")}`,
          sortOrder: index,
        },
      }),
    ),
  );
  await tx.userAchievement.createMany({
    data: [
      { userId: accounts.children.lucia, achievementId: achievements[0]!.id },
      { userId: accounts.children.emma, achievementId: achievements[2]!.id },
    ],
  });

  await tx.quizAttempt.createMany({
    data: [
      { userId: accounts.children.lucia, quizId: quizzes[0]!.id, score: 100, maxScore: 5, correctCount: 5, durationMs: 120_000 },
      { userId: accounts.children.mateo, quizId: quizzes[7]!.id, score: 80, maxScore: 5, correctCount: 4, durationMs: 150_000 },
    ],
  });
  await tx.miniGameSession.createMany({
    data: [
      { userId: accounts.children.lucia, miniGameId: games[0]!.id, score: 180, durationMs: 90_000, levelIndex: 4, metadata: { completed: true } },
      { userId: accounts.children.daniel, miniGameId: games[1]!.id, score: 240, durationMs: 110_000, levelIndex: 8, metadata: { completed: true } },
    ],
  });
  await tx.appNotification.create({
    data: {
      userId: accounts.children.lucia,
      type: NotificationKind.SYSTEM,
      title: "Contenido real listo",
      body: "Ya podés explorar quizzes, juegos y recursos educativos curados.",
      data: {},
    },
  });
  await tx.liveEvent.create({
    data: {
      title: "Trivia en vivo: vuelta al mundo",
      description: "Preguntas de geografía, ciencia y cultura para jugar en familia.",
      startsAt: new Date(Date.now() + 86_400_000),
      endsAt: new Date(Date.now() + 90_000_000),
      streamUrl: "https://example.com/live-demo",
      status: LiveEventStatus.SCHEDULED,
      hostLabel: "Equipo EduPlay",
    },
  });
  await tx.userStreak.create({
    data: {
      userId: accounts.children.daniel,
      kind: StreakKind.QUIZ_DAILY,
      currentCount: 5,
      bestCount: 12,
      lastEventDate: new Date(),
    },
  });
}

function printCatalogSummary(note?: string): void {
  console.log(`  Quizzes: ${QUIZZES.length} (${QUIZZES.reduce((sum, q) => sum + q.questions.length, 0)} preguntas reales)`);
  console.log(`  Contenidos Aprender: ${CONTENT.length}`);
  console.log(`  Activos educativos (imagen): ${EDUCATIONAL_ASSET_SEED_DATA.length}`);
  console.log(`  Juegos: ${MINI_GAMES.length} + ${VISUAL_QUESTIONS.length} preguntas visuales`);
  if (note) console.log(`  ${note}`);
}

async function main(): Promise<void> {
  const safe = seedSkipDbClear();

  if (!safe) {
    logStep("Limpiando base de datos...");
    await clearDatabase();

    logStep("Creando cuentas demo...");
    const accounts = await seedDemoAccounts();

    logStep("Creando catálogo educativo curado...");
    await prisma.$transaction(async (tx) => {
      const topicIds = await seedEducationalTree(tx);
      const assetByName = await seedEducationalAssets(tx);
      await seedContent(tx, topicIds, assetByName);
      const quizzes = await seedQuizzes(tx, topicIds, assetByName);
      const games = await seedMiniGames(tx, assetByName);
      await seedSupportingData(tx, accounts, quizzes, games);
    });

    logStep("Listo. Resumen:");
    printCatalogSummary();
    console.log("  Padres: maria@eduplay.demo, carlos@eduplay.demo, ana@eduplay.demo");
    console.log(`  Menores: ${Object.values(CHILD_LOGINS).join(", ")}`);
    console.log(`  Contraseña: ${DEMO_PASSWORD}`);
    return;
  }

  logStep("SEED_SKIP_DB_CLEAR activo: no se borra la base ni se crean cuentas demo.");

  const existingCategories = await prisma.educationalCategory.count();
  if (existingCategories > 0) {
    logStep(
      `El catálogo educativo ya tiene ${existingCategories} categoría(s). No se vuelven a crear filas del seed (slug únicos evitan duplicados).`,
    );
    logStep("Si necesitás un reset total, ejecutá sin SEED_SKIP_DB_CLEAR (solo en entorno descartable).");
    printCatalogSummary("(catálogo existente sin cambios)");
    return;
  }

  logStep(
    "Catálogo EduPlay vacío: insertando árbol temático, contenidos «Aprender», quizzes y minijuegos (sin datos pegados a menores demo).",
  );

  await prisma.$transaction(async (tx) => {
    const topicIds = await seedEducationalTree(tx);
    const assetByName = await seedEducationalAssets(tx);
    await seedContent(tx, topicIds, assetByName);
    await seedQuizzes(tx, topicIds, assetByName);
    await seedMiniGames(tx, assetByName);
  });

  logStep("Listo.");
  printCatalogSummary("Modo seguro omitió demostraciones por usuario (misiones / intentos / notificaciones de demo).");
}

main()
  .catch(handleSeedError)
  .finally(async () => {
    await prisma.$disconnect();
  });
