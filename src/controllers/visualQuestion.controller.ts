import type { Request, Response } from "express";
import type { Difficulty, Prisma } from "@prisma/client";
import { logError } from "../lib/logger";
import { prisma } from "../lib/prisma";
import { pickImageUrl } from "../lib/imageProxyUrl";

const VISUAL_SAMPLE_SIZE = 5;

/** Garantiza que Prisma siempre devuelva `imageUrl` (y el resto de campos públicos del juego visual). */
const visualQuestionPublicSelect = {
  id: true,
  imageUrl: true,
  imageAssetId: true,
  imageAsset: {
    select: { id: true, urlSmall: true, urlMedium: true, urlLarge: true },
  },
  question: true,
  options: true,
  correct: true,
  category: true,
  difficulty: true,
  createdAt: true,
} satisfies Prisma.VisualQuestionSelect;

type VisualQuestionPublic = Prisma.VisualQuestionGetPayload<{ select: typeof visualQuestionPublicSelect }>;

function parseStringQuery(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim() !== "") return value.trim();
  if (Array.isArray(value) && value[0] != null) {
    const first = String(value[0]).trim();
    if (first !== "") return first;
  }
  return undefined;
}

function parseDifficultyQuery(value: unknown): "EASY" | "MEDIUM" | "HARD" | undefined {
  const raw = parseStringQuery(value);
  if (!raw) return undefined;
  if (raw === "EASY" || raw === "MEDIUM" || raw === "HARD") return raw;
  return undefined;
}

function parseExcludeIdsQuery(value: unknown): string[] {
  const raw = parseStringQuery(value);
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 200);
}

function shuffleInPlace<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = a[i]!;
    a[i] = a[j]!;
    a[j] = t;
  }
  return a;
}

function optionsAsStrings(options: unknown): string[] {
  if (!Array.isArray(options)) return [];
  return options.map((o) => String(o));
}

/**
 * Respuesta JSON por pregunta visual: siempre incluye `imageUrl` junto a `question` y `options`.
 * Si el asset está vinculado, se devuelve la URL del proxy/caché local del API
 * (evita 429/403 de CDNs externos cuando `<img>` se carga desde el navegador).
 */
function pickVisualImageUrl(q: VisualQuestionPublic): string {
  return pickImageUrl(q.imageAsset ?? null, q.imageUrl) ?? "";
}

function toVisualQuestionResponse(q: VisualQuestionPublic): {
  id: string;
  question: string;
  imageUrl: string;
  options: string[];
  correct: number;
  category: string;
  difficulty: Difficulty;
  createdAt: string;
} {
  const imageUrl = pickVisualImageUrl(q);
  return {
    id: q.id,
    question: q.question,
    imageUrl,
    options: optionsAsStrings(q.options),
    correct: q.correct,
    category: q.category,
    difficulty: q.difficulty,
    createdAt: q.createdAt.toISOString(),
  };
}

/**
 * GET /api/visual-quiz?category=geography&difficulty=EASY
 * GET /api/visual-quiz?category=mixed&difficulty=EASY — hasta 5 preguntas visuales mezcladas.
 */
export async function getRandomVisualQuiz(req: Request, res: Response): Promise<void> {
  const category = parseStringQuery(req.query.category);
  const difficulty = parseDifficultyQuery(req.query.difficulty);
  const excludeIds = parseExcludeIdsQuery(req.query.excludeIds);

  if (!category) {
    res.status(400).json({ error: "Query param category es obligatorio." });
    return;
  }
  if (req.query.difficulty == null || !difficulty) {
    res.status(400).json({ error: "Query param difficulty es obligatorio (EASY, MEDIUM o HARD)." });
    return;
  }

  try {
    const normalizedCat = category.trim().toLowerCase();
    const isMixed = normalizedCat === "mixed";

    const rows = await prisma.visualQuestion.findMany({
      where: isMixed
        ? {
            difficulty,
            ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
          }
        : {
            category: { equals: category, mode: "insensitive" },
            difficulty,
            ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
          },
      select: visualQuestionPublicSelect,
    });

    let pool = rows;
    if (pool.length < VISUAL_SAMPLE_SIZE) {
      pool = await prisma.visualQuestion.findMany({
        where: isMixed
          ? { difficulty }
          : {
              category: { equals: category, mode: "insensitive" },
              difficulty,
            },
        select: visualQuestionPublicSelect,
      });
    }
    const picked = shuffleInPlace(pool)
      .filter((q) => pickVisualImageUrl(q).length > 0)
      .slice(0, VISUAL_SAMPLE_SIZE);

    const questions = picked.map(toVisualQuestionResponse);

    res.json({ questions });
  } catch (err) {
    logError("visualQuestion.getRandomVisualQuiz", err);
    res.status(500).json({ error: "Error al cargar el juego visual." });
  }
}
