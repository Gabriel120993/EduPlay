/**
 * Seed completo de demo EduPlay.
 * Ejecutar: npx prisma db seed  |  npm run db:seed
 *
 * Credenciales:
 * - Padres (login panel): maria@eduplay.demo, carlos@eduplay.demo, ana@eduplay.demo — contraseña: EduPlay2024!
 * - Menores (login app): ver constantes CHILD_LOGINS
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
  MiniGame,
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

const prisma = new PrismaClient();

const DEMO_PASSWORD = "EduPlay2024!";
const BCRYPT_ROUNDS = 10;

/** Login menor sugerido (username / misma contraseña DEMO_PASSWORD) */
export const CHILD_LOGINS = {
  lucia: "lucia_demo",
  mateo: "mateo_demo",
  sofia: "sofia_demo",
  daniel: "daniel_demo",
  emma: "emma_demo",
} as const;

// --- Helpers -----------------------------------------------------------------

async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

function logStep(msg: string): void {
  console.log(`[seed] ${msg}`);
}

function handleSeedError(err: unknown): never {
  console.error("[seed] Error:", err);
  if (err instanceof Error) {
    console.error(err.stack);
  }
  throw err;
}

/** Orden seguro respetando FKs (de hijos a padres). */
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

function mapTopicToKnowledgeArea(catSlug: string): QuizKnowledgeArea {
  const m: Record<string, QuizKnowledgeArea> = {
    matematicas: QuizKnowledgeArea.mathematics,
    "ciencias-naturales": QuizKnowledgeArea.natural_sciences,
    "ciencias-sociales": QuizKnowledgeArea.social_sciences,
    lenguaje: QuizKnowledgeArea.language,
    arte: QuizKnowledgeArea.art_culture,
    "pensamiento-logico": QuizKnowledgeArea.logic_thinking,
  };
  return m[catSlug] ?? QuizKnowledgeArea.mathematics;
}

function mapCategorySlugToLegacy(catSlug: string): string {
  const m: Record<string, string> = {
    matematicas: "math",
    "ciencias-naturales": "science",
    "ciencias-sociales": "geography",
    lenguaje: "education",
    arte: "creativity",
    "pensamiento-logico": "puzzle",
  };
  return m[catSlug] ?? "education";
}

function mapToContentCategory(catSlug: string): ContentCategory {
  const m: Record<string, ContentCategory> = {
    matematicas: ContentCategory.math,
    "ciencias-naturales": ContentCategory.science,
    "ciencias-sociales": ContentCategory.geography,
    lenguaje: ContentCategory.education,
    arte: ContentCategory.creativity,
    "pensamiento-logico": ContentCategory.puzzle,
  };
  return m[catSlug] ?? ContentCategory.education;
}

type TopicRow = { id: string; name: string; subjectSlug: string; catSlug: string };

async function seedEducationalTreeAndQuizzes(
  tx: Prisma.TransactionClient,
): Promise<{ topics: TopicRow[]; quizzes: { id: string }[] }> {
  const allCats: { slug: string; name: string; subjects: { slug: string; name: string; topics: string[] }[] }[] = [
    {
      slug: "matematicas",
      name: "Matemáticas",
      subjects: [
        { slug: "aritmetica", name: "Aritmética", topics: ["Sumas y restas", "Multiplicación", "División"] },
        { slug: "geometria", name: "Geometría", topics: ["Figuras planas", "Perímetro", "Ángulos"] },
        { slug: "fracciones", name: "Fracciones", topics: ["Concepto", "Equivalentes", "Suma de fracciones"] },
      ],
    },
    {
      slug: "ciencias-naturales",
      name: "Ciencias Naturales",
      subjects: [
        { slug: "biologia", name: "Biología", topics: ["Células", "Ecosistemas", "Cadena alimentaria"] },
        { slug: "fisica", name: "Física", topics: ["Movimiento", "Energía", "Materia"] },
        { slug: "quimica", name: "Química", topics: ["Estados de la materia", "Mezclas", "Reacciones simples"] },
      ],
    },
    {
      slug: "ciencias-sociales",
      name: "Ciencias Sociales",
      subjects: [
        { slug: "historia", name: "Historia", topics: ["Antigüedad", "Edad Media", "Revoluciones"] },
        { slug: "geografia", name: "Geografía", topics: ["Continentes", "Climas", "Mapas"] },
        { slug: "civica", name: "Cívica", topics: ["Derechos", "Convivencia", "Democracia"] },
      ],
    },
    {
      slug: "lenguaje",
      name: "Lenguaje",
      subjects: [
        { slug: "lectura", name: "Lectura", topics: ["Comprensión", "Inferencias", "Vocabulario"] },
        { slug: "escritura", name: "Escritura", topics: ["Oraciones", "Párrafos", "Revisión"] },
        { slug: "oralidad", name: "Oralidad", topics: ["Escuchar", "Contar", "Debate"] },
      ],
    },
    {
      slug: "arte",
      name: "Arte",
      subjects: [
        { slug: "musica", name: "Música", topics: ["Ritmo", "Instrumentos", "Partitura simple"] },
        { slug: "plastica", name: "Plástica", topics: ["Color", "Texturas", "Composición"] },
        { slug: "teatro", name: "Teatro", topics: ["Personajes", "Escena", "Improvisación"] },
      ],
    },
    {
      slug: "pensamiento-logico",
      name: "Pensamiento Lógico",
      subjects: [
        { slug: "patrones", name: "Patrones", topics: ["Secuencias", "Reglas", "Analogías"] },
        { slug: "puzzles", name: "Puzzles", topics: ["Sudoku junior", "Laberintos", "Sudokus visuales"] },
        { slug: "deduccion", name: "Deducción", topics: ["Pistas", "Tablas lógicas", "Hipótesis"] },
      ],
    },
  ];

  const topics: TopicRow[] = [];
  let sortCat = 0;
  for (const cat of allCats) {
    const c = await tx.educationalCategory.create({
      data: { slug: cat.slug, name: cat.name, sortOrder: sortCat++, icon: "book" },
    });
    let sOrd = 0;
    for (const sub of cat.subjects) {
      const s = await tx.educationalSubject.create({
        data: { categoryId: c.id, slug: sub.slug, name: sub.name, sortOrder: sOrd++ },
      });
      let tOrd = 0;
      for (const topicName of sub.topics) {
        const t = await tx.educationalTopic.create({
          data: {
            subjectId: s.id,
            slug: `${sub.slug}-${tOrd}-${topicName.slice(0, 8).toLowerCase().replace(/\s/g, "-")}`,
            name: topicName,
            summary: `Tema: ${topicName} (${sub.name})`,
            sortOrder: tOrd++,
          },
        });
        topics.push({ id: t.id, name: topicName, subjectSlug: sub.slug, catSlug: cat.slug });
      }
    }
  }

  const quizzes: { id: string }[] = [];
  const TARGET_QUESTIONS = 250;
  const questionsPerQuiz = 5;
  const quizzesNeeded = TARGET_QUESTIONS / questionsPerQuiz; // 50

  let qGlobal = 0;
  for (const topic of topics) {
    if (quizzes.length >= quizzesNeeded) break;
    for (let qIdx = 0; qIdx < 5 && quizzes.length < quizzesNeeded; qIdx++) {
      const quiz = await tx.quiz.create({
        data: {
          title: `Quiz ${qIdx + 1}: ${topic.name}`,
          description: `Evaluación corta sobre ${topic.name}`,
          topicId: topic.id,
          legacyCategory: mapToContentCategory(topic.catSlug),
          difficulty: Difficulty.MEDIUM,
          questionCount: questionsPerQuiz,
          published: true,
        },
      });
      quizzes.push({ id: quiz.id });
      for (let i = 0; i < questionsPerQuiz; i++) {
        qGlobal++;
        const opts = [
          `Opción A (${topic.name} #${qGlobal})`,
          `Opción B (${topic.name} #${qGlobal})`,
          `Opción C (${topic.name} #${qGlobal})`,
          `Opción D (${topic.name} #${qGlobal})`,
        ];
        await tx.quizQuestion.create({
          data: {
            quizId: quiz.id,
            question: `Pregunta ${i + 1} del quiz «${topic.name}» (#${qGlobal})`,
            options: opts,
            correct: i % 4,
            category: mapCategorySlugToLegacy(topic.catSlug),
            difficulty: Difficulty.EASY,
            quizLevel: 2,
            knowledgeArea: mapTopicToKnowledgeArea(topic.catSlug),
            topicSlug: topic.subjectSlug,
            questionType: QuizQuestionType.MULTIPLE_CHOICE,
            explanation: "Respuesta alineada con el tema de estudio.",
          },
        });
      }
      await tx.quiz.update({
        where: { id: quiz.id },
        data: { questionCount: questionsPerQuiz },
      });
    }
  }

  logStep(`Árbol educativo: ${topics.length} temas, ${quizzes.length} quizzes, ${TARGET_QUESTIONS} preguntas.`);
  return { topics, quizzes };
}

async function main(): Promise<void> {
  logStep("Limpiando base de datos…");
  await clearDatabase();

  const passwordHashParents = await hashPassword(DEMO_PASSWORD);
  const passwordHashChildren = await hashPassword(DEMO_PASSWORD);

  logStep("Creando padres (cuenta tutor)…");
  const [parentMaria, parentCarlos, parentAna] = await Promise.all([
    prisma.parent.create({
      data: { email: "maria@eduplay.demo", password: passwordHashParents },
    }),
    prisma.parent.create({
      data: { email: "carlos@eduplay.demo", password: passwordHashParents },
    }),
    prisma.parent.create({
      data: { email: "ana@eduplay.demo", password: passwordHashParents },
    }),
  ]);

  logStep("Creando usuarios tutor (tipo parent) para MinorProfile.parentId…");
  const [userMaria, userCarlos, userAna] = await Promise.all([
    prisma.user.create({
      data: {
        username: "maria_tutor",
        realName: "María López",
        passwordHash: passwordHashParents,
        age: 38,
        parentId: parentMaria.id,
        type: UserType.parent,
        status: UserStatus.active,
        level: 1,
        experience: 0,
        parentAccountApprovedAt: new Date(),
      },
    }),
    prisma.user.create({
      data: {
        username: "carlos_tutor",
        realName: "Carlos Pérez",
        passwordHash: passwordHashParents,
        age: 40,
        parentId: parentCarlos.id,
        type: UserType.parent,
        status: UserStatus.active,
        level: 1,
        experience: 0,
        parentAccountApprovedAt: new Date(),
      },
    }),
    prisma.user.create({
      data: {
        username: "ana_tutor",
        realName: "Ana Gómez",
        passwordHash: passwordHashParents,
        age: 41,
        parentId: parentAna.id,
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
        userId: userMaria.id,
        verificationStatus: VerificationStatus.verified,
        verificationMethod: VerificationMethod.email,
        subscriptionTier: SubscriptionTier.premium,
      },
    }),
    prisma.parentProfile.create({
      data: {
        userId: userCarlos.id,
        verificationStatus: VerificationStatus.verified,
        verificationMethod: VerificationMethod.email,
        subscriptionTier: SubscriptionTier.basic,
      },
    }),
    prisma.parentProfile.create({
      data: {
        userId: userAna.id,
        verificationStatus: VerificationStatus.verified,
        verificationMethod: VerificationMethod.email,
        subscriptionTier: SubscriptionTier.premium,
      },
    }),
  ]);

  logStep("Creando menores…");
  const uLucia = await prisma.user.create({
    data: {
      username: CHILD_LOGINS.lucia,
      realName: "Lucía",
      passwordHash: passwordHashChildren,
      age: 8,
      parentId: parentMaria.id,
      type: UserType.minor,
      status: UserStatus.active,
      level: 5,
      experience: 450,
      quizCoins: 120,
      parentAccountApprovedAt: new Date(),
    },
  });
  const uMateo = await prisma.user.create({
    data: {
      username: CHILD_LOGINS.mateo,
      realName: "Mateo",
      passwordHash: passwordHashChildren,
      age: 10,
      parentId: parentMaria.id,
      type: UserType.minor,
      status: UserStatus.active,
      level: 8,
      experience: 780,
      quizCoins: 200,
      parentAccountApprovedAt: new Date(),
    },
  });
  const uSofia = await prisma.user.create({
    data: {
      username: CHILD_LOGINS.sofia,
      realName: "Sofía",
      passwordHash: passwordHashChildren,
      age: 6,
      parentId: parentCarlos.id,
      type: UserType.minor,
      status: UserStatus.active,
      level: 2,
      experience: 110,
      quizCoins: 40,
      parentAccountApprovedAt: new Date(),
    },
  });
  const uDaniel = await prisma.user.create({
    data: {
      username: CHILD_LOGINS.daniel,
      realName: "Daniel",
      passwordHash: passwordHashChildren,
      age: 12,
      parentId: parentAna.id,
      type: UserType.minor,
      status: UserStatus.active,
      level: 12,
      experience: 1180,
      quizCoins: 300,
      parentAccountApprovedAt: new Date(),
    },
  });
  const uEmma = await prisma.user.create({
    data: {
      username: CHILD_LOGINS.emma,
      realName: "Emma",
      passwordHash: passwordHashChildren,
      age: 9,
      parentId: parentAna.id,
      type: UserType.minor,
      status: UserStatus.active,
      level: 6,
      experience: 560,
      quizCoins: 150,
      parentAccountApprovedAt: new Date(),
    },
  });

  await Promise.all([
    prisma.minorProfile.create({
      data: {
        userId: uLucia.id,
        parentId: userMaria.id,
        age: 8,
        gradeLevel: "3",
        school: "Escuela Demo Norte",
        interests: ["math", "creativity"],
        dailyTimeLimit: 90,
        contentRestrictions: {},
        canMakePurchases: false,
        canAddFriends: true,
        canPostContent: true,
      },
    }),
    prisma.minorProfile.create({
      data: {
        userId: uMateo.id,
        parentId: userMaria.id,
        age: 10,
        gradeLevel: "5",
        school: "Escuela Demo Norte",
        interests: ["science", "math"],
        dailyTimeLimit: 90,
        contentRestrictions: {},
        canMakePurchases: false,
        canAddFriends: true,
        canPostContent: true,
      },
    }),
    prisma.minorProfile.create({
      data: {
        userId: uSofia.id,
        parentId: userCarlos.id,
        age: 6,
        gradeLevel: "1",
        school: "Jardín Demo Sur",
        interests: ["education"],
        dailyTimeLimit: 45,
        contentRestrictions: {},
        canMakePurchases: false,
        canAddFriends: false,
        canPostContent: false,
      },
    }),
    prisma.minorProfile.create({
      data: {
        userId: uDaniel.id,
        parentId: userAna.id,
        age: 12,
        gradeLevel: "7",
        school: "Instituto Demo",
        interests: ["geography", "history"],
        dailyTimeLimit: 120,
        contentRestrictions: {},
        canMakePurchases: false,
        canAddFriends: true,
        canPostContent: true,
      },
    }),
    prisma.minorProfile.create({
      data: {
        userId: uEmma.id,
        parentId: userAna.id,
        age: 9,
        gradeLevel: "4",
        school: "Escuela Demo Este",
        interests: ["creativity", "education"],
        dailyTimeLimit: 75,
        contentRestrictions: {},
        canMakePurchases: false,
        canAddFriends: true,
        canPostContent: true,
      },
    }),
  ]);

  await prisma.parentChildRelation.createMany({
    data: [
      { parentId: userMaria.id, childId: uLucia.id, status: ParentChildRelationStatus.active },
      { parentId: userMaria.id, childId: uMateo.id, status: ParentChildRelationStatus.active },
      { parentId: userCarlos.id, childId: uSofia.id, status: ParentChildRelationStatus.active },
      { parentId: userAna.id, childId: uDaniel.id, status: ParentChildRelationStatus.active },
      { parentId: userAna.id, childId: uEmma.id, status: ParentChildRelationStatus.active },
    ],
  });

  await prisma.$transaction(async (tx) => {
    const { quizzes } = await seedEducationalTreeAndQuizzes(tx);

    logStep("Logros (15 en 3 colecciones)…");
    const achievementDefs: {
      title: string;
      slug: string;
      collectionKey: string;
      category: ContentCategory;
      sort: number;
    }[] = [];
    const cols = [
      { key: "exploradores", prefix: "exp", names: ["Primer mapa", "Brújula", "Ruta trazada", "Horizonte", "Expedición"] },
      { key: "cientificos", prefix: "cie", names: ["Laboratorio", "Hipótesis", "Experimento", "Datos", "Descubrimiento"] },
      { key: "artistas", prefix: "art", names: ["Paleta", "Boceto", "Color", "Museo", "Creación"] },
    ];
    let ord = 0;
    for (const col of cols) {
      for (let i = 0; i < 5; i++) {
        achievementDefs.push({
          title: `${col.names[i]} (${col.key})`,
          slug: `demo-${col.prefix}-${i + 1}`,
          collectionKey: col.key,
          category: ContentCategory.creativity,
          sort: ord++,
        });
      }
    }

    const achievements = await Promise.all(
      achievementDefs.map((a) =>
        tx.achievement.create({
          data: {
            title: a.title,
            description: `Logro de colección ${a.collectionKey} — demo seed.`,
            category: a.category,
            rarity: AchievementRarity.COMMON,
            systemKind: AchievementSystemKind.COLLECTIBLE,
            hidden: false,
            collectionKey: a.collectionKey,
            slug: a.slug,
            sortOrder: a.sort,
          },
        }),
      ),
    );

    const grant = async (userId: string, indices: number[]) => {
      for (const i of indices) {
        const ach = achievements[i];
        if (!ach) continue;
        await tx.userAchievement.create({
          data: { userId, achievementId: ach.id },
        });
      }
    };
    await grant(uLucia.id, [0, 1, 2]);
    await grant(uMateo.id, [0, 1, 2, 3, 4]);
    await grant(uSofia.id, [0]);
    await grant(uDaniel.id, [0, 1, 2, 3, 4, 5, 6, 7]);
    await grant(uEmma.id, [5, 6, 7, 8]);

    logStep("Minijuegos (10)…");
    const miniDefs: { slug: string; name: string; cat: ContentCategory }[] = [
      { slug: "tesoro-matematico", name: "Tesoro Matemático", cat: ContentCategory.math },
      { slug: "constructor-palabras", name: "Constructor de Palabras", cat: ContentCategory.education },
      { slug: "laberinto-numeros", name: "Laberinto de Números", cat: ContentCategory.math },
      { slug: "memoria-ciencia", name: "Memoria Ciencia", cat: ContentCategory.science },
      { slug: "puzzle-mapa", name: "Puzzle del Mapa", cat: ContentCategory.geography },
      { slug: "ritmo-lectura", name: "Ritmo Lector", cat: ContentCategory.education },
      { slug: "colorea-sumas", name: "Colorea Sumas", cat: ContentCategory.math },
      { slug: "capas-tierra", name: "Capas de la Tierra", cat: ContentCategory.science },
      { slug: "simon-logico", name: "Simón Lógico", cat: ContentCategory.puzzle },
      { slug: "meteorito-letras", name: "Meteorito de Letras", cat: ContentCategory.creativity },
    ];
    const miniRows: MiniGame[] = [];
    for (let i = 0; i < miniDefs.length; i++) {
      const m = miniDefs[i]!;
      miniRows.push(
        await tx.miniGame.create({
          data: {
            slug: m.slug,
            name: m.name,
            description: `Minijuego demo: ${m.name}`,
            category: m.cat,
            difficulty: Difficulty.MEDIUM,
            config: { seedIndex: i, levels: 5 },
            isActive: true,
            sortOrder: i,
          },
        }),
      );
    }

    await tx.miniGameSession.createMany({
      data: [
        { userId: uLucia.id, miniGameId: miniRows[0]!.id, score: 120, durationMs: 45_000 },
        { userId: uMateo.id, miniGameId: miniRows[1]!.id, score: 200, durationMs: 60_000 },
        { userId: uDaniel.id, miniGameId: miniRows[2]!.id, score: 340, durationMs: 90_000 },
      ],
    });

    logStep("Misiones temáticas (catálogo en BD, 5)…");
    const missionRows = await Promise.all([
      tx.thematicMission.create({
        data: {
          slug: "astronauta-por-un-dia",
          title: "Astronauta por un Día",
          theme: "El Espacio",
          narrative: "Entrenamiento orbital y regreso a la Luna.",
          reward: "Traje de astronauta",
          stepCount: 6,
          seasonMonth: "2026-04",
        },
      }),
      tx.thematicMission.create({
        data: {
          slug: "detective-del-pasado",
          title: "Detective del Pasado",
          theme: "Historia Antigua",
          narrative: "Pistas en el Nilo y jeroglíficos.",
          reward: "Lupa de detective",
          stepCount: 5,
        },
      }),
      tx.thematicMission.create({
        data: {
          slug: "chef-matematico",
          title: "Chef Matemático",
          theme: "Fracciones",
          narrative: "Cocina con medidas exactas.",
          reward: "Gorro de chef",
          stepCount: 5,
        },
      }),
      tx.thematicMission.create({
        data: {
          slug: "guardian-de-la-naturaleza",
          title: "Guardián de la Naturaleza",
          theme: "Ecología",
          narrative: "Cadenas y océanos.",
          reward: "Mascota virtual",
          stepCount: 5,
        },
      }),
      tx.thematicMission.create({
        data: {
          slug: "artista-renacentista",
          title: "Artista Renacentista",
          theme: "Arte",
          narrative: "Del taller al museo.",
          reward: "Paleta",
          stepCount: 5,
        },
      }),
    ]);

    const astro = missionRows[0]!;
    await tx.userThematicMissionProgress.create({
      data: {
        userId: uMateo.id,
        missionSlug: "astronauta-por-un-dia",
        thematicMissionId: astro.id,
        currentStepIndex: 6,
        completed: true,
        bestScore: 95,
        attemptCount: 1,
        completedAt: new Date(),
      },
    });

    await tx.userThematicMissionProgress.createMany({
      data: [
        {
          userId: uEmma.id,
          missionSlug: "detective-del-pasado",
          thematicMissionId: missionRows[1]!.id,
          currentStepIndex: 5,
          completed: true,
          bestScore: 88,
          attemptCount: 1,
          completedAt: new Date(),
        },
        {
          userId: uEmma.id,
          missionSlug: "chef-matematico",
          thematicMissionId: missionRows[2]!.id,
          currentStepIndex: 5,
          completed: true,
          bestScore: 90,
          attemptCount: 1,
          completedAt: new Date(),
        },
      ],
    });

    logStep("Retos diarios (7)…");
    const dayKey = new Date().toISOString().slice(0, 10);
    const dailyTitles = [
      "Suma 10 minutos de lectura",
      "Completa 1 quiz",
      "Juega un minijuego",
      "Repasa 3 flashcards",
      "Comparte un logro",
      "Resuelve 5 preguntas correctas",
      "Mantén la racha 1 día",
    ];
    for (let i = 0; i < 7; i++) {
      await tx.userGamifiedChallenge.create({
        data: {
          userId: uLucia.id,
          bucket: ChallengeBucket.DAILY,
          periodKey: dayKey,
          challengeSlug: `daily-seed-${i + 1}`,
          title: dailyTitles[i]!,
          description: "Reto diario demo (seed).",
          target: 1,
          progress: i % 3 === 0 ? 1 : 0,
          completed: i === 0,
          completedAt: i === 0 ? new Date() : null,
        },
      });
    }

    logStep("Intentos de quiz (progreso demo)…");
    const attempt = async (userId: string, count: number) => {
      for (let i = 0; i < count; i++) {
        const q = quizzes[i % quizzes.length]!;
        await tx.quizAttempt.create({
          data: {
            userId,
            quizId: q.id,
            score: 4 + (i % 2),
            maxScore: 5,
            correctCount: 4 + (i % 2),
            durationMs: 30_000 + i * 1000,
          },
        });
      }
    };
    await attempt(uLucia.id, 10);
    await attempt(uMateo.id, 3);
    await attempt(uSofia.id, 1);
    await attempt(uDaniel.id, 25);
    await attempt(uEmma.id, 4);

    logStep("Contenidos educativos de ejemplo (20 ítems)…");
    const sampleTopics = await tx.educationalTopic.findMany({ take: 10 });
    for (let i = 0; i < 20; i++) {
      const topic = sampleTopics[i % sampleTopics.length];
      await tx.educationalContent.create({
        data: {
          title: `Recurso demo ${i + 1}`,
          description: "Material generado por seed.",
          content: `# Contenido ${i + 1}\n\nTexto o guion breve para clase.`,
          contentType: [EducationalContentType.READING, EducationalContentType.VIDEO, EducationalContentType.EXPERIMENT][i % 3]!,
          category: "demo",
          difficulty: Difficulty.EASY,
          topicId: topic?.id,
          published: true,
        },
      });
    }

    logStep("Notificación y evento en vivo de ejemplo…");
    await tx.appNotification.create({
      data: {
        userId: uLucia.id,
        type: NotificationKind.SYSTEM,
        title: "Bienvenida a EduPlay",
        body: "Tu cuenta demo está lista para explorar.",
        data: {},
      },
    });
    await tx.liveEvent.create({
      data: {
        title: "Trivia en vivo — demo",
        description: "Evento de prueba.",
        startsAt: new Date(Date.now() + 86400000),
        endsAt: new Date(Date.now() + 90000000),
        streamUrl: "https://example.com/live-demo",
        status: LiveEventStatus.SCHEDULED,
        hostLabel: "Equipo EduPlay",
      },
    });

    await tx.userStreak.create({
      data: {
        userId: uDaniel.id,
        kind: StreakKind.QUIZ_DAILY,
        currentCount: 5,
        bestCount: 12,
        lastEventDate: new Date(),
      },
    });
  });

  logStep("Listo. Resumen:");
  console.log("  Padres: maria@eduplay.demo, carlos@eduplay.demo, ana@eduplay.demo");
  console.log(`  Contraseña padres y menores: ${DEMO_PASSWORD}`);
  console.log(`  Menores: ${CHILD_LOGINS.lucia}, ${CHILD_LOGINS.mateo}, … (ver CHILD_LOGINS)`);
}

main()
  .catch(handleSeedError)
  .finally(async () => {
    await prisma.$disconnect();
  });
