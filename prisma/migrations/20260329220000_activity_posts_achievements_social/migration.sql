-- Alinea el estado tras migraciones anteriores con schema.prisma (logros, amistades, posts de actividad).
-- Idempotente: seguro si la BD ya tenía estos cambios aplicados a mano o con db push.

-- Enum de rareza de logros
DO $$ BEGIN
  CREATE TYPE "AchievementRarity" AS ENUM ('COMMON', 'RARE', 'EPIC', 'LEGENDARY');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Valor extra en estado de amistad (orden en PG: se añade al final; Prisma usa etiquetas por nombre)
DO $$ BEGIN
  ALTER TYPE "FriendStatus" ADD VALUE 'AWAITING_PARENT';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Campos de insignia / rareza en Achievement
ALTER TABLE "Achievement" ADD COLUMN IF NOT EXISTS "badgeColor" TEXT NOT NULL DEFAULT '#6366f1';
ALTER TABLE "Achievement" ADD COLUMN IF NOT EXISTS "badgeIcon" TEXT NOT NULL DEFAULT 'badge';
ALTER TABLE "Achievement" ADD COLUMN IF NOT EXISTS "rarity" "AchievementRarity" NOT NULL DEFAULT 'COMMON';

-- Aprobación parental en Friend + unicidad par (userId, friendId)
ALTER TABLE "Friend" ADD COLUMN IF NOT EXISTS "requiresParentApproval" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Friend" ADD COLUMN IF NOT EXISTS "parentApproved" BOOLEAN NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS "Friend_userId_friendId_key" ON "Friend"("userId", "friendId");

-- Post vinculado a GameResult / UserAchievement (un post de actividad por evento)
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "gameResultId" TEXT;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "userAchievementId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Post_gameResultId_key" ON "Post"("gameResultId");
CREATE UNIQUE INDEX IF NOT EXISTS "Post_userAchievementId_key" ON "Post"("userAchievementId");

DO $$ BEGIN
  ALTER TABLE "Post" ADD CONSTRAINT "Post_gameResultId_fkey" FOREIGN KEY ("gameResultId") REFERENCES "GameResult"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "Post" ADD CONSTRAINT "Post_userAchievementId_fkey" FOREIGN KEY ("userAchievementId") REFERENCES "UserAchievement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Una reacción por usuario y post
CREATE UNIQUE INDEX IF NOT EXISTS "Reaction_userId_postId_key" ON "Reaction"("userId", "postId");

-- Un desbloqueo por usuario y logro
CREATE UNIQUE INDEX IF NOT EXISTS "UserAchievement_userId_achievementId_key" ON "UserAchievement"("userId", "achievementId");
