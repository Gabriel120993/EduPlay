-- AlterTable
ALTER TABLE "Parent" ADD COLUMN     "expoPushToken" TEXT;

-- CreateTable
CREATE TABLE "ParentUserBlock" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "blockedUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParentUserBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentFamilyEvent" (
    "id" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "kind" VARCHAR(32) NOT NULL,
    "childId" TEXT NOT NULL,
    "peerUserId" TEXT,
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ParentFamilyEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ParentUserBlock_parentId_idx" ON "ParentUserBlock"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "ParentUserBlock_childId_blockedUserId_key" ON "ParentUserBlock"("childId", "blockedUserId");

-- CreateIndex
CREATE INDEX "ParentFamilyEvent_parentId_createdAt_idx" ON "ParentFamilyEvent"("parentId", "createdAt");

-- AddForeignKey
ALTER TABLE "ParentUserBlock" ADD CONSTRAINT "ParentUserBlock_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentUserBlock" ADD CONSTRAINT "ParentUserBlock_childId_fkey" FOREIGN KEY ("childId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentUserBlock" ADD CONSTRAINT "ParentUserBlock_blockedUserId_fkey" FOREIGN KEY ("blockedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentFamilyEvent" ADD CONSTRAINT "ParentFamilyEvent_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
