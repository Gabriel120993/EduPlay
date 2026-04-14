import { Difficulty } from "@prisma/client";

import type { VisualSeedRow } from "./types";

/**
 * Geografía — PNG/JPG en Wikimedia Commons (URL directa al archivo; sin `/thumb/`).
 * Se evitan rutas con `.svg` para compatibilidad con React Native `Image`.
 */
export const visualGeography: VisualSeedRow[] = [
  {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/2/24/Argentina_%28orthographic_projection%29.png",
    question: "¿Qué país muestra este mapa?",
    options: ["Argentina", "Chile", "Uruguay", "Paraguay"],
    correct: 0,
    category: "geography",
    difficulty: Difficulty.EASY,
  },
  {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/6/6f/Orthographic_Projection_of_Brazil.png",
    question: "¿Qué país muestra este mapa?",
    options: ["Colombia", "Brasil", "Venezuela", "Perú"],
    correct: 1,
    category: "geography",
    difficulty: Difficulty.EASY,
  },
  {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/7/72/Flag_of_Spain_%28alt%29.png",
    question: "¿De qué país es esta bandera?",
    options: ["Italia", "Portugal", "España", "Francia"],
    correct: 2,
    category: "geography",
    difficulty: Difficulty.EASY,
  },
  {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/6/62/Flag_of_France.png",
    question: "¿De qué país es esta bandera?",
    options: ["Países Bajos", "Francia", "Rusia", "Croacia"],
    correct: 1,
    category: "geography",
    difficulty: Difficulty.EASY,
  },
  {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/4/45/Africa_%28orthographic_projection%292.png",
    question: "¿Qué continente muestra este mapa?",
    options: ["Asia", "África", "Oceanía", "Europa"],
    correct: 1,
    category: "geography",
    difficulty: Difficulty.MEDIUM,
  },
  {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/9/96/BK_South_America_%28orthographic_projection%29.png",
    question: "¿Qué continente muestra este mapa?",
    options: ["América del Norte", "América del Sur", "África", "Australia"],
    correct: 1,
    category: "geography",
    difficulty: Difficulty.MEDIUM,
  },
  {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/2/26/Europe_orthographic_Caucasus_Urals_boundary_%28with_borders%29.png",
    question: "¿Qué continente muestra este mapa?",
    options: ["Asia", "Europa", "África", "América"],
    correct: 1,
    category: "geography",
    difficulty: Difficulty.MEDIUM,
  },
  {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/4/4a/Flag_of_Japan_%28geometric%29.png",
    question: "¿De qué país es esta bandera?",
    options: ["Corea del Sur", "Japón", "China", "Tailandia"],
    correct: 1,
    category: "geography",
    difficulty: Difficulty.HARD,
  },
];
