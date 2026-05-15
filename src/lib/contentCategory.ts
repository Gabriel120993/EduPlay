import { ContentCategory } from '@prisma/client';

/** Lista canónica alineada con el enum Prisma `ContentCategory`. */
export const CONTENT_CATEGORY_VALUES = Object.values(ContentCategory) as ContentCategory[];

const SET = new Set<string>(CONTENT_CATEGORY_VALUES);

export function isContentCategory(value: string): value is ContentCategory {
  return SET.has(value.trim());
}

/** Devuelve la categoría o null si vacío / inválida. */
export function parseContentCategory(value: string | null | undefined): ContentCategory | null {
  if (value == null) return null;
  const t = String(value).trim();
  if (!t) return null;
  return isContentCategory(t) ? (t as ContentCategory) : null;
}

/** Para APIs: categoría obligatoria. */
export function parseRequiredContentCategory(
  value: unknown,
): { ok: true; category: ContentCategory } | { ok: false; error: string } {
  if (value == null || (typeof value === 'string' && value.trim() === '')) {
    return { ok: false, error: 'category es obligatorio.' };
  }
  if (typeof value !== 'string') {
    return { ok: false, error: 'category debe ser texto.' };
  }
  const c = parseContentCategory(value);
  if (!c) {
    return {
      ok: false,
      error: `category inválida. Usá una de: ${CONTENT_CATEGORY_VALUES.join(', ')}.`,
    };
  }
  return { ok: true, category: c };
}

/** Para APIs: categoría opcional (null si omitida o vacía). */
/**
 * Mapea categorías de `EducationalContent` (p. ej. "Astronomy", "Math") al enum `ContentCategory`.
 */
export function educationalCategoryToContentCategory(raw: string): ContentCategory | null {
  const t = raw.trim().toLowerCase();
  if (!t) return null;
  const map: Record<string, ContentCategory> = {
    astronomy: ContentCategory.astronomy,
    math: ContentCategory.math,
    science: ContentCategory.science,
    history: ContentCategory.history,
    geography: ContentCategory.geography,
    creativity: ContentCategory.creativity,
    education: ContentCategory.education,
    puzzle: ContentCategory.puzzle,
    sports: ContentCategory.sports,
  };
  return map[t] ?? null;
}

export function parseOptionalContentCategory(
  value: unknown,
): { ok: true; category: ContentCategory | null } | { ok: false; error: string } {
  if (value === undefined || value === null) {
    return { ok: true, category: null };
  }
  if (typeof value !== 'string') {
    return { ok: false, error: 'category debe ser texto.' };
  }
  const t = value.trim();
  if (t === '') {
    return { ok: true, category: null };
  }
  const c = parseContentCategory(t);
  if (!c) {
    return {
      ok: false,
      error: `category inválida. Usá una de: ${CONTENT_CATEGORY_VALUES.join(', ')}.`,
    };
  }
  return { ok: true, category: c };
}
