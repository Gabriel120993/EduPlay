/** SKUs premium (mismos que App Store Connect / Play Console y app móvil). */
export const PREMIUM_IAP_PRODUCT_IDS = new Set(["eduplay_premium_monthly", "eduplay_premium_yearly"]);

export function isPremiumIapProductId(productId: string): boolean {
  return PREMIUM_IAP_PRODUCT_IDS.has(productId);
}
