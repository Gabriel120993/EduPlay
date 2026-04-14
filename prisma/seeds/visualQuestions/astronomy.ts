import { Difficulty } from "@prisma/client";

import type { VisualSeedRow } from "./types";

/**
 * Astronomía — URLs directas al archivo en Wikimedia Commons (misma imagen que en la miniatura /thumb/):
 * - Saturn: https://upload.wikimedia.org/wikipedia/commons/c/c7/Saturn_during_Equinox.jpg
 * - Earth: https://upload.wikimedia.org/wikipedia/commons/9/97/The_Earth_seen_from_Apollo_17.jpg
 * - Mars: https://upload.wikimedia.org/wikipedia/commons/0/02/OSIRIS_Mars_true_color.jpg
 * - Jupiter: https://upload.wikimedia.org/wikipedia/commons/e/e2/Jupiter.jpg
 * - Venus: https://upload.wikimedia.org/wikipedia/commons/e/e3/Venus-real_color.jpg
 * - Mercury: https://upload.wikimedia.org/wikipedia/commons/0/02/Mercury_in_color_-_Prockter07_centered.jpg
 * - Neptune: https://upload.wikimedia.org/wikipedia/commons/6/63/Neptune_-_Voyager_2_%2829347980845%29_flatten_crop.jpg
 * - Uranus: https://upload.wikimedia.org/wikipedia/commons/3/3d/Uranus2.jpg
 */
export const visualAstronomy: VisualSeedRow[] = [
  {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/c/c7/Saturn_during_Equinox.jpg",
    question: "¿Qué planeta es este?",
    options: ["Urano", "Júpiter", "Saturno", "Neptuno"],
    correct: 2,
    category: "astronomy",
    difficulty: Difficulty.EASY,
  },
  {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/9/97/The_Earth_seen_from_Apollo_17.jpg",
    question: "¿Qué planeta es este?",
    options: ["Venus", "Marte", "Tierra", "Mercurio"],
    correct: 2,
    category: "astronomy",
    difficulty: Difficulty.EASY,
  },
  {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/0/02/OSIRIS_Mars_true_color.jpg",
    question: "¿Qué planeta es este?",
    options: ["Marte", "Venus", "Mercurio", "Júpiter"],
    correct: 0,
    category: "astronomy",
    difficulty: Difficulty.EASY,
  },
  {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/e/e2/Jupiter.jpg",
    question: "¿Qué planeta es este?",
    options: ["Saturno", "Júpiter", "Neptuno", "Urano"],
    correct: 1,
    category: "astronomy",
    difficulty: Difficulty.EASY,
  },
  {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/e/e3/Venus-real_color.jpg",
    question: "¿Qué planeta es este?",
    options: ["Mercurio", "Venus", "Marte", "Tierra"],
    correct: 1,
    category: "astronomy",
    difficulty: Difficulty.MEDIUM,
  },
  {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/0/02/Mercury_in_color_-_Prockter07_centered.jpg",
    question: "¿Qué planeta es este?",
    options: ["Mercurio", "Venus", "Marte", "Luna"],
    correct: 0,
    category: "astronomy",
    difficulty: Difficulty.MEDIUM,
  },
  {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/6/63/Neptune_-_Voyager_2_%2829347980845%29_flatten_crop.jpg",
    question: "¿Qué planeta es este?",
    options: ["Urano", "Neptuno", "Saturno", "Júpiter"],
    correct: 1,
    category: "astronomy",
    difficulty: Difficulty.MEDIUM,
  },
  {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/3/3d/Uranus2.jpg",
    question: "¿Qué planeta es este?",
    options: ["Neptuno", "Urano", "Saturno", "Júpiter"],
    correct: 1,
    category: "astronomy",
    difficulty: Difficulty.HARD,
  },
];
