import type { Difficulty } from "@prisma/client";

/** Una fila lista para `prisma.visualQuestion.createMany`. */
export type VisualSeedRow = {
  imageUrl: string;
  question: string;
  options: [string, string, string, string];
  correct: number;
  category: "astronomy" | "math" | "science" | "history" | "geography" | "creativity";
  difficulty: Difficulty;
};
