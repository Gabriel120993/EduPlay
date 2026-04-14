import { createContext, useContext } from "react";

import type { PremiumInAppPurchase, PremiumStoreProductDetail } from "../types/premiumStore";

export type { PremiumInAppPurchase, PremiumStoreProductDetail };

export type ParentIapContextValue = {
  productsLoading: boolean;
  storeQueryFailed: boolean;
  detailsByProductId: ReadonlyMap<string, PremiumStoreProductDetail>;
  purchaseBusy: boolean;
  restoreBusy: boolean;
  purchaseProduct: (storeProductId: string) => Promise<void>;
  /** Historial de la tienda + validación en servidor (sincroniza premium en esta cuenta). */
  restorePurchases: () => Promise<{ ok: boolean; message: string }>;
};

export const ParentIapContext = createContext<ParentIapContextValue | null>(null);

export function useParentIap(): ParentIapContextValue {
  const ctx = useContext(ParentIapContext);
  if (!ctx) {
    throw new Error("useParentIap debe usarse dentro de ParentIapProvider.");
  }
  return ctx;
}
