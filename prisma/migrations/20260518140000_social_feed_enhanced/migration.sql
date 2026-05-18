-- AlterEnum PostType
ALTER TYPE "PostType" ADD VALUE IF NOT EXISTS 'CHALLENGE';
ALTER TYPE "PostType" ADD VALUE IF NOT EXISTS 'DAILY_STREAK';
ALTER TYPE "PostType" ADD VALUE IF NOT EXISTS 'CONTENT_COMPLETED';
ALTER TYPE "PostType" ADD VALUE IF NOT EXISTS 'LEVEL_UP';
ALTER TYPE "PostType" ADD VALUE IF NOT EXISTS 'FRIEND_MILESTONE';
ALTER TYPE "PostType" ADD VALUE IF NOT EXISTS 'GROUP_REWARD';

-- AlterEnum Visibility
ALTER TYPE "Visibility" ADD VALUE IF NOT EXISTS 'PRIVATE';

-- AlterEnum NotificationKind
ALTER TYPE "NotificationKind" ADD VALUE IF NOT EXISTS 'SOCIAL';

-- CreateEnum
CREATE TYPE "SocialGroupChallengeType" AS ENUM ('BEAT_SCORE', 'COMPLETE_IN_TIME', 'STREAK_DAYS', 'GROUP_GOAL');
CREATE TYPE "SocialGroupChallengeStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'EXPIRED', 'CANCELLED');

-- AlterTable Post
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "socialGroupChallengeId" TEXT;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "playGameSessionId" TEXT;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "isPinned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Post" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable PostComment
CREATE TABLE "PostComment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PostComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable SocialGroupChallenge
CREATE TABLE "SocialGroupChallenge" (
    "id" TEXT NOT NULL,
    "type" "SocialGroupChallengeType" NOT NULL,
    "gameId" TEXT,
    "playGameId" TEXT,
    "creatorId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "targetScore" INTEGER,
    "targetTime" INTEGER,
    "status" "SocialGroupChallengeStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "rewardCoins" INTEGER NOT NULL DEFAULT 0,
    "rewardGems" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SocialGroupChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable SocialGroupChallengeMember
CREATE TABLE "SocialGroupChallengeMember" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SocialGroupChallengeMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable SocialFriendStreak
CREATE TABLE "SocialFriendStreak" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "friendId" TEXT NOT NULL,
    "streakDays" INTEGER NOT NULL DEFAULT 0,
    "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SocialFriendStreak_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Post_socialGroupChallengeId_key" ON "Post"("socialGroupChallengeId");
CREATE UNIQUE INDEX "Post_playGameSessionId_key" ON "Post"("playGameSessionId");
CREATE INDEX "PostComment_postId_createdAt_idx" ON "PostComment"("postId", "createdAt");
CREATE INDEX "SocialGroupChallenge_status_expiresAt_idx" ON "SocialGroupChallenge"("status", "expiresAt");
CREATE INDEX "SocialGroupChallenge_creatorId_idx" ON "SocialGroupChallenge"("creatorId");
CREATE UNIQUE INDEX "SocialGroupChallengeMember_challengeId_userId_key" ON "SocialGroupChallengeMember"("challengeId", "userId");
CREATE INDEX "SocialGroupChallengeMember_userId_idx" ON "SocialGroupChallengeMember"("userId");
CREATE UNIQUE INDEX "SocialFriendStreak_userId_friendId_key" ON "SocialFriendStreak"("userId", "friendId");
CREATE INDEX "SocialFriendStreak_friendId_idx" ON "SocialFriendStreak"("friendId");

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_socialGroupChallengeId_fkey" FOREIGN KEY ("socialGroupChallengeId") REFERENCES "SocialGroupChallenge"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Post" ADD CONSTRAINT "Post_playGameSessionId_fkey" FOREIGN KEY ("playGameSessionId") REFERENCES "PlayGameSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PostComment" ADD CONSTRAINT "PostComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PostComment" ADD CONSTRAINT "PostComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SocialGroupChallenge" ADD CONSTRAINT "SocialGroupChallenge_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SocialGroupChallengeMember" ADD CONSTRAINT "SocialGroupChallengeMember_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "SocialGroupChallenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SocialGroupChallengeMember" ADD CONSTRAINT "SocialGroupChallengeMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SocialFriendStreak" ADD CONSTRAINT "SocialFriendStreak_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SocialFriendStreak" ADD CONSTRAINT "SocialFriendStreak_friendId_fkey" FOREIGN KEY ("friendId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
