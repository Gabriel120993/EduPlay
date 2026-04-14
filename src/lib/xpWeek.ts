/**
 * Semana calendario UTC: lunes 00:00:00 → domingo 23:59:59.999 (fin exclusivo = lunes siguiente).
 */
export function utcWeekRange(at: Date = new Date()): {
  weekStartUtc: Date;
  weekEndExclusiveUtc: Date;
} {
  const day = at.getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  const weekStartUtc = new Date(
    Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate())
  );
  weekStartUtc.setUTCDate(weekStartUtc.getUTCDate() - daysSinceMonday);
  weekStartUtc.setUTCHours(0, 0, 0, 0);
  const weekEndExclusiveUtc = new Date(weekStartUtc);
  weekEndExclusiveUtc.setUTCDate(weekEndExclusiveUtc.getUTCDate() + 7);
  return { weekStartUtc, weekEndExclusiveUtc };
}
