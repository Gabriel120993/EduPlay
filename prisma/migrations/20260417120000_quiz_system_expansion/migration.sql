-- Enums y tablas del sistema de quizzes ampliado (áreas, tipos, repaso, desafío diario, monedas).

CREATE TYPE "QuizKnowledgeArea" AS ENUM (
  'mathematics',
  'natural_sciences',
  'social_sciences',
  'language',
  'art_culture',
  'logic_thinking',
  'emotions_values'
);

CREATE TYPE "QuizQuestionType" AS ENUM (
  'MULTIPLE_CHOICE',
  'TRUE_FALSE',
  'ORDER'
);

ALTER TABLE "User" ADD COLUMN "quizCoins" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "QuizQuestion" ADD COLUMN "quizLevel" INTEGER NOT NULL DEFAULT 2;
ALTER TABLE "QuizQuestion" ADD COLUMN "knowledgeArea" "QuizKnowledgeArea" NOT NULL DEFAULT 'mathematics';
ALTER TABLE "QuizQuestion" ADD COLUMN "topicSlug" VARCHAR(120) NOT NULL DEFAULT 'general';
ALTER TABLE "QuizQuestion" ADD COLUMN "questionType" "QuizQuestionType" NOT NULL DEFAULT 'MULTIPLE_CHOICE';
ALTER TABLE "QuizQuestion" ADD COLUMN "explanation" TEXT NOT NULL DEFAULT '';
ALTER TABLE "QuizQuestion" ADD COLUMN "hintText" TEXT;
ALTER TABLE "QuizQuestion" ADD COLUMN "hintCost" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "QuizQuestion" ADD COLUMN "readingPassage" TEXT;
ALTER TABLE "QuizQuestion" ADD COLUMN "orderTapSequence" JSONB;

UPDATE "QuizQuestion"
SET "knowledgeArea" = 'natural_sciences',
    "topicSlug" = 'legacy'
WHERE lower("category") IN ('astronomy', 'science');

UPDATE "QuizQuestion"
SET "knowledgeArea" = 'mathematics',
    "topicSlug" = 'legacy'
WHERE lower("category") = 'math';

UPDATE "QuizQuestion"
SET "knowledgeArea" = 'social_sciences',
    "topicSlug" = 'legacy'
WHERE lower("category") IN ('history', 'geography');

UPDATE "QuizQuestion"
SET "knowledgeArea" = 'art_culture',
    "topicSlug" = 'legacy'
WHERE lower("category") = 'creativity';

UPDATE "QuizQuestion"
SET "quizLevel" = CASE
  WHEN "difficulty"::text = 'EASY' THEN 2
  WHEN "difficulty"::text = 'MEDIUM' THEN 3
  ELSE 4
END;

CREATE TABLE "UserQuizAreaSkill" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "area" "QuizKnowledgeArea" NOT NULL,
    "adaptiveLevel" INTEGER NOT NULL DEFAULT 2,
    "lastCorrect" INTEGER NOT NULL DEFAULT 0,
    "lastWrong" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserQuizAreaSkill_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserQuizAreaSkill_userId_area_key" ON "UserQuizAreaSkill"("userId", "area");
CREATE INDEX "UserQuizAreaSkill_userId_idx" ON "UserQuizAreaSkill"("userId");
ALTER TABLE "UserQuizAreaSkill" ADD CONSTRAINT "UserQuizAreaSkill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "UserQuizFlashcard" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "intervalDays" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "repetitions" INTEGER NOT NULL DEFAULT 0,
    "nextReviewAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserQuizFlashcard_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserQuizFlashcard_userId_questionId_key" ON "UserQuizFlashcard"("userId", "questionId");
CREATE INDEX "UserQuizFlashcard_userId_nextReviewAt_idx" ON "UserQuizFlashcard"("userId", "nextReviewAt");
ALTER TABLE "UserQuizFlashcard" ADD CONSTRAINT "UserQuizFlashcard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserQuizFlashcard" ADD CONSTRAINT "UserQuizFlashcard_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "QuizQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "QuizDailyProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "bestScore" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuizDailyProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "QuizDailyProgress_userId_day_key" ON "QuizDailyProgress"("userId", "day");
CREATE INDEX "QuizDailyProgress_userId_day_idx" ON "QuizDailyProgress"("userId", "day");
ALTER TABLE "QuizDailyProgress" ADD CONSTRAINT "QuizDailyProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "UserQuizStreak" (
    "userId" TEXT NOT NULL,
    "streakDays" INTEGER NOT NULL DEFAULT 0,
    "lastQualifyingDayUtc" DATE,

    CONSTRAINT "UserQuizStreak_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "UserQuizStreak" ADD CONSTRAINT "UserQuizStreak_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
