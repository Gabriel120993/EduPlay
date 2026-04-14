-- CreateEnum
CREATE TYPE "XpGainSource" AS ENUM ('GAME_RESULT', 'MISSION', 'ACHIEVEMENT');

-- CreateTable
CREATE TABLE "XpGainLedger" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "source" "XpGainSource" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "XpGainLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "XpGainLedger_userId_createdAt_idx" ON "XpGainLedger"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "XpGainLedger_createdAt_idx" ON "XpGainLedger"("createdAt");

-- AddForeignKey
ALTER TABLE "XpGainLedger" ADD CONSTRAINT "XpGainLedger_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
