import { Difficulty } from "@prisma/client";

import type { VisualSeedRow } from "./types";

/** Arte y color — PNG/JPG (sin `.svg` en la URL) para React Native `Image`. */
export const visualCreativity: VisualSeedRow[] = [
  {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/b/b5/Simple_RGB_Color_Wheel_without_Title.png",
    question: "¿Qué muestra la imagen?",
    options: ["Mapa", "Rueda de colores", "Reloj", "Termómetro"],
    correct: 1,
    category: "creativity",
    difficulty: Difficulty.EASY,
  },
  {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/3/37/Color_icon_red.png",
    question: "¿De qué color es el cuadrado?",
    options: ["Azul", "Verde", "Rojo", "Amarillo"],
    correct: 2,
    category: "creativity",
    difficulty: Difficulty.EASY,
  },
  {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/3/34/Color_icon_blue.png",
    question: "¿De qué color es el cuadrado?",
    options: ["Rojo", "Azul", "Naranja", "Rosa"],
    correct: 1,
    category: "creativity",
    difficulty: Difficulty.EASY,
  },
  {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/e/e3/Color_icon_yellow.png",
    question: "¿De qué color es el cuadrado?",
    options: ["Verde", "Violeta", "Amarillo", "Marrón"],
    correct: 2,
    category: "creativity",
    difficulty: Difficulty.EASY,
  },
  {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/3/3d/Paint_brushes_01.jpg",
    question: "¿Qué herramientas de arte ves?",
    options: ["Cuchillos", "Pinceles", "Tenedores", "Llaves"],
    correct: 1,
    category: "creativity",
    difficulty: Difficulty.MEDIUM,
  },
  {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/8/8d/Origami_crane.jpg",
    question: "¿Qué técnica muestra la imagen?",
    options: ["Collage", "Origami (papel doblado)", "Escultura en piedra", "Fotografía"],
    correct: 1,
    category: "creativity",
    difficulty: Difficulty.MEDIUM,
  },
  {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/d/d7/Rainbow_colors_%28Modern_colours%29.png",
    question: "¿Qué fenómeno de luz muestra la imagen?",
    options: ["Relámpago", "Arcoíris", "Aurora", "Eclipse"],
    correct: 1,
    category: "creativity",
    difficulty: Difficulty.MEDIUM,
  },
  {
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/4/4d/Color_mixing_paints.jpg",
    question: "¿Qué se está haciendo en la imagen?",
    options: ["Cocinar", "Mezclar pinturas", "Podar plantas", "Limpiar vidrio"],
    correct: 1,
    category: "creativity",
    difficulty: Difficulty.HARD,
  },
];
