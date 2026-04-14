/**
 * Planes Premium y SKUs de tienda (validación de recibos / webhooks).
 * Mantener alineado con `mobile/src/constants/premiumPlans.ts`.
 */

export type PremiumPlanId = "monthly_premium" | "yearly_premium";

export type PremiumPlanDefinition = {
  id: PremiumPlanId;
  storeProductId: string;
};

export const PREMIUM_PLANS: readonly PremiumPlanDefinition[] = [
  { id: "monthly_premium", storeProductId: "eduplay_premium_monthly" },
  { id: "yearly_premium", storeProductId: "eduplay_premium_yearly" },
] as const;

export const PREMIUM_PLAN_BY_ID: Record<PremiumPlanId, PremiumPlanDefinition> = {
  monthly_premium: PREMIUM_PLANS[0],
  yearly_premium: PREMIUM_PLANS[1],
};

export const PREMIUM_STORE_PRODUCT_IDS = new Set<string>([
  "eduplay_premium_monthly",
  "eduplay_premium_yearly",
]);

export const PREMIUM_STORE_PRODUCT_ID_TO_PLAN: Record<string, PremiumPlanId> = {
  eduplay_premium_monthly: "monthly_premium",
  eduplay_premium_yearly: "yearly_premium",
};

export function isKnownPremiumStoreProductId(productId: string): boolean {
  return PREMIUM_STORE_PRODUCT_IDS.has(productId);
}

export function getPremiumPlanIdFromStoreProductId(productId: string): PremiumPlanId | undefined {
  return PREMIUM_STORE_PRODUCT_ID_TO_PLAN[productId];
}
