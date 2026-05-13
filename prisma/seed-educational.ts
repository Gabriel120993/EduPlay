/**
 * Semilla educativa masiva (complementa prisma/seed.ts).
 *
 * Objetivo: ~1000 preguntas verificables (matemáticas generadas + bancos curados)
 * más misiones temáticas, plantillas de misión y logros marcados como "bulk".
 *
 * Es idempotente: si existe la categoría raíz `eduplay-catalogo-masivo`, no inserta nada.
 *
 * Ejecución:
 *   npm run db:seed:educational
 *
 * (Usa `prisma/tsconfig.seed.json` + `tsconfig-paths` para resolución de `@prisma/client`.)
 */
import "dotenv/config";
import {
  AchievementRarity,
  AchievementSystemKind,
  Difficulty,
  PrismaClient,
  QuizQuestionType,
} from "@prisma/client";
import type { Prisma } from "@prisma/client";
import {
  BULK_EDUCATIONAL_TREE,
  BULK_MISSION_TEMPLATES,
  BULK_ROOT_CATEGORY_SLUG,
  BULK_THEMATIC_MISSIONS,
  BULK_ACHIEVEMENTS,
  buildAllBulkQuizChunks,
  type BulkQuizChunk,
  type BulkQuizQuestion,
} from "./lib/educationalBulkContent";

const prisma = new PrismaClient();

function log(msg: string): void {
  console.log(`[seed-educational] ${msg}`);
}

function correctIndex(question: BulkQuizQuestion): number {
  const index = question.options.indexOf(question.correctAnswer);
  if (index < 0) throw new Error(`Respuesta correcta no encontrada: ${question.correctAnswer}`);
  return index;
}

function mapAchievementRarity(value: (typeof BULK_ACHIEVEMENTS)[number]["rarity"]): AchievementRarity {
  switch (value) {
    case "COMMON":
      return AchievementRarity.COMMON;
    case "RARE":
      return AchievementRarity.RARE;
    case "EPIC":
      return AchievementRarity.EPIC;
    case "LEGENDARY":
      return AchievementRarity.LEGENDARY;
    default:
      return AchievementRarity.COMMON;
  }
}

function mapAchievementSystemKind(value: (typeof BULK_ACHIEVEMENTS)[number]["systemKind"]): AchievementSystemKind {
  switch (value) {
    case "PROGRESS":
      return AchievementSystemKind.PROGRESS;
    case "SKILL":
      return AchievementSystemKind.SKILL;
    case "SOCIAL":
      return AchievementSystemKind.SOCIAL;
    case "SPECIAL":
      return AchievementSystemKind.SPECIAL;
    case "COLLECTIBLE":
      return AchievementSystemKind.COLLECTIBLE;
    default:
      return AchievementSystemKind.PROGRESS;
  }
}

async function seedEducationalTree(tx: Prisma.TransactionClient): Promise<Map<string, string>> {
  const topicIds = new Map<string, string>();
  const tree = BULK_EDUCATIONAL_TREE;
  const categoryRow = await tx.educationalCategory.create({
    data: { slug: tree.slug, name: tree.name, icon: tree.icon, sortOrder: 99 },
  });
  for (let subjectIndex = 0; subjectIndex < tree.subjects.length; subjectIndex++) {
    const subject = tree.subjects[subjectIndex]!;
    const subjectRow = await tx.educationalSubject.create({
      data: { categoryId: categoryRow.id, slug: subject.slug, name: subject.name, sortOrder: subjectIndex },
    });
    for (let topicIndex = 0; topicIndex < subject.topics.length; topicIndex++) {
      const [slug, name, summary] = subject.topics[topicIndex]!;
      const topicRow = await tx.educationalTopic.create({
        data: {
          subjectId: subjectRow.id,
          slug,
          name,
          summary,
          sortOrder: topicIndex,
        },
      });
      topicIds.set(slug, topicRow.id);
    }
  }
  return topicIds;
}

async function seedBulkQuizzes(tx: Prisma.TransactionClient, topicIds: Map<string, string>): Promise<number> {
  const chunks = buildAllBulkQuizChunks();
  let questionTotal = 0;
  let quizIndex = 0;
  for (const chunk of chunks) {
    const topicId = topicIds.get(chunk.topicSlug);
    if (!topicId) {
      throw new Error(`Topic slug desconocido: ${chunk.topicSlug}`);
    }
    const quiz = await tx.quiz.create({
      data: {
        title: `${chunk.title} #${++quizIndex}`,
        description: chunk.description,
        topicId,
        legacyCategory: chunk.legacyCategory,
        difficulty: chunk.difficulty,
        questionCount: chunk.questions.length,
        published: true,
      },
    });
    for (const q of chunk.questions) {
      await tx.quizQuestion.create({
        data: {
          quizId: quiz.id,
          question: q.text,
          options: q.options,
          correct: correctIndex(q),
          category: chunk.legacyCategory,
          difficulty: chunk.difficulty,
          quizLevel: chunk.difficulty === Difficulty.EASY ? 1 : chunk.difficulty === Difficulty.MEDIUM ? 2 : 3,
          knowledgeArea: chunk.knowledgeArea,
          topicSlug: chunk.topicSlug,
          questionType: QuizQuestionType.MULTIPLE_CHOICE,
          explanation: q.explanation,
        },
      });
      questionTotal += 1;
    }
  }
  return questionTotal;
}

async function seedCatalogExtras(tx: Prisma.TransactionClient): Promise<void> {
  for (const mission of BULK_THEMATIC_MISSIONS) {
    await tx.thematicMission.create({ data: { ...mission, isActive: true } });
  }
  for (let index = 0; index < BULK_MISSION_TEMPLATES.length; index++) {
    const mission = BULK_MISSION_TEMPLATES[index]!;
    await tx.mission.create({
      data: {
        title: mission.title,
        description: mission.description,
        category: mission.category,
        targetValue: mission.targetValue,
        type: mission.type,
      },
    });
  }
  for (let index = 0; index < BULK_ACHIEVEMENTS.length; index++) {
    const achievement = BULK_ACHIEVEMENTS[index]!;
    await tx.achievement.create({
      data: {
        title: achievement.title,
        description: achievement.description,
        category: achievement.category,
        slug: achievement.slug,
        systemKind: mapAchievementSystemKind(achievement.systemKind),
        rarity: mapAchievementRarity(achievement.rarity),
        collectionKey: achievement.collectionKey ?? null,
        sortOrder: 900 + index,
      },
    });
  }
}

async function main(): Promise<void> {
  const exists = await prisma.educationalCategory.findUnique({ where: { slug: BULK_ROOT_CATEGORY_SLUG } });
  if (exists) {
    log(`La categoría '${BULK_ROOT_CATEGORY_SLUG}' ya existe. No se duplican datos (slug único).`);
    return;
  }

  log("Insertando catálogo masivo en una transacción…");
  const chunks: BulkQuizChunk[] = buildAllBulkQuizChunks();
  const expectedQuestions = chunks.reduce((sum, chunk) => sum + chunk.questions.length, 0);

  const insertedQuestions = await prisma.$transaction(async (tx) => {
    const topicIds = await seedEducationalTree(tx);
    const total = await seedBulkQuizzes(tx, topicIds);
    await seedCatalogExtras(tx);
    return total;
  });

  if (insertedQuestions !== expectedQuestions) {
    throw new Error(`Conteo inconsistente: esperadas ${expectedQuestions}, insertadas ${insertedQuestions}.`);
  }

  log(`Listo. Insertadas ${insertedQuestions} preguntas en ${chunks.length} cuestionarios + misiones/logros extra.`);
}

main()
  .catch((err) => {
    console.error("[seed-educational] Error:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
