import * as InAppPurchases from "expo-in-app-purchases";
import type { IAPItemDetails } from "expo-in-app-purchases";
import { Platform } from "react-native";

import { PREMIUM_PLANS } from "../constants/premiumPlans";

export const PREMIUM_STORE_PRODUCT_IDS = PREMIUM_PLANS.map((p) => p.storeProductId);

export type PremiumProductDetailsMap = ReadonlyMap<string, IAPItemDetails>;

export async function connectIapSafe(): Promise<void> {
  try {
    await InAppPurchases.connectAsync();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("Already connected")) {
      return;
    }
    throw e;
  }
}

/**
 * Conecta a la tienda y pide detalles de los SKUs premium (mismo id en iOS y Android).
 */
export async function fetchPremiumProductDetails(): Promise<{
  responseCode: InAppPurchases.IAPResponseCode;
  results: PremiumProductDetailsMap;
  errorCode?: InAppPurchases.IAPErrorCode;
}> {
  if (Platform.OS === "web") {
    return { responseCode: InAppPurchases.IAPResponseCode.OK, results: new Map() };
  }

  await connectIapSafe();
  const { responseCode, results, errorCode } = await InAppPurchases.getProductsAsync([
    ...PREMIUM_STORE_PRODUCT_IDS,
  ]);

  const map = new Map<string, IAPItemDetails>();
  if (responseCode === InAppPurchases.IAPResponseCode.OK && results) {
    for (const item of results) {
      map.set(item.productId, item);
    }
  }

  return { responseCode, results: map, errorCode };
}
