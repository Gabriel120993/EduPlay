import { Difficulty } from "@prisma/client";

import type { VisualSeedRow } from "./types";

/** Monumentos y lugares icónicos. */
export const visualHistory: VisualSeedRow[] = [
  {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/a/af/All_Gizah_Pyramids.jpg",
    question: "¿Qué monumento es este?",
    options: ["Coliseo", "Pirámides de Egipto", "Torre Eiffel", "Big Ben"],
    correct: 1,
    category: "history",
    difficulty: Difficulty.EASY,
  },
  {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/d/de/Colosseo_2020.jpg",
    question: "¿Qué monumento es este?",
    options: ["Partenón", "Coliseo de Roma", "Stonehenge", "Alhambra"],
    correct: 1,
    category: "history",
    difficulty: Difficulty.EASY,
  },
  {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/2/23/The_Great_Wall_of_China_at_Jinshanling-edit.jpg",
    question: "¿Qué monumento es este?",
    options: ["Muralla china", "Acueducto de Segovia", "Puente de Londres", "Torre de Pisa"],
    correct: 0,
    category: "history",
    difficulty: Difficulty.EASY,
  },
  {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/a/a1/Statue_of_Liberty_7.jpg",
    question: "¿Qué monumento es este?",
    options: ["Estatua de la Libertad", "Cristo Redentor", "Esfinge", "Arco del Triunfo"],
    correct: 0,
    category: "history",
    difficulty: Difficulty.MEDIUM,
  },
  {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/2/2c/Easter_Island_statues.jpg",
    question: "¿Dónde están estos moáis?",
    options: ["Japón", "Isla de Pascua", "Grecia", "Egipto"],
    correct: 1,
    category: "history",
    difficulty: Difficulty.MEDIUM,
  },
  {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/3/3d/Stonehenge2007_07_30.jpg",
    question: "¿Qué lugar prehistórico es este?",
    options: ["Acrópolis", "Stonehenge", "Petra", "Tikal"],
    correct: 1,
    category: "history",
    difficulty: Difficulty.MEDIUM,
  },
  {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/4/4f/Machu_Picchu%2C_Peru.jpg",
    question: "¿Qué ciudadela inca es esta?",
    options: ["Tikal", "Machu Picchu", "Teotihuacán", "Cuzco moderno"],
    correct: 1,
    category: "history",
    difficulty: Difficulty.HARD,
  },
  {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/6/6e/Taj_Mahal%2C_Agra%2C_India.jpg",
    question: "¿Qué monumento es este?",
    options: ["Taj Mahal", "Mezquita azul", "Torre de Pisa", "Sagrada Familia"],
    correct: 0,
    category: "history",
    difficulty: Difficulty.HARD,
  },
];
