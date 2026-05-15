import { isPremiumIapProductId } from '../../constants/premiumIap';

type AppleVerifyPayload = {
  'receipt-data': string;
  password: string;
  'exclude-old-transactions'?: boolean;
};

type AppleReceiptInfo = {
  product_id?: string;
  expires_date_ms?: string;
  transaction_id?: string;
};

type AppleVerifyResponse = {
  status: number;
  latest_receipt_info?: AppleReceiptInfo[];
  receipt?: { in_app?: AppleReceiptInfo[] };
};

function parseReceiptInfoArray(body: AppleVerifyResponse): AppleReceiptInfo[] {
  const latest = body.latest_receipt_info;
  if (Array.isArray(latest) && latest.length > 0) return latest;
  const inApp = body.receipt?.in_app;
  if (Array.isArray(inApp) && inApp.length > 0) return inApp;
  return [];
}

/**
 * Valida recibo con verifyReceipt (StoreKit 1 / legacy).
 * Devuelve la fecha de fin de suscripción y el id de transacción usado para idempotencia.
 */
export async function verifyAppleSubscription(params: {
  receiptBase64: string;
  sharedSecret: string;
  expectedProductId: string;
  expectedTransactionId?: string;
}): Promise<{ premiumUntil: Date; transactionId: string }> {
  const payload: AppleVerifyPayload = {
    'receipt-data': params.receiptBase64,
    password: params.sharedSecret,
    'exclude-old-transactions': false,
  };

  const post = async (url: string): Promise<AppleVerifyResponse> => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(`Apple verifyReceipt HTTP ${res.status}`);
    }
    return (await res.json()) as AppleVerifyResponse;
  };

  let body = await post('https://buy.itunes.apple.com/verifyReceipt');
  if (body.status === 21007) {
    body = await post('https://sandbox.itunes.apple.com/verifyReceipt');
  }

  if (body.status !== 0) {
    throw new Error(`Apple verifyReceipt status ${body.status}`);
  }

  const rows = parseReceiptInfoArray(body).filter(
    (r) => r.product_id && isPremiumIapProductId(r.product_id),
  );
  const forProduct = rows.filter((r) => r.product_id === params.expectedProductId);
  if (forProduct.length === 0) {
    throw new Error('Recibo sin suscripción premium esperada.');
  }

  let chosen: AppleReceiptInfo;
  if (params.expectedTransactionId) {
    const match = forProduct.find((r) => r.transaction_id === params.expectedTransactionId);
    chosen = match ?? forProduct.reduce((a, b) => pickLaterExpiry(a, b));
  } else {
    chosen = forProduct.reduce((a, b) => pickLaterExpiry(a, b));
  }

  const ms = chosen.expires_date_ms ? Number(chosen.expires_date_ms) : NaN;
  if (!Number.isFinite(ms) || ms <= Date.now()) {
    throw new Error('Suscripción expirada o sin fecha de fin en el recibo.');
  }

  const tid = chosen.transaction_id;
  if (!tid) {
    throw new Error('Recibo sin transaction_id.');
  }

  return { premiumUntil: new Date(ms), transactionId: tid };
}

function pickLaterExpiry(a: AppleReceiptInfo, b: AppleReceiptInfo): AppleReceiptInfo {
  const ma = a.expires_date_ms ? Number(a.expires_date_ms) : 0;
  const mb = b.expires_date_ms ? Number(b.expires_date_ms) : 0;
  return mb >= ma ? b : a;
}
