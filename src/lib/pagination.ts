/** Normaliza `page` y `limit` de query con tope seguro para listados API. */
export function parsePaginationQuery(
  rawPage: unknown,
  rawLimit: unknown,
  defaults: { page?: number; limit?: number; maxLimit?: number } = {},
): { page: number; limit: number; skip: number } {
  const pageDefault = defaults.page ?? 1;
  const limitDefault = defaults.limit ?? 20;
  const maxLimit = defaults.maxLimit ?? 100;

  const pageNum = Number(rawPage);
  const limitNum = Number(rawLimit);
  const page = Number.isFinite(pageNum) && pageNum >= 1 ? Math.floor(pageNum) : pageDefault;
  const limit =
    Number.isFinite(limitNum) && limitNum >= 1
      ? Math.min(Math.floor(limitNum), maxLimit)
      : limitDefault;

  return { page, limit, skip: (page - 1) * limit };
}
