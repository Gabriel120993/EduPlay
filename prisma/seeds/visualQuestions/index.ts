import type { VisualSeedRow } from "./types";
import { visualAstronomy } from "./astronomy";
import { visualCreativity } from "./creativity";
import { visualGeography } from "./geography";
import { visualHistory } from "./history";
import { visualMath } from "./math";
import { visualScience } from "./science";

function ensureNoDuplicateVisual(rows: VisualSeedRow[]): void {
  const seen = new Set<string>();
  for (const row of rows) {
    const key = `${row.category}::${row.question.trim().toLowerCase()}::${row.imageUrl}`;
    if (seen.has(key)) {
      throw new Error(`VisualQuestion duplicada en seed: ${row.category} -> ${row.question}`);
    }
    seen.add(key);
  }
}

function ensureValidPublicImageUrls(rows: VisualSeedRow[]): void {
  for (const row of rows) {
    const url = row.imageUrl.trim();
    if (!url) {
      throw new Error(`VisualQuestion sin imageUrl: ${row.category} -> ${row.question}`);
    }
    if (!url.startsWith("https://")) {
      throw new Error(`VisualQuestion con imageUrl no pública/HTTPS: ${row.category} -> ${row.question}`);
    }
  }
}

/** Todas las preguntas visuales por categoría (mismas categorías que el quiz de texto). */
export function buildVisualSeedRows(): VisualSeedRow[] {
  const all: VisualSeedRow[] = [
    ...visualAstronomy,
    ...visualGeography,
    ...visualScience,
    ...visualMath,
    ...visualHistory,
    ...visualCreativity,
  ];
  ensureValidPublicImageUrls(all);
  ensureNoDuplicateVisual(all);
  return all;
}
