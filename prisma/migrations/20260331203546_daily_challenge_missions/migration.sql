-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MissionType" ADD VALUE 'READ_CONTENT';
ALTER TYPE "MissionType" ADD VALUE 'CORRECT_ANSWERS';

-- CreateTable
CREATE TABLE "DailyChallengeBonus" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "bonusXp" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyChallengeBonus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyChallengeBonus_userId_date_idx" ON "DailyChallengeBonus"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyChallengeBonus_userId_date_key" ON "DailyChallengeBonus"("userId", "date");

-- AddForeignKey
ALTER TABLE "DailyChallengeBonus" ADD CONSTRAINT "DailyChallengeBonus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
