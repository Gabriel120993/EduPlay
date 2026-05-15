import type { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

import { verifyAppleSubscription } from '../lib/iap/verifyAppleReceipt';
import { verifyGooglePlaySubscription } from '../lib/iap/verifyGoogleSubscription';
import { parentHasActivePremium } from '../lib/parentPremiumAccess';
import { logError } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { parseVerifyPremiumIapBody } from '../lib/validation/iapVerify.schema';

function mergePremiumUntil(existing: Date | null, fromStore: Date): Date {
  if (!existing) return fromStore;
  return existing.getTime() >= fromStore.getTime() ? existing : fromStore;
}

async function respondParentPremium(res: Response, parentId: string): Promise<void> {
  const row = await prisma.parent.findUnique({
    where: { id: parentId },
    select: { id: true, email: true, isPremium: true, premiumUntil: true },
  });
  if (!row) {
    res.status(404).json({ error: 'Cuenta no encontrada.' });
    return;
  }
  res.json({
    parent: {
      id: row.id,
      email: row.email,
      isPremium: parentHasActivePremium(row),
      premiumUntil: row.premiumUntil?.toISOString() ?? null,
    },
  });
}

/**
 * POST /api/parents/premium/iap/verify
 * Valida recibo/token con Apple o Google y activa premium en BD.
 */
export async function verifyPremiumIapPurchase(req: Request, res: Response): Promise<void> {
  const auth = req.auth;
  if (!auth || auth.kind !== 'parent') {
    res.status(401).json({ error: 'No autenticado.' });
    return;
  }

  const bodyParse = parseVerifyPremiumIapBody(req.body);
  if (!bodyParse.ok) {
    res.status(400).json({ error: bodyParse.error });
    return;
  }
  const parsed = bodyParse.data;

  const parentId = auth.parentId;
  const sharedSecret = process.env.APPLE_IAP_SHARED_SECRET?.trim();

  let premiumUntil: Date;
  let externalId: string;
  const platform = parsed.platform;

  try {
    if (platform === 'ios') {
      if (!sharedSecret) {
        res.status(503).json({ error: 'Validación iOS no configurada en el servidor.' });
        return;
      }
      const receipt = parsed.transactionReceipt!.trim();
      const r = await verifyAppleSubscription({
        receiptBase64: receipt,
        sharedSecret,
        expectedProductId: parsed.productId,
        expectedTransactionId: parsed.orderId || undefined,
      });
      premiumUntil = r.premiumUntil;
      externalId = r.transactionId;
    } else {
      const pkg = parsed.packageName?.trim() || process.env.GOOGLE_PLAY_PACKAGE_NAME?.trim() || '';
      if (!pkg) {
        res.status(400).json({
          error: 'packageName es obligatorio en Android (o configurá GOOGLE_PLAY_PACKAGE_NAME).',
        });
        return;
      }
      const envPkg = process.env.GOOGLE_PLAY_PACKAGE_NAME?.trim();
      if (envPkg && pkg !== envPkg) {
        res.status(400).json({ error: 'packageName no autorizado.' });
        return;
      }
      const r = await verifyGooglePlaySubscription({
        packageName: pkg,
        subscriptionId: parsed.productId,
        purchaseToken: parsed.purchaseToken!.trim(),
      });
      premiumUntil = r.premiumUntil;
      externalId = r.externalId;
    }
  } catch (err) {
    logError('premiumIap.verify', err);
    const msg = err instanceof Error ? err.message : 'Validación fallida.';
    res.status(400).json({ error: msg });
    return;
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.iapProcessedTransaction.create({
        data: {
          platform,
          externalId,
          parentId,
          productId: parsed.productId,
        },
      });

      const parentRow = await tx.parent.findUnique({
        where: { id: parentId },
        select: { premiumUntil: true },
      });

      const nextUntil = mergePremiumUntil(parentRow?.premiumUntil ?? null, premiumUntil);

      await tx.parent.update({
        where: { id: parentId },
        data: {
          isPremium: true,
          premiumUntil: nextUntil,
        },
      });
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      await respondParentPremium(res, parentId);
      return;
    }
    logError('premiumIap.db', err);
    res.status(500).json({ error: 'Error al guardar la suscripción.' });
    return;
  }

  await respondParentPremium(res, parentId);
}
