-- CreateEnum
CREATE TYPE "EducationalContentType" AS ENUM ('VIDEO', 'READING', 'EXPERIMENT', 'INTERACTIVE', 'WORKSHEET', 'AUDIO');

-- CreateEnum
CREATE TYPE "StreakKind" AS ENUM ('APP_ACTIVITY', 'QUIZ_DAILY', 'MISSION', 'MINI_GAME');

-- CreateEnum
CREATE TYPE "StudyGroupRole" AS ENUM ('OWNER', 'MODERATOR', 'MEMBER');

-- CreateEnum
CREATE TYPE "LiveEventStatus" AS ENUM ('SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationKind" AS ENUM ('FRIEND_REQUEST', 'FRIEND_ACCEPTED', 'PARENT_ALERT', 'CHAT', 'GROUP', 'LIVE_EVENT', 'ACHIEVEMENT', 'MISSION', 'SYSTEM');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "XpGainSource" ADD VALUE 'QUIZ';
ALTER TYPE "XpGainSource" ADD VALUE 'MINI_GAME';
ALTER TYPE "XpGainSource" ADD VALUE 'LIVE_EVENT';
ALTER TYPE "XpGainSource" ADD VALUE 'CONTENT';

-- AlterTable
ALTER TABLE "ContentReport" ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "EducationalContent" ADD COLUMN     "contentType" "EducationalContentType" NOT NULL DEFAULT 'READING',
ADD COLUMN     "meta" JSONB,
ADD COLUMN     "published" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "topicId" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "QuizQuestion" ADD COLUMN     "quizId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "activityStreakDays" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastActivityStreakUtc" DATE;

-- AlterTable
ALTER TABLE "UserGamifiedChallenge" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "UserThematicMissionProgress" ADD COLUMN     "thematicMissionId" TEXT;

-- AlterTable
ALTER TABLE "XpGainLedger" ADD COLUMN     "metadata" JSONB;

-- CreateTable
CREATE TABLE "UserGamificationSnapshot" (
    "userId" TEXT NOT NULL,
    "totalXpEarned" INTEGER NOT NULL DEFAULT 0,
    "totalCoinsSpent" INTEGER NOT NULL DEFAULT 0,
    "lastLevelUpAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserGamificationSnapshot_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "UserStreak" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "StreakKind" NOT NULL,
    "currentCount" INTEGER NOT NULL DEFAULT 0,
    "bestCount" INTEGER NOT NULL DEFAULT 0,
    "lastEventDate" DATE,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserStreak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThematicMission" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(128) NOT NULL,
    "title" TEXT NOT NULL,
    "theme" TEXT NOT NULL,
    "narrative" TEXT NOT NULL,
    "reward" TEXT NOT NULL,
    "stepCount" INTEGER NOT NULL,
    "seasonMonth" VARCHAR(7),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThematicMission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EducationalCategory" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(64) NOT NULL,
    "name" TEXT NOT NULL,
    "icon" VARCHAR(64),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EducationalCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EducationalSubject" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EducationalSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EducationalTopic" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "slug" VARCHAR(96) NOT NULL,
    "name" TEXT NOT NULL,
    "summary" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EducationalTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quiz" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "topicId" TEXT,
    "legacyCategory" "ContentCategory",
    "difficulty" "Difficulty" NOT NULL DEFAULT 'MEDIUM',
    "questionCount" INTEGER NOT NULL DEFAULT 0,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quiz_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuizAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "maxScore" INTEGER NOT NULL,
    "correctCount" INTEGER NOT NULL,
    "durationMs" INTEGER,
    "finishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MiniGame" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(64) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "category" "ContentCategory" NOT NULL,
    "difficulty" "Difficulty" NOT NULL DEFAULT 'MEDIUM',
    "config" JSONB NOT NULL DEFAULT '{}',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MiniGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MiniGameSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "miniGameId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "durationMs" INTEGER,
    "levelIndex" INTEGER,
    "metadata" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "MiniGameSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "ownerUserId" TEXT NOT NULL,
    "inviteCode" VARCHAR(16),
    "maxMembers" INTEGER NOT NULL DEFAULT 12,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudyGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyGroupMember" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "StudyGroupRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudyGroupMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudyGroupMessage" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "moderated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudyGroupMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "streamUrl" TEXT,
    "status" "LiveEventStatus" NOT NULL DEFAULT 'SCHEDULED',
    "hostLabel" TEXT,
    "coverUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveEventAttendee" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "watchMs" INTEGER,

    CONSTRAINT "LiveEventAttendee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationKind" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserStreak_userId_kind_idx" ON "UserStreak"("userId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "UserStreak_userId_kind_key" ON "UserStreak"("userId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "ThematicMission_slug_key" ON "ThematicMission"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "EducationalCategory_slug_key" ON "EducationalCategory"("slug");

-- CreateIndex
CREATE INDEX "EducationalCategory_sortOrder_idx" ON "EducationalCategory"("sortOrder");

-- CreateIndex
CREATE INDEX "EducationalSubject_categoryId_sortOrder_idx" ON "EducationalSubject"("categoryId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "EducationalSubject_categoryId_slug_key" ON "EducationalSubject"("categoryId", "slug");

-- CreateIndex
CREATE INDEX "EducationalTopic_subjectId_sortOrder_idx" ON "EducationalTopic"("subjectId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "EducationalTopic_subjectId_slug_key" ON "EducationalTopic"("subjectId", "slug");

-- CreateIndex
CREATE INDEX "Quiz_topicId_idx" ON "Quiz"("topicId");

-- CreateIndex
CREATE INDEX "Quiz_published_idx" ON "Quiz"("published");

-- CreateIndex
CREATE INDEX "QuizAttempt_userId_finishedAt_idx" ON "QuizAttempt"("userId", "finishedAt");

-- CreateIndex
CREATE INDEX "QuizAttempt_quizId_idx" ON "QuizAttempt"("quizId");

-- CreateIndex
CREATE UNIQUE INDEX "MiniGame_slug_key" ON "MiniGame"("slug");

-- CreateIndex
CREATE INDEX "MiniGame_isActive_sortOrder_idx" ON "MiniGame"("isActive", "sortOrder");

-- CreateIndex
CREATE INDEX "MiniGameSession_userId_endedAt_idx" ON "MiniGameSession"("userId", "endedAt");

-- CreateIndex
CREATE INDEX "MiniGameSession_miniGameId_idx" ON "MiniGameSession"("miniGameId");

-- CreateIndex
CREATE UNIQUE INDEX "StudyGroup_inviteCode_key" ON "StudyGroup"("inviteCode");

-- CreateIndex
CREATE INDEX "StudyGroup_ownerUserId_idx" ON "StudyGroup"("ownerUserId");

-- CreateIndex
CREATE INDEX "StudyGroupMember_userId_idx" ON "StudyGroupMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StudyGroupMember_groupId_userId_key" ON "StudyGroupMember"("groupId", "userId");

-- CreateIndex
CREATE INDEX "StudyGroupMessage_groupId_createdAt_idx" ON "StudyGroupMessage"("groupId", "createdAt");

-- CreateIndex
CREATE INDEX "StudyGroupMessage_senderId_idx" ON "StudyGroupMessage"("senderId");

-- CreateIndex
CREATE INDEX "LiveEvent_startsAt_endsAt_idx" ON "LiveEvent"("startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "LiveEvent_status_idx" ON "LiveEvent"("status");

-- CreateIndex
CREATE INDEX "LiveEventAttendee_userId_idx" ON "LiveEventAttendee"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LiveEventAttendee_eventId_userId_key" ON "LiveEventAttendee"("eventId", "userId");

-- CreateIndex
CREATE INDEX "AppNotification_userId_readAt_idx" ON "AppNotification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "AppNotification_userId_createdAt_idx" ON "AppNotification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ContentReport_priority_status_idx" ON "ContentReport"("priority", "status");

-- CreateIndex
CREATE INDEX "EducationalContent_topicId_idx" ON "EducationalContent"("topicId");

-- CreateIndex
CREATE INDEX "EducationalContent_contentType_published_idx" ON "EducationalContent"("contentType", "published");

-- CreateIndex
CREATE INDEX "Friend_friendId_idx" ON "Friend"("friendId");

-- CreateIndex
CREATE INDEX "GameResult_userId_createdAt_idx" ON "GameResult"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "GameResult_gameId_idx" ON "GameResult"("gameId");

-- CreateIndex
CREATE INDEX "Post_userId_createdAt_idx" ON "Post"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Post_type_idx" ON "Post"("type");

-- CreateIndex
CREATE INDEX "QuizQuestion_quizId_idx" ON "QuizQuestion"("quizId");

-- CreateIndex
CREATE INDEX "QuizQuestion_category_idx" ON "QuizQuestion"("category");

-- CreateIndex
CREATE INDEX "Reaction_postId_idx" ON "Reaction"("postId");

-- CreateIndex
CREATE INDEX "User_parentId_idx" ON "User"("parentId");

-- CreateIndex
CREATE INDEX "User_type_status_idx" ON "User"("type", "status");

-- CreateIndex
CREATE INDEX "UserAchievement_achievementId_idx" ON "UserAchievement"("achievementId");

-- CreateIndex
CREATE INDEX "UserThematicMissionProgress_thematicMissionId_idx" ON "UserThematicMissionProgress"("thematicMissionId");

-- CreateIndex
CREATE INDEX "VisualQuestion_category_idx" ON "VisualQuestion"("category");

-- AddForeignKey
ALTER TABLE "UserGamificationSnapshot" ADD CONSTRAINT "UserGamificationSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserStreak" ADD CONSTRAINT "UserStreak_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserThematicMissionProgress" ADD CONSTRAINT "UserThematicMissionProgress_thematicMissionId_fkey" FOREIGN KEY ("thematicMissionId") REFERENCES "ThematicMission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationalSubject" ADD CONSTRAINT "EducationalSubject_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "EducationalCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationalTopic" ADD CONSTRAINT "EducationalTopic_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "EducationalSubject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationalContent" ADD CONSTRAINT "EducationalContent_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "EducationalTopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "EducationalTopic"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MiniGameSession" ADD CONSTRAINT "MiniGameSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MiniGameSession" ADD CONSTRAINT "MiniGameSession_miniGameId_fkey" FOREIGN KEY ("miniGameId") REFERENCES "MiniGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyGroupMember" ADD CONSTRAINT "StudyGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "StudyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyGroupMember" ADD CONSTRAINT "StudyGroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyGroupMessage" ADD CONSTRAINT "StudyGroupMessage_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "StudyGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyGroupMessage" ADD CONSTRAINT "StudyGroupMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveEventAttendee" ADD CONSTRAINT "LiveEventAttendee_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "LiveEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveEventAttendee" ADD CONSTRAINT "LiveEventAttendee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppNotification" ADD CONSTRAINT "AppNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
