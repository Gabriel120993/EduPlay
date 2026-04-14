import { PREMIUM_PLANS } from "../constants/premiumPlans";
import type { PremiumStoreProductDetail } from "../types/premiumStore";

export const PREMIUM_STORE_PRODUCT_IDS = PREMIUM_PLANS.map((p) => p.storeProductId);

export type PremiumProductDetailsMap = ReadonlyMap<string, PremiumStoreProductDetail>;

export async function connectIapSafe(): Promise<void> {}

export async function fetchPremiumProductDetails(): Promise<{
  responseCode: number;
  results: PremiumProductDetailsMap;
  errorCode?: number;
}> {
  return { responseCode: 0, results: new Map() };
}
