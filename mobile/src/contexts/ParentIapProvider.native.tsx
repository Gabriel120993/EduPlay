import * as InAppPurchases from "expo-in-app-purchases";
import type { InAppPurchase } from "expo-in-app-purchases";
import { IAPResponseCode, InAppPurchaseState } from "expo-in-app-purchases";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Platform } from "react-native";

import { getPremiumPlanByStoreProductId } from "../constants/premiumPlans";
import { connectIapSafe, PREMIUM_STORE_PRODUCT_IDS } from "../services/premiumIap";
import type { PremiumStoreProductDetail } from "../types/premiumStore";
import { verifyPremiumIapPurchase } from "../services/api";
import { useAuth } from "./AuthContext";
import { ParentIapContext, type ParentIapContextValue } from "./parentIapContextDef";

function toStoreDetail(item: { productId: string; price: string }): PremiumStoreProductDetail {
  return { productId: item.productId, price: item.price };
}

export function ParentIapProvider({ children }: { children: ReactNode }) {
  const { refreshParent } = useAuth();
  const refreshParentRef = useRef(refreshParent);
  refreshParentRef.current = refreshParent;

  const [productsLoading, setProductsLoading] = useState(true);
  const [storeQueryFailed, setStoreQueryFailed] = useState(false);
  const [detailsByProductId, setDetailsByProductId] = useState<ReadonlyMap<string, PremiumStoreProductDetail>>(
    () => new Map()
  );
  const [purchaseBusy, setPurchaseBusy] = useState(false);
  const [restoreBusy, setRestoreBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    InAppPurchases.setPurchaseListener(({ responseCode, results, errorCode }) => {
      void (async () => {
        if (responseCode === InAppPurchases.IAPResponseCode.USER_CANCELED) {
          setPurchaseBusy(false);
          return;
        }
        if (responseCode !== InAppPurchases.IAPResponseCode.OK || !results?.length) {
          if (responseCode !== InAppPurchases.IAPResponseCode.OK) {
            console.warn("IAP listener:", responseCode, errorCode);
          }
          setPurchaseBusy(false);
          return;
        }

        for (const purchase of results) {
          await syncPurchaseWithBackend(purchase, () => refreshParentRef.current());
        }
        setPurchaseBusy(false);
      })();
    });

    (async () => {
      setProductsLoading(true);
      setStoreQueryFailed(false);
      try {
        await connectIapSafe();
        if (cancelled) return;
        const { responseCode, results } = await InAppPurchases.getProductsAsync([...PREMIUM_STORE_PRODUCT_IDS]);
        if (cancelled) return;
        if (responseCode === InAppPurchases.IAPResponseCode.OK && results) {
          const map = new Map<string, PremiumStoreProductDetail>();
          for (const item of results) {
            map.set(item.productId, toStoreDetail(item));
          }
          setDetailsByProductId(map);
        } else {
          setStoreQueryFailed(true);
        }
      } catch {
        if (!cancelled) setStoreQueryFailed(true);
      } finally {
        if (!cancelled) setProductsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      void InAppPurchases.disconnectAsync().catch(() => undefined);
    };
  }, []);

  const purchaseProduct = useCallback(async (storeProductId: string) => {
    if (!getPremiumPlanByStoreProductId(storeProductId)) return;
    setPurchaseBusy(true);
    try {
      await connectIapSafe();
      await InAppPurchases.purchaseItemAsync(storeProductId);
    } catch {
      setPurchaseBusy(false);
    }
  }, []);

  const restorePurchases = useCallback(async (): Promise<{ ok: boolean; message: string }> => {
    setRestoreBusy(true);
    try {
      await connectIapSafe();
      const { responseCode, results } = await InAppPurchases.getPurchaseHistoryAsync();
      if (responseCode !== IAPResponseCode.OK) {
        return {
          ok: false,
          message: "No se pudo consultar las compras. Probá de nuevo más tarde.",
        };
      }
      if (!results?.length) {
        return {
          ok: false,
          message: "No encontramos compras asociadas a esta cuenta de la tienda.",
        };
      }

      const refresh = () => refreshParentRef.current();
      let anyOk = false;
      const seen = new Set<string>();

      for (const purchase of results) {
        if (!isPremiumPurchaseState(purchase.purchaseState)) continue;
        if (!getPremiumPlanByStoreProductId(purchase.productId)) continue;
        const dedupeKey = `${purchase.productId}|${purchase.orderId}|${purchase.purchaseToken ?? ""}`;
        if (seen.has(dedupeKey)) continue;
        seen.add(dedupeKey);
        const synced = await syncPurchaseWithBackend(purchase, refresh);
        if (synced) anyOk = true;
      }

      if (anyOk) {
        return { ok: true, message: "Compras restauradas. Ya tenés acceso Premium en esta cuenta." };
      }
      return {
        ok: false,
        message: "No hay una suscripción Premium activa para restaurar en esta tienda.",
      };
    } catch {
      return { ok: false, message: "Algo salió mal al restaurar. Intentá de nuevo." };
    } finally {
      setRestoreBusy(false);
    }
  }, []);

  const value = useMemo<ParentIapContextValue>(
    () => ({
      productsLoading,
      storeQueryFailed,
      detailsByProductId,
      purchaseBusy,
      restoreBusy,
      purchaseProduct,
      restorePurchases,
    }),
    [
      productsLoading,
      storeQueryFailed,
      detailsByProductId,
      purchaseBusy,
      restoreBusy,
      purchaseProduct,
      restorePurchases,
    ]
  );

  return <ParentIapContext.Provider value={value}>{children}</ParentIapContext.Provider>;
}

function isPremiumPurchaseState(state: InAppPurchaseState): boolean {
  return state === InAppPurchaseState.PURCHASED || state === InAppPurchaseState.RESTORED;
}

async function syncPurchaseWithBackend(
  purchase: InAppPurchase,
  refreshParent: () => Promise<void>
): Promise<boolean> {
  if (!getPremiumPlanByStoreProductId(purchase.productId)) return false;
  if (!isPremiumPurchaseState(purchase.purchaseState)) return false;

  try {
    if (Platform.OS === "ios") {
      if (!purchase.transactionReceipt) return false;
      await verifyPremiumIapPurchase({
        platform: "ios",
        productId: purchase.productId,
        orderId: purchase.orderId || "",
        transactionReceipt: purchase.transactionReceipt,
      });
    } else {
      if (!purchase.purchaseToken || !purchase.packageName) return false;
      await verifyPremiumIapPurchase({
        platform: "android",
        productId: purchase.productId,
        orderId: purchase.orderId || purchase.purchaseToken.slice(0, 40),
        purchaseToken: purchase.purchaseToken,
        packageName: purchase.packageName,
      });
    }
    if (!purchase.acknowledged) {
      await InAppPurchases.finishTransactionAsync(purchase, false);
    }
    await refreshParent();
    return true;
  } catch (e) {
    console.warn("syncPurchaseWithBackend", e);
    return false;
  }
}
