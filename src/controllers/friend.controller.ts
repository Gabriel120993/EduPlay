import type { Request, Response } from 'express';
import { FriendStatus, Prisma } from '@prisma/client';
import {
  recordAndNotifyFriendRequest,
  recordAndNotifyFriendshipAwaitingParentApproval,
  recordAndNotifyNewFriendship,
} from '../lib/friendshipParentNotify';
import { env } from '../config/env';
import { assertAllowFriends } from '../lib/parentalRestrictions';
import { isFriendshipForbiddenByParentBlock } from '../lib/parentUserBlock';
import { logError, logSuspicious } from '../lib/logger';
import { prisma } from '../lib/prisma';
import {
  formatZodError,
  friendUserPairSchema,
  parentApproveFriendBodySchema,
  parseUuidParam,
  sendFriendRequestBodySchema,
} from '../lib/validation/schemas';
import {
  completeAcceptedFriendshipTx,
  ensureBothUsersExist,
  isActiveIncomingBlock,
} from '../services/friends.service';

export async function sendFriendRequest(req: Request, res: Response): Promise<void> {
  const parsed = sendFriendRequestBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }
  const { userId, friendId } = parsed.data;
  /** Siempre requerimos aprobación del tutor del destinatario; no se acepta anulación desde el cliente. */
  const requiresParentApproval = true;

  const auth = req.auth;
  if (auth?.kind !== 'child' || auth.userId !== userId) {
    logSuspicious('friend_request_spoofed_user_id', {
      bodyUserId: userId,
      jwtUserId: auth?.kind === 'child' ? auth.userId : undefined,
    });
    res.status(403).json({
      error: 'El identificador de usuario del remitente no coincide con tu sesión.',
    });
    return;
  }

  try {
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentOutgoingCreates = await prisma.friend.count({
      where: { userId, createdAt: { gte: hourAgo } },
    });
    if (recentOutgoingCreates >= env.friendRequestDbMaxPerHour) {
      logSuspicious('friend_request_hourly_db_cap', {
        userId,
        count: recentOutgoingCreates,
        max: env.friendRequestDbMaxPerHour,
      });
      res.status(429).json({
        error:
          'Enviaste demasiadas solicitudes de amistad recientemente. Probá de nuevo más tarde o pedí ayuda a un tutor.',
        code: 'FRIEND_REQUEST_TOO_MANY_NEW',
      });
      return;
    }

    if (!(await ensureBothUsersExist(userId, friendId))) {
      res.status(400).json({ error: 'userId o friendId no corresponden a usuarios existentes.' });
      return;
    }

    const senderFriends = await assertAllowFriends(userId);
    if (!senderFriends.ok) {
      res.status(403).json({ error: senderFriends.message });
      return;
    }

    if (await isFriendshipForbiddenByParentBlock(userId, friendId)) {
      res.status(403).json({ error: 'Un tutor bloqueó la amistad entre estos usuarios.' });
      return;
    }

    const reverse = await prisma.friend.findUnique({
      where: {
        userId_friendId: { userId: friendId, friendId: userId },
      },
    });

    if (reverse && isActiveIncomingBlock(reverse.status)) {
      res.status(409).json({
        error: 'Ya existe una solicitud pendiente en la dirección contraria.',
      });
      return;
    }
    if (reverse?.status === FriendStatus.ACCEPTED) {
      res.status(409).json({ error: 'Ya son amigos.' });
      return;
    }

    const existing = await prisma.friend.findUnique({
      where: {
        userId_friendId: { userId, friendId },
      },
    });

    if (existing?.status === FriendStatus.PENDING) {
      res.status(409).json({ error: 'Ya enviaste una solicitud pendiente a este usuario.' });
      return;
    }
    if (existing?.status === FriendStatus.AWAITING_PARENT) {
      res.status(409).json({
        error:
          'La solicitud ya fue aceptada por el destinatario y espera aprobación del padre o tutor.',
      });
      return;
    }
    if (existing?.status === FriendStatus.ACCEPTED) {
      res.status(409).json({ error: 'Ya son amigos.' });
      return;
    }

    let record;
    if (existing?.status === FriendStatus.REJECTED) {
      record = await prisma.friend.update({
        where: { id: existing.id },
        data: {
          status: FriendStatus.PENDING,
          requiresParentApproval,
          parentApproved: false,
        },
      });
    } else {
      record = await prisma.friend.create({
        data: {
          userId,
          friendId,
          status: FriendStatus.PENDING,
          requiresParentApproval,
          parentApproved: false,
        },
      });
    }

    void recordAndNotifyFriendRequest(userId, friendId);

    res.status(201).json(record);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      res.status(409).json({ error: 'Solicitud duplicada o conflicto con datos existentes.' });
      return;
    }
    logError('friend', err);
    res.status(500).json({ error: 'Error al enviar la solicitud de amistad.' });
  }
}

export async function acceptFriendRequest(req: Request, res: Response): Promise<void> {
  const parsed = friendUserPairSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }
  const { userId, friendId } = parsed.data;

  try {
    const row = await prisma.friend.findUnique({
      where: {
        userId_friendId: { userId, friendId },
      },
    });

    if (!row || row.status !== FriendStatus.PENDING) {
      res.status(404).json({
        error:
          'No hay solicitud pendiente con ese par userId (remitente) / friendId (destinatario).',
      });
      return;
    }

    const accepterFriends = await assertAllowFriends(friendId);
    if (!accepterFriends.ok) {
      res.status(403).json({ error: accepterFriends.message });
      return;
    }

    const senderFriends = await assertAllowFriends(userId);
    if (!senderFriends.ok) {
      res.status(403).json({ error: senderFriends.message });
      return;
    }

    if (await isFriendshipForbiddenByParentBlock(userId, friendId)) {
      res.status(403).json({ error: 'Un tutor bloqueó la amistad entre estos usuarios.' });
      return;
    }

    if (row.requiresParentApproval) {
      const updated = await prisma.friend.update({
        where: { id: row.id },
        data: { status: FriendStatus.AWAITING_PARENT },
      });
      void recordAndNotifyFriendshipAwaitingParentApproval(userId, friendId);
      res.json({
        awaitingParentApproval: true,
        friendship: updated,
      });
      return;
    }

    const [updated, reciprocal] = await completeAcceptedFriendshipTx(row.id, userId, friendId);

    void recordAndNotifyNewFriendship(userId, friendId);

    res.json({
      acceptedRequest: updated,
      reciprocal,
    });
  } catch (err) {
    logError('friend', err);
    res.status(500).json({ error: 'Error al aceptar la solicitud.' });
  }
}

export async function parentApproveFriendRequest(req: Request, res: Response): Promise<void> {
  const parsed = parentApproveFriendBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }
  const { userId, friendId, parentId } = parsed.data;

  const auth = req.auth;
  if (!auth || auth.kind !== 'parent' || auth.parentId !== parentId) {
    res.status(403).json({ error: 'El parentId no coincide con tu sesión de tutor.' });
    return;
  }

  try {
    const row = await prisma.friend.findUnique({
      where: {
        userId_friendId: { userId, friendId },
      },
    });

    if (!row || row.status !== FriendStatus.AWAITING_PARENT) {
      res.status(404).json({
        error:
          'No hay solicitud en espera de aprobación parental con ese par userId (remitente) / friendId (destinatario).',
      });
      return;
    }

    if (!row.requiresParentApproval) {
      res.status(400).json({ error: 'Esta solicitud no requiere aprobación del padre o tutor.' });
      return;
    }

    const [parentRecord, recipientChild] = await Promise.all([
      prisma.parent.findUnique({ where: { id: parentId }, select: { id: true } }),
      prisma.user.findUnique({ where: { id: friendId }, select: { id: true, parentId: true } }),
    ]);

    if (!parentRecord) {
      res.status(403).json({ error: 'parentId no corresponde a un padre o tutor registrado.' });
      return;
    }
    if (!recipientChild || recipientChild.parentId !== parentId) {
      res.status(403).json({
        error:
          'Solo el padre o tutor vinculado al usuario destinatario (friendId) puede aprobar esta solicitud.',
      });
      return;
    }

    const senderCheck = await assertAllowFriends(userId);
    if (!senderCheck.ok) {
      res.status(403).json({ error: senderCheck.message });
      return;
    }
    const recipientCheck = await assertAllowFriends(friendId);
    if (!recipientCheck.ok) {
      res.status(403).json({ error: recipientCheck.message });
      return;
    }

    if (await isFriendshipForbiddenByParentBlock(userId, friendId)) {
      res.status(403).json({ error: 'Un tutor bloqueó la amistad entre estos usuarios.' });
      return;
    }

    const [updated, reciprocal] = await completeAcceptedFriendshipTx(row.id, userId, friendId);

    void recordAndNotifyNewFriendship(userId, friendId);

    res.json({
      acceptedRequest: updated,
      reciprocal,
    });
  } catch (err) {
    logError('friend', err);
    res.status(500).json({ error: 'Error al aprobar la amistad.' });
  }
}

/** El tutor rechaza una solicitud que ya fue aceptada por el menor y estaba en espera de aprobación parental. */
export async function parentRejectFriendAwaiting(req: Request, res: Response): Promise<void> {
  const parsed = parentApproveFriendBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }
  const { userId, friendId, parentId } = parsed.data;

  const auth = req.auth;
  if (!auth || auth.kind !== 'parent' || auth.parentId !== parentId) {
    res.status(403).json({ error: 'El parentId no coincide con tu sesión de tutor.' });
    return;
  }

  try {
    const row = await prisma.friend.findUnique({
      where: {
        userId_friendId: { userId, friendId },
      },
    });

    if (!row || row.status !== FriendStatus.AWAITING_PARENT) {
      res.status(404).json({
        error:
          'No hay solicitud en espera de aprobación parental con ese par userId (remitente) / friendId (destinatario).',
      });
      return;
    }

    const recipientChild = await prisma.user.findUnique({
      where: { id: friendId },
      select: { id: true, parentId: true },
    });
    if (!recipientChild || recipientChild.parentId !== parentId) {
      res.status(403).json({
        error:
          'Solo el padre o tutor vinculado al usuario destinatario (friendId) puede rechazar esta solicitud.',
      });
      return;
    }

    const updated = await prisma.friend.update({
      where: { id: row.id },
      data: { status: FriendStatus.REJECTED, parentApproved: false },
    });

    res.json(updated);
  } catch (err) {
    logError('friend.parentReject', err);
    res.status(500).json({ error: 'Error al rechazar la solicitud.' });
  }
}

export async function rejectFriendRequest(req: Request, res: Response): Promise<void> {
  const parsed = friendUserPairSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }
  const { userId, friendId } = parsed.data;

  try {
    const row = await prisma.friend.findUnique({
      where: {
        userId_friendId: { userId, friendId },
      },
    });

    if (
      !row ||
      (row.status !== FriendStatus.PENDING && row.status !== FriendStatus.AWAITING_PARENT)
    ) {
      res.status(404).json({
        error:
          'No hay solicitud pendiente con ese par userId (remitente) / friendId (destinatario).',
      });
      return;
    }

    const updated = await prisma.friend.update({
      where: { id: row.id },
      data: { status: FriendStatus.REJECTED, parentApproved: false },
    });

    res.json(updated);
  } catch (err) {
    logError('friend', err);
    res.status(500).json({ error: 'Error al rechazar la solicitud.' });
  }
}

export async function getAcceptedFriends(req: Request, res: Response): Promise<void> {
  const idParsed = parseUuidParam(req.params.userId);
  if (!idParsed.ok) {
    res.status(400).json({ error: idParsed.error });
    return;
  }
  const userId = idParsed.uuid;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado.' });
      return;
    }

    const rows = await prisma.friend.findMany({
      where: {
        status: FriendStatus.ACCEPTED,
        OR: [{ userId }, { friendId: userId }],
      },
      orderBy: { createdAt: 'desc' },
    });

    const seenOther = new Set<string>();
    const dedupedRows: typeof rows = [];
    for (const r of rows) {
      const otherId = r.userId === userId ? r.friendId : r.userId;
      if (seenOther.has(otherId)) continue;
      seenOther.add(otherId);
      dedupedRows.push(r);
    }

    const uniqueIds = dedupedRows.map((r) => (r.userId === userId ? r.friendId : r.userId));

    const users = await prisma.user.findMany({
      where: { id: { in: uniqueIds } },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        realName: true,
      },
    });
    const byId = new Map(users.map((u) => [u.id, u]));

    const friends = dedupedRows.map((r) => {
      const otherId = r.userId === userId ? r.friendId : r.userId;
      return {
        friendshipId: r.id,
        since: r.createdAt.toISOString(),
        friend: byId.get(otherId) ?? { id: otherId },
      };
    });

    res.json({ userId, friends });
  } catch (err) {
    logError('friend', err);
    res.status(500).json({ error: 'Error al listar amigos.' });
  }
}

export async function getPendingFriendRequests(req: Request, res: Response): Promise<void> {
  const idParsed = parseUuidParam(req.params.userId);
  if (!idParsed.ok) {
    res.status(400).json({ error: idParsed.error });
    return;
  }
  const userId = idParsed.uuid;

  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) {
      res.status(404).json({ error: 'Usuario no encontrado.' });
      return;
    }

    const rows = await prisma.friend.findMany({
      where: {
        friendId: userId,
        status: FriendStatus.PENDING,
      },
      orderBy: { createdAt: 'desc' },
    });

    const requesterIds = [...new Set(rows.map((r) => r.userId))];
    const requesters = await prisma.user.findMany({
      where: { id: { in: requesterIds } },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        realName: true,
      },
    });
    const byId = new Map(requesters.map((u) => [u.id, u]));

    const requests = rows.map((r) => ({
      friendshipId: r.id,
      createdAt: r.createdAt.toISOString(),
      requiresParentApproval: r.requiresParentApproval,
      fromUser: byId.get(r.userId) ?? { id: r.userId },
    }));

    res.json({ userId, requests });
  } catch (err) {
    logError('friend', err);
    res.status(500).json({ error: 'Error al listar solicitudes pendientes.' });
  }
}
