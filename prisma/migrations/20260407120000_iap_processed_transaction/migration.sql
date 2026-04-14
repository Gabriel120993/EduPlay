-- CreateTable
CREATE TABLE "IapProcessedTransaction" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IapProcessedTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IapProcessedTransaction_platform_externalId_key" ON "IapProcessedTransaction"("platform", "externalId");

-- AddForeignKey
ALTER TABLE "IapProcessedTransaction" ADD CONSTRAINT "IapProcessedTransaction_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
