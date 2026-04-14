-- CreateTable
CREATE TABLE "VisualQuestion" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correct" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisualQuestion_pkey" PRIMARY KEY ("id")
);
