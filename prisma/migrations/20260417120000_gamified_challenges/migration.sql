-- Gamified challenges + XP source extension
CREATE TYPE "ChallengeBucket" AS ENUM ('DAILY', 'WEEKLY', 'SPECIAL');

DO $$ BEGIN
  ALTER TYPE "XpGainSource" ADD VALUE 'CHALLENGE';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE "UserGamifiedChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bucket" "ChallengeBucket" NOT NULL,
    "periodKey" VARCHAR(64) NOT NULL,
    "challengeSlug" VARCHAR(64) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "target" INTEGER NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "rewardsGranted" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserGamifiedChallenge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserGamifiedChallenge_userId_bucket_periodKey_challengeSlug_key" ON "UserGamifiedChallenge"("userId", "bucket", "periodKey", "challengeSlug");

CREATE INDEX "UserGamifiedChallenge_userId_bucket_periodKey_idx" ON "UserGamifiedChallenge"("userId", "bucket", "periodKey");

ALTER TABLE "UserGamifiedChallenge" ADD CONSTRAINT "UserGamifiedChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
