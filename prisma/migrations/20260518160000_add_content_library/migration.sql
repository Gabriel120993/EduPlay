-- CreateEnum
CREATE TYPE "LibraryMediaType" AS ENUM ('VIDEO', 'AUDIOBOOK', 'COMIC', 'INTERACTIVE', 'ARTICLE');
CREATE TYPE "LibraryCategory" AS ENUM ('SCIENCE', 'HISTORY', 'GEOGRAPHY', 'MATH', 'LANGUAGE', 'ART', 'MUSIC', 'NATURE', 'TECHNOLOGY', 'EMOTIONAL_INTELLIGENCE', 'FINANCIAL_EDUCATION', 'HEALTH', 'SPORTS');

-- CreateTable
CREATE TABLE "ContentChannel" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(64) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "iconUrl" TEXT,
    "color" VARCHAR(16) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "subscriberCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentLibrary" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(96) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" "LibraryMediaType" NOT NULL,
    "category" "LibraryCategory" NOT NULL,
    "ageRangeMin" INTEGER NOT NULL,
    "ageRangeMax" INTEGER NOT NULL,
    "durationSec" INTEGER,
    "thumbnailUrl" TEXT NOT NULL,
    "mediaUrl" TEXT NOT NULL,
    "transcript" TEXT,
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "author" TEXT,
    "channelId" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentLibrary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserLibraryProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "progressSec" INTEGER NOT NULL DEFAULT 0,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "lastWatchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserLibraryProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserLibraryBookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserLibraryBookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LibraryContentRating" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LibraryContentRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserChannelSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserChannelSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ContentChannel_slug_key" ON "ContentChannel"("slug");
CREATE INDEX "ContentChannel_isActive_idx" ON "ContentChannel"("isActive");
CREATE UNIQUE INDEX "ContentLibrary_slug_key" ON "ContentLibrary"("slug");
CREATE INDEX "ContentLibrary_type_idx" ON "ContentLibrary"("type");
CREATE INDEX "ContentLibrary_category_idx" ON "ContentLibrary"("category");
CREATE INDEX "ContentLibrary_ageRangeMin_ageRangeMax_idx" ON "ContentLibrary"("ageRangeMin", "ageRangeMax");
CREATE INDEX "ContentLibrary_isPremium_idx" ON "ContentLibrary"("isPremium");
CREATE INDEX "ContentLibrary_channelId_idx" ON "ContentLibrary"("channelId");
CREATE INDEX "ContentLibrary_isActive_idx" ON "ContentLibrary"("isActive");
CREATE UNIQUE INDEX "UserLibraryProgress_userId_contentId_key" ON "UserLibraryProgress"("userId", "contentId");
CREATE INDEX "UserLibraryProgress_userId_lastWatchedAt_idx" ON "UserLibraryProgress"("userId", "lastWatchedAt");
CREATE UNIQUE INDEX "UserLibraryBookmark_userId_contentId_key" ON "UserLibraryBookmark"("userId", "contentId");
CREATE UNIQUE INDEX "LibraryContentRating_userId_contentId_key" ON "LibraryContentRating"("userId", "contentId");
CREATE INDEX "LibraryContentRating_contentId_idx" ON "LibraryContentRating"("contentId");
CREATE UNIQUE INDEX "UserChannelSubscription_userId_channelId_key" ON "UserChannelSubscription"("userId", "channelId");

-- AddForeignKey
ALTER TABLE "ContentLibrary" ADD CONSTRAINT "ContentLibrary_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "ContentChannel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserLibraryProgress" ADD CONSTRAINT "UserLibraryProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserLibraryProgress" ADD CONSTRAINT "UserLibraryProgress_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "ContentLibrary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserLibraryBookmark" ADD CONSTRAINT "UserLibraryBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserLibraryBookmark" ADD CONSTRAINT "UserLibraryBookmark_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "ContentLibrary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibraryContentRating" ADD CONSTRAINT "LibraryContentRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LibraryContentRating" ADD CONSTRAINT "LibraryContentRating_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "ContentLibrary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserChannelSubscription" ADD CONSTRAINT "UserChannelSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserChannelSubscription" ADD CONSTRAINT "UserChannelSubscription_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "ContentChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
