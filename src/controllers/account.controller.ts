import type { Request, Response } from 'express';
import { deleteChildUserAccount } from '../lib/deleteChildUser';
import { logError } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { parseUuidParam } from '../lib/validation/schemas';

/**
 * DELETE /api/account
 * - JWT menor: borra la propia cuenta.
 * - JWT tutor: query `childId` (UUID) del menor vinculado a ese tutor.
 */
export async function deleteAccount(req: Request, res: Response): Promise<void> {
  const auth = req.auth;
  if (!auth) {
    res.status(401).json({ error: 'No autenticado.' });
    return;
  }

  let targetUserId: string;

  if (auth.kind === 'child') {
    targetUserId = auth.userId;
  } else {
    const raw = req.query.childId;
    const parsed = parseUuidParam(typeof raw === 'string' ? raw : '');
    if (!parsed.ok) {
      res.status(400).json({
        error:
          'Para borrar la cuenta de un menor, enviá un childId válido en la query (p. ej. ?childId=uuid).',
      });
      return;
    }
    const child = await prisma.user.findUnique({
      where: { id: parsed.uuid },
      select: { id: true, parentId: true },
    });
    if (!child || child.parentId !== auth.parentId) {
      res.status(404).json({ error: 'Menor no encontrado o no vinculado a tu cuenta.' });
      return;
    }
    targetUserId = child.id;
  }

  try {
    await deleteChildUserAccount(prisma, targetUserId);
    res.status(204).send();
  } catch (e) {
    logError('account.deleteAccount', e);
    res.status(500).json({ error: 'No se pudo eliminar la cuenta.' });
  }
}
