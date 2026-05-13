-- Uso diario de pantalla por menor (UTC). ParentSettings.dailyScreenTimeLimit: 0 = ilimitado.

CREATE TABLE "DailyTimeUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "usedSeconds" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyTimeUsage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DailyTimeUsage_userId_date_key" ON "DailyTimeUsage"("userId", "date");

CREATE INDEX "DailyTimeUsage_userId_date_idx" ON "DailyTimeUsage"("userId", "date");

ALTER TABLE "DailyTimeUsage" ADD CONSTRAINT "DailyTimeUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
