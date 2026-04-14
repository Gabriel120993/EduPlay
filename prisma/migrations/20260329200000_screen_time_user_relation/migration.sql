-- Historial: "usedToday" guardaba minutos; pasamos a segundos para precisión.
UPDATE "ScreenTime" SET "usedToday" = "usedToday" * 60 WHERE "usedToday" IS NOT NULL;

ALTER TABLE "ScreenTime" RENAME COLUMN "dailyLimit" TO "dailyLimitMinutes";
ALTER TABLE "ScreenTime" RENAME COLUMN "usedToday" TO "usedTodaySeconds";

ALTER TABLE "ScreenTime" ALTER COLUMN "usedTodaySeconds" SET DEFAULT 0;

ALTER TABLE "ScreenTime" ADD CONSTRAINT "ScreenTime_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
