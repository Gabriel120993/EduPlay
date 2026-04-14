-- CreateTable
CREATE TABLE "UserMediaUpload" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "resourceType" VARCHAR(16) NOT NULL,
    "publicId" VARCHAR(512) NOT NULL,
    "moderationFlagged" BOOLEAN NOT NULL DEFAULT false,
    "moderationNote" VARCHAR(500),
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserMediaUpload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserMediaUpload_publicId_key" ON "UserMediaUpload"("publicId");

-- CreateIndex
CREATE INDEX "UserMediaUpload_userId_createdAt_idx" ON "UserMediaUpload"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "UserMediaUpload" ADD CONSTRAINT "UserMediaUpload_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "videoUrl" TEXT,
ADD COLUMN     "mediaModerationFlagged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mediaModerationNote" VARCHAR(500),
ADD COLUMN     "mediaUploadId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Post_mediaUploadId_key" ON "Post"("mediaUploadId");

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_mediaUploadId_fkey" FOREIGN KEY ("mediaUploadId") REFERENCES "UserMediaUpload"("id") ON DELETE SET NULL ON UPDATE CASCADE;
