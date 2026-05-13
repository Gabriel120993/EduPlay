-- CreateTable
CREATE TABLE "EducationalAsset" (
    "id" TEXT NOT NULL,
    "type" VARCHAR(16) NOT NULL,
    "category" VARCHAR(64) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "urlSmall" TEXT NOT NULL,
    "urlMedium" TEXT NOT NULL,
    "urlLarge" TEXT NOT NULL,
    "source" VARCHAR(32) NOT NULL,
    "sourceUrl" TEXT,
    "license" VARCHAR(32) NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "usedInQuizzes" INTEGER NOT NULL DEFAULT 0,
    "usedInContent" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EducationalAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EducationalAsset_category_name_key" ON "EducationalAsset"("category", "name");

-- CreateIndex
CREATE INDEX "EducationalAsset_category_idx" ON "EducationalAsset"("category");

-- CreateIndex
CREATE INDEX "EducationalAsset_tags_idx" ON "EducationalAsset" USING GIN ("tags");

-- AlterTable
ALTER TABLE "EducationalContent" ADD COLUMN "heroImageAssetId" TEXT;

-- CreateIndex
CREATE INDEX "EducationalContent_heroImageAssetId_idx" ON "EducationalContent"("heroImageAssetId");

-- AlterTable
ALTER TABLE "VisualQuestion" ADD COLUMN "imageAssetId" TEXT;

-- CreateIndex
CREATE INDEX "VisualQuestion_imageAssetId_idx" ON "VisualQuestion"("imageAssetId");

-- AddForeignKey
ALTER TABLE "EducationalContent" ADD CONSTRAINT "EducationalContent_heroImageAssetId_fkey" FOREIGN KEY ("heroImageAssetId") REFERENCES "EducationalAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisualQuestion" ADD CONSTRAINT "VisualQuestion_imageAssetId_fkey" FOREIGN KEY ("imageAssetId") REFERENCES "EducationalAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
