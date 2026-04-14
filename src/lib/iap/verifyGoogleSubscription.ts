import { google } from "googleapis";

import { isPremiumIapProductId } from "../../constants/premiumIap";

let cachedAuth: InstanceType<typeof google.auth.GoogleAuth> | null = null;

function getAndroidPublisher() {
  const raw = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) {
    throw new Error("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON no configurado.");
  }
  const credentials = JSON.parse(raw) as object;
  if (!cachedAuth) {
    cachedAuth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/androidpublisher"],
    });
  }
  return google.androidpublisher({
    version: "v3",
    // googleapis tipa auth estricto; GoogleAuth con credentials JSON es válido en runtime.
    auth: cachedAuth as Parameters<typeof google.androidpublisher>[0]["auth"],
  });
}

/**
 * Valida suscripción en Google Play y devuelve fecha de fin + token (idempotencia).
 */
export async function verifyGooglePlaySubscription(params: {
  packageName: string;
  subscriptionId: string;
  purchaseToken: string;
}): Promise<{ premiumUntil: Date; externalId: string }> {
  if (!isPremiumIapProductId(params.subscriptionId)) {
    throw new Error("ProductId no es premium.");
  }

  const publisher = getAndroidPublisher();
  const { data } = await publisher.purchases.subscriptions.get({
    packageName: params.packageName,
    subscriptionId: params.subscriptionId,
    token: params.purchaseToken,
  });

  const expiryMs = data.expiryTimeMillis ? Number(data.expiryTimeMillis) : NaN;
  if (!Number.isFinite(expiryMs) || expiryMs <= Date.now()) {
    throw new Error("Suscripción de Play expirada o sin fecha de fin.");
  }

  const paymentState = data.paymentState;
  if (paymentState === 0) {
    throw new Error("Pago de suscripción aún pendiente en Play.");
  }
  if (
    paymentState != null &&
    paymentState !== 1 &&
    paymentState !== 2 &&
    paymentState !== 3
  ) {
    throw new Error(`Estado de pago Play no válido: ${String(paymentState)}`);
  }

  return {
    premiumUntil: new Date(expiryMs),
    externalId: params.purchaseToken,
  };
}
