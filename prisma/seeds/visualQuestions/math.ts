import { Difficulty } from "@prisma/client";

import type { VisualSeedRow } from "./types";

/** Figuras y números — solo PNG/JPG (sin `.svg` en la URL) para React Native `Image`. */
export const visualMath: VisualSeedRow[] = [
  {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/4/40/Triangle_file.486.png",
    question: "¿Cuántos lados tiene esta figura?",
    options: ["3", "4", "5", "6"],
    correct: 0,
    category: "math",
    difficulty: Difficulty.EASY,
  },
  {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/b/b8/Blue_square.png",
    question: "¿Cuántos lados tiene esta figura?",
    options: ["3", "4", "5", "6"],
    correct: 1,
    category: "math",
    difficulty: Difficulty.EASY,
  },
  {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/a/ae/Red_circle.png",
    question: "¿Qué figura es esta?",
    options: ["Cuadrado", "Círculo", "Triángulo", "Rectángulo"],
    correct: 1,
    category: "math",
    difficulty: Difficulty.EASY,
  },
  {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/7/74/Snooker_balls_red-6.png",
    question: "¿Cuántas bolitas rojas hay en la imagen?",
    options: ["4", "5", "6", "7"],
    correct: 2,
    category: "math",
    difficulty: Difficulty.MEDIUM,
  },
  {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/7/76/Pentagram.png",
    question: "¿Cuántas puntas tiene esta estrella?",
    options: ["4", "5", "6", "8"],
    correct: 1,
    category: "math",
    difficulty: Difficulty.MEDIUM,
  },
  {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/4/4e/Rectangle_example.png",
    question: "¿Qué figura es esta?",
    options: ["Círculo", "Triángulo", "Rectángulo", "Pentágono"],
    correct: 2,
    category: "math",
    difficulty: Difficulty.MEDIUM,
  },
  {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/5/5c/Dice-6.png",
    question: "¿Qué número muestra el dado?",
    options: ["4", "5", "6", "3"],
    correct: 2,
    category: "math",
    difficulty: Difficulty.HARD,
  },
  {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/9/90/Pie_chart.png",
    question: "¿En cuántas partes iguales está dividido el círculo?",
    options: ["2", "3", "4", "5"],
    correct: 1,
    category: "math",
    difficulty: Difficulty.HARD,
  },
];
