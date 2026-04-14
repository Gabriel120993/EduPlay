import { useMemo, type ReactNode } from "react";

import { ParentIapContext, type ParentIapContextValue } from "./parentIapContextDef";

/** En web no hay App Store / Play Billing; evitamos cargar `expo-in-app-purchases` (módulo nativo inexistente). */
export function ParentIapProvider({ children }: { children: ReactNode }) {
  const value = useMemo<ParentIapContextValue>(
    () => ({
      productsLoading: false,
      storeQueryFailed: false,
      detailsByProductId: new Map(),
      purchaseBusy: false,
      restoreBusy: false,
      purchaseProduct: async () => {},
      restorePurchases: async () => ({
        ok: false,
        message: "Las compras in-app están disponibles en la app para iOS o Android, no en el navegador.",
      }),
    }),
    []
  );

  return <ParentIapContext.Provider value={value}>{children}</ParentIapContext.Provider>;
}
