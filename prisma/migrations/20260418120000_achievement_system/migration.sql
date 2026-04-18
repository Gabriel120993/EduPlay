-- Sistema extendido de logros + visibilidad en perfil
CREATE TYPE "AchievementSystemKind" AS ENUM ('PROGRESS', 'SKILL', 'SOCIAL', 'SPECIAL', 'COLLECTIBLE');

ALTER TABLE "Achievement" ADD COLUMN "systemKind" "AchievementSystemKind" NOT NULL DEFAULT 'PROGRESS';
ALTER TABLE "Achievement" ADD COLUMN "hidden" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Achievement" ADD COLUMN "collectionKey" VARCHAR(64);
ALTER TABLE "Achievement" ADD COLUMN "slug" VARCHAR(96);
ALTER TABLE "Achievement" ADD COLUMN "sortOrder" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX "Achievement_slug_key" ON "Achievement"("slug");

ALTER TABLE "User" ADD COLUMN "achievementsPublicOnProfile" BOOLEAN NOT NULL DEFAULT true;
