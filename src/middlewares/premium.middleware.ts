import type { NextFunction, Request, Response } from 'express';

import { logError } from '../lib/logger';
import { parentHasActivePremium } from '../lib/parentPremiumAccess';
import { prisma } from '../lib/prisma';

/**
 * Requiere sesión tutor (`requireParent` antes) con premium activo (`isPremium` / `premiumUntil`).
 * Usar en rutas de analíticas del tutor y controles parentales avanzados.
 */
export async function checkPremium(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = req.auth;
  if (!auth || auth.kind !== 'parent') {
    res.status(403).json({ error: 'No autorizado.', code: 'PREMIUM_PARENT_ONLY' });
    return;
  }

  try {
    const row = await prisma.parent.findUnique({
      where: { id: auth.parentId },
      select: { isPremium: true, premiumUntil: true },
    });
    if (!row || !parentHasActivePremium(row)) {
      res.status(403).json({
        error: 'Esta función requiere una suscripción premium.',
        code: 'PREMIUM_REQUIRED',
      });
      return;
    }
    next();
  } catch (err) {
    logError('checkPremium', err);
    res.status(500).json({ error: 'Error al verificar la suscripción.' });
  }
}
