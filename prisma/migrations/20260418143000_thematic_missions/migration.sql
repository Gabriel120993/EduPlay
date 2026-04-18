-- Misiones temáticas: progreso por menor y votos a misiones comunitarias.

CREATE TABLE "UserThematicMissionProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "missionSlug" VARCHAR(128) NOT NULL,
    "currentStepIndex" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "bestScore" INTEGER,
    "attemptCount" INTEGER NOT NULL DEFAULT 1,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserThematicMissionProgress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserThematicMissionProgress_userId_missionSlug_key" ON "UserThematicMissionProgress"("userId", "missionSlug");
CREATE INDEX "UserThematicMissionProgress_userId_idx" ON "UserThematicMissionProgress"("userId");

ALTER TABLE "UserThematicMissionProgress" ADD CONSTRAINT "UserThematicMissionProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ThematicMissionVote" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "missionSlug" VARCHAR(128) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThematicMissionVote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ThematicMissionVote_userId_missionSlug_key" ON "ThematicMissionVote"("userId", "missionSlug");
CREATE INDEX "ThematicMissionVote_missionSlug_idx" ON "ThematicMissionVote"("missionSlug");

ALTER TABLE "ThematicMissionVote" ADD CONSTRAINT "ThematicMissionVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
