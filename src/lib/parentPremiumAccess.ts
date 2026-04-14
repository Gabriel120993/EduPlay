/**
 * Reglas de acceso premium para `Parent`.
 * - `isPremium` true sin `premiumUntil`: acceso (p. ej. compra sin fecha de fin en BD).
 * - `isPremium` true con `premiumUntil`: acceso solo si la fecha es futura o null.
 * - `isPremium` false con `premiumUntil` futuro: acceso (p. ej. prueba solo por fecha).
 */
export function parentHasActivePremium(row: {
  isPremium: boolean;
  premiumUntil: Date | null;
}): boolean {
  const now = new Date();
  if (row.isPremium) {
    if (row.premiumUntil == null) return true;
    return row.premiumUntil > now;
  }
  return row.premiumUntil != null && row.premiumUntil > now;
}
