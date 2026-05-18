-- CreateEnum
CREATE TYPE "PlayGameCategory" AS ENUM ('MEMORY', 'LOGIC', 'MATH', 'LANGUAGE', 'SPATIAL', 'ATTENTION', 'EMOTIONAL', 'GENERAL_KNOWLEDGE');

-- CreateEnum
CREATE TYPE "PlayGameType" AS ENUM ('SOLO', 'VERSUS', 'COOPERATIVE', 'DAILY_CHALLENGE');

-- CreateEnum
CREATE TYPE "PlayGameChallengeStatus" AS ENUM ('PENDING', 'ACCEPTED', 'COMPLETED', 'EXPIRED', 'DECLINED');

-- CreateTable
CREATE TABLE "PlayGame" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(64) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "PlayGameCategory" NOT NULL,
    "type" "PlayGameType" NOT NULL,
    "difficultyMin" INTEGER NOT NULL DEFAULT 1,
    "difficultyMax" INTEGER NOT NULL DEFAULT 10,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "thumbnailUrl" TEXT,
    "rules" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayGameSession" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "opponentId" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "data" JSONB NOT NULL DEFAULT '{}',
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "playedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "PlayGameSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayGameLeaderboard" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "rank" INTEGER NOT NULL DEFAULT 0,
    "period" VARCHAR(24) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayGameLeaderboard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayGameChallenge" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "challengerId" TEXT NOT NULL,
    "opponentId" TEXT,
    "status" "PlayGameChallengeStatus" NOT NULL DEFAULT 'PENDING',
    "scoreChallenger" INTEGER,
    "scoreOpponent" INTEGER,
    "winnerId" TEXT,
    "sessionId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayGameChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPlayGameProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "gamesWon" INTEGER NOT NULL DEFAULT 0,
    "bestScore" INTEGER NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "maxStreak" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPlayGameProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlayGame_slug_key" ON "PlayGame"("slug");

-- CreateIndex
CREATE INDEX "PlayGame_category_idx" ON "PlayGame"("category");

-- CreateIndex
CREATE INDEX "PlayGame_type_idx" ON "PlayGame"("type");

-- CreateIndex
CREATE INDEX "PlayGame_isActive_idx" ON "PlayGame"("isActive");

-- CreateIndex
CREATE INDEX "PlayGameSession_gameId_userId_idx" ON "PlayGameSession"("gameId", "userId");

-- CreateIndex
CREATE INDEX "PlayGameSession_playedAt_idx" ON "PlayGameSession"("playedAt");

-- CreateIndex
CREATE INDEX "PlayGameSession_userId_isCompleted_idx" ON "PlayGameSession"("userId", "isCompleted");

-- CreateIndex
CREATE INDEX "PlayGameLeaderboard_gameId_period_score_idx" ON "PlayGameLeaderboard"("gameId", "period", "score");

-- CreateIndex
CREATE UNIQUE INDEX "PlayGameLeaderboard_gameId_userId_period_key" ON "PlayGameLeaderboard"("gameId", "userId", "period");

-- CreateIndex
CREATE INDEX "PlayGameChallenge_challengerId_idx" ON "PlayGameChallenge"("challengerId");

-- CreateIndex
CREATE INDEX "PlayGameChallenge_opponentId_idx" ON "PlayGameChallenge"("opponentId");

-- CreateIndex
CREATE INDEX "PlayGameChallenge_status_idx" ON "PlayGameChallenge"("status");

-- CreateIndex
CREATE UNIQUE INDEX "UserPlayGameProgress_userId_gameId_key" ON "UserPlayGameProgress"("userId", "gameId");

-- AddForeignKey
ALTER TABLE "PlayGameSession" ADD CONSTRAINT "PlayGameSession_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "PlayGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayGameSession" ADD CONSTRAINT "PlayGameSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayGameLeaderboard" ADD CONSTRAINT "PlayGameLeaderboard_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "PlayGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayGameLeaderboard" ADD CONSTRAINT "PlayGameLeaderboard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayGameChallenge" ADD CONSTRAINT "PlayGameChallenge_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "PlayGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayGameChallenge" ADD CONSTRAINT "PlayGameChallenge_challengerId_fkey" FOREIGN KEY ("challengerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayGameChallenge" ADD CONSTRAINT "PlayGameChallenge_opponentId_fkey" FOREIGN KEY ("opponentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPlayGameProgress" ADD CONSTRAINT "UserPlayGameProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPlayGameProgress" ADD CONSTRAINT "UserPlayGameProgress_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "PlayGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;
