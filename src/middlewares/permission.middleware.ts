import type { NextFunction, Request, Response } from 'express';
import { ActivityType, Difficulty } from '@prisma/client';
import { peekScreenTimeToday } from '../lib/screenTime';
import { logError } from '../lib/logger';
import { prisma } from '../lib/prisma';

/** Edad mínima sugerida por dificultad (heurística; ajustable por producto). */
function minAgeForDifficulty(d: Difficulty): number {
  switch (d) {
    case Difficulty.EASY:
      return 6;
    case Difficulty.MEDIUM:
      return 10;
    case Difficulty.HARD:
      return 13;
    default:
      return 8;
  }
}

/**
 * Verifica que el contenido educativo sea apropiado para la edad del menor autenticado.
 * Padres en sesión omiten la restricción de edad (p. ej. previsualización).
 */
export function checkContentAccess(contentIdParam = 'contentId') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const auth = req.auth;
    if (!auth) {
      res.status(401).json({ error: 'No autenticado.', code: 'UNAUTHORIZED' });
      return;
    }
    if (auth.kind === 'parent') {
      next();
      return;
    }

    const contentId =
      typeof req.params[contentIdParam] === 'string' ? req.params[contentIdParam].trim() : '';
    if (!contentId) {
      res.status(400).json({ error: 'ID de contenido inválido.', code: 'INVALID_CONTENT_ID' });
      return;
    }

    try {
      const [user, content] = await Promise.all([
        prisma.user.findUnique({
          where: { id: auth.userId },
          select: { age: true, type: true },
        }),
        prisma.educationalContent.findUnique({
          where: { id: contentId },
          select: { id: true, difficulty: true, published: true },
        }),
      ]);

      if (!user || user.type !== 'minor') {
        res.status(403).json({ error: 'Perfil de menor no encontrado.', code: 'FORBIDDEN' });
        return;
      }
      if (!content || !content.published) {
        res.status(404).json({ error: 'Contenido no disponible.', code: 'CONTENT_NOT_FOUND' });
        return;
      }

      const minAge = minAgeForDifficulty(content.difficulty);
      if (user.age < minAge) {
        res.status(403).json({
          error: 'Este contenido no está recomendado para tu edad.',
          code: 'CONTENT_AGE_RESTRICTED',
          details: { minAgeSuggested: minAge, difficulty: content.difficulty },
        });
        return;
      }

      next();
    } catch (e) {
      logError('permission.checkContentAccess', e);
      res.status(500).json({ error: 'Error al validar acceso al contenido.' });
    }
  };
}

/**
 * Bloquea si el menor superó el tiempo de pantalla diario configurado (UTC).
 */
export function checkTimeLimit() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const auth = req.auth;
    if (!auth || auth.kind !== 'child') {
      next();
      return;
    }

    try {
      const peek = await peekScreenTimeToday(auth.userId);
      if (!peek) {
        next();
        return;
      }

      if (peek.isUnlimited) {
        next();
        return;
      }
      const limitSec = peek.dailyLimitMinutes * 60;
      if (peek.usedTodaySeconds >= limitSec) {
        res.status(429).json({
          error:
            'Alcanzaste el límite diario de tiempo de pantalla. Pedí a tu tutor si necesitás más tiempo.',
          code: 'SCREEN_TIME_LIMIT_EXCEEDED',
          usedTodaySeconds: peek.usedTodaySeconds,
          dailyLimitMinutes: peek.dailyLimitMinutes,
        });
        return;
      }

      next();
    } catch (e) {
      logError('permission.checkTimeLimit', e);
      res.status(500).json({ error: 'Error al verificar el límite de tiempo.' });
    }
  };
}

/**
 * Comprueba si la acción configurada en `approvalRequiredFor` tiene una aprobación parental pendiente.
 */
export function checkParentalApproval(action: ActivityType) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const auth = req.auth;
    if (!auth || auth.kind !== 'child') {
      next();
      return;
    }

    try {
      const relation = await prisma.parentChildRelation.findFirst({
        where: { childId: auth.userId, status: 'active' },
        select: { approvalRequiredFor: true },
      });
      if (!relation) {
        next();
        return;
      }

      const requiredFor = Array.isArray(relation.approvalRequiredFor)
        ? relation.approvalRequiredFor.map((v) => String(v))
        : [];
      if (!requiredFor.includes(action)) {
        next();
        return;
      }

      const pending = await prisma.activityApproval.findFirst({
        where: {
          minorId: auth.userId,
          activityType: action,
          status: 'pending',
        },
        orderBy: { requestedAt: 'desc' },
        select: { id: true },
      });

      if (pending) {
        res.status(403).json({
          error: 'Esta acción requiere aprobación parental pendiente.',
          code: 'PARENTAL_APPROVAL_PENDING',
          approvalId: pending.id,
          action,
        });
        return;
      }

      next();
    } catch (e) {
      logError('permission.checkParentalApproval', e);
      res.status(500).json({ error: 'Error al verificar aprobación parental.' });
    }
  };
}
