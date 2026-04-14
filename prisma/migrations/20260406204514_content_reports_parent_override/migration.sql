-- CreateEnum
CREATE TYPE "ContentReportTarget" AS ENUM ('POST', 'USER', 'CHAT_MESSAGE');

-- CreateEnum
CREATE TYPE "ContentReportStatus" AS ENUM ('OPEN', 'DISMISSED', 'ESCALATED');

-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "parentModerationVisibleAt" TIMESTAMP(3),
ADD COLUMN     "parentModerationVisibleById" VARCHAR(36);

-- CreateTable
CREATE TABLE "ContentReport" (
    "id" TEXT NOT NULL,
    "targetType" "ContentReportTarget" NOT NULL,
    "reason" VARCHAR(500),
    "status" "ContentReportStatus" NOT NULL DEFAULT 'OPEN',
    "resolutionNote" VARCHAR(500),
    "reporterUserId" TEXT NOT NULL,
    "postId" TEXT,
    "reportedUserId" TEXT,
    "chatMessageId" TEXT,
    "reviewedByParentId" VARCHAR(36),
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentReport_status_createdAt_idx" ON "ContentReport"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ContentReport_reporterUserId_createdAt_idx" ON "ContentReport"("reporterUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "ContentReport" ADD CONSTRAINT "ContentReport_reporterUserId_fkey" FOREIGN KEY ("reporterUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentReport" ADD CONSTRAINT "ContentReport_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentReport" ADD CONSTRAINT "ContentReport_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentReport" ADD CONSTRAINT "ContentReport_chatMessageId_fkey" FOREIGN KEY ("chatMessageId") REFERENCES "ChatMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
