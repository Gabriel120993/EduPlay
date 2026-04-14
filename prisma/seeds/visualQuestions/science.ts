import { Difficulty } from "@prisma/client";

import type { VisualSeedRow } from "./types";

/**
 * Ciencia — URLs directas en Wikimedia Commons, ejemplo:
 * - Ice: https://upload.wikimedia.org/wikipedia/commons/d/d3/Water_Ice_in_Tray.jpg
 */
export const visualScience: VisualSeedRow[] = [
  {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/d/d3/Water_Ice_in_Tray.jpg",
    question: "¿Qué estado de la materia muestra la imagen?",
    options: ["Líquido", "Sólido", "Gaseoso", "Plasma"],
    correct: 1,
    category: "science",
    difficulty: Difficulty.EASY,
  },
  {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/5/5e/Water_drop_001.jpg",
    question: "¿Qué estado de la materia muestra la imagen?",
    options: ["Gaseoso", "Sólido", "Líquido", "Plasma"],
    correct: 2,
    category: "science",
    difficulty: Difficulty.EASY,
  },
  {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/2/2c/Steam_in_Budapest.jpg",
    question: "¿Qué estado de la materia muestra el vapor?",
    options: ["Sólido", "Líquido", "Gaseoso", "Plasma"],
    correct: 2,
    category: "science",
    difficulty: Difficulty.EASY,
  },
  {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/4/4e/Salt_crystals.jpg",
    question: "¿Qué estado de la materia son estos cristales?",
    options: ["Líquido", "Gaseoso", "Sólido", "Plasma"],
    correct: 2,
    category: "science",
    difficulty: Difficulty.MEDIUM,
  },
  {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/2/2e/Ocean_surface_wave.jpg",
    question: "¿Qué estado de la materia es el agua del mar en la imagen?",
    options: ["Sólido", "Líquido", "Gaseoso", "Plasma"],
    correct: 1,
    category: "science",
    difficulty: Difficulty.MEDIUM,
  },
  {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/3/3b/SnowflakesWilsonBentley.jpg",
    question: "¿Qué estado de la materia es la nieve?",
    options: ["Líquido", "Gaseoso", "Sólido", "Plasma"],
    correct: 2,
    category: "science",
    difficulty: Difficulty.MEDIUM,
  },
  {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/1/1e/Sunflower_sky_backlit_2.jpg",
    question: "¿Qué necesitan las plantas para crecer? (elige lo que ves en la imagen)",
    options: ["Solo oscuridad", "Luz del sol", "Solo hielo", "Solo metal"],
    correct: 1,
    category: "science",
    difficulty: Difficulty.HARD,
  },
  {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/7/7e/Magnet_003.jpg",
    question: "¿Qué objeto atrae objetos de hierro?",
    options: ["Termómetro", "Imán", "Regla", "Vaso"],
    correct: 1,
    category: "science",
    difficulty: Difficulty.HARD,
  },
];
