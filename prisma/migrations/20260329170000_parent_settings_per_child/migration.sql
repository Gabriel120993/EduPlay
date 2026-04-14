-- CreateEnum
CREATE TYPE "ContentFilterLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- DropTable (previous model: one row per parent, incompatible with new shape)
DROP TABLE IF EXISTS "ParentSettings";

-- CreateTable
CREATE TABLE "ParentSettings" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "dailyScreenTimeLimit" INTEGER NOT NULL DEFAULT 120,
    "allowPosting" BOOLEAN NOT NULL DEFAULT true,
    "allowFriends" BOOLEAN NOT NULL DEFAULT true,
    "contentFilterLevel" "ContentFilterLevel" NOT NULL DEFAULT 'MEDIUM',

    CONSTRAINT "ParentSettings_pkey" PRIMARY KEY ("id")
);

-- One settings row per child (one parent per child in this system)
CREATE UNIQUE INDEX "ParentSettings_childId_key" ON "ParentSettings"("childId");

CREATE INDEX "ParentSettings_parentId_idx" ON "ParentSettings"("parentId");

ALTER TABLE "ParentSettings" ADD CONSTRAINT "ParentSettings_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ParentSettings" ADD CONSTRAINT "ParentSettings_childId_fkey" FOREIGN KEY ("childId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
