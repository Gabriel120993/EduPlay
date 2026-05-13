-- AlterTable
ALTER TABLE "QuizQuestion" ADD COLUMN "imageAssetId" TEXT;

-- CreateIndex
CREATE INDEX "QuizQuestion_imageAssetId_idx" ON "QuizQuestion"("imageAssetId");

-- AddForeignKey
ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_imageAssetId_fkey" FOREIGN KEY ("imageAssetId") REFERENCES "EducationalAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
