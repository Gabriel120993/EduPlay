/** Detalle mínimo de producto en tienda (compartido web / nativo). */
export type PremiumStoreProductDetail = {
  productId: string;
  price: string;
};

export type PremiumInAppPurchase = {
  productId: string;
  orderId: string;
  purchaseState: number;
  transactionReceipt?: string;
  purchaseToken?: string;
  packageName?: string;
  acknowledged: boolean;
};
