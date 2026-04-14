import { CONTENT_CATEGORIES_UI } from "./contentCategoryUi";

/** Categoría distinta a la actual para sugerir otro juego (excluye `mixed` como destino). */
export function pickSuggestedOtherCategory(currentRaw: string | undefined): string {
  const current = (currentRaw ?? "mixed").trim().toLowerCase();
  const pool = CONTENT_CATEGORIES_UI.map((x) => x.id).filter((id) => id !== "mixed");
  const others = current === "mixed" ? pool : pool.filter((id) => id !== current);
  if (others.length === 0) return "astronomy";
  return others[Math.floor(Math.random() * others.length)]!;
}
