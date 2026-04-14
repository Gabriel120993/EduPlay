-- AlterTable
ALTER TABLE "User" ADD COLUMN "notificationsEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "notificationSoundsEnabled" BOOLEAN NOT NULL DEFAULT true;
