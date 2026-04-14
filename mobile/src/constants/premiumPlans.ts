/**
 * Planes de suscripción Premium (App Store / Play Store).
 * Los `storeProductId` deben coincidir con los productos creados en cada tienda.
 */

export type PremiumPlanId = "monthly_premium" | "yearly_premium";

export type PremiumPlanDefinition = {
  id: PremiumPlanId;
  /** SKU en App Store Connect / Google Play Console */
  storeProductId: string;
  billingPeriodLabel: string;
  /** Texto mostrado en UI (orientativo hasta IAP en vivo). */
  priceDisplayLabel: string;
};

export const PREMIUM_PLANS: readonly PremiumPlanDefinition[] = [
  {
    id: "monthly_premium",
    storeProductId: "eduplay_premium_monthly",
    billingPeriodLabel: "Mensual",
    priceDisplayLabel: "ARS 4.999 / mes",
  },
  {
    id: "yearly_premium",
    storeProductId: "eduplay_premium_yearly",
    billingPeriodLabel: "Anual",
    priceDisplayLabel: "ARS 49.990 / año",
  },
] as const;

export const PREMIUM_PLAN_BY_ID: Record<PremiumPlanId, PremiumPlanDefinition> = {
  monthly_premium: PREMIUM_PLANS[0],
  yearly_premium: PREMIUM_PLANS[1],
};

/** Mapa inverso: id de tienda → plan interno (p. ej. validación de recibos). */
export const PREMIUM_STORE_PRODUCT_ID_TO_PLAN: Record<string, PremiumPlanId> = {
  eduplay_premium_monthly: "monthly_premium",
  eduplay_premium_yearly: "yearly_premium",
};

export function getPremiumPlanByStoreProductId(productId: string): PremiumPlanDefinition | undefined {
  const planId = PREMIUM_STORE_PRODUCT_ID_TO_PLAN[productId];
  return planId ? PREMIUM_PLAN_BY_ID[planId] : undefined;
}
