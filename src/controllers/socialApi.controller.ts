import type { Request, Response } from 'express';
import { FriendStatus, StudyGroupRole } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { logError } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { formatZodError, uuidSchema } from '../lib/validation/schemas';

function requireChild(req: Request, res: Response): string | null {
  const auth = req.auth;
  if (!auth || auth.kind !== 'child') {
    res.status(403).json({ error: 'Solo menores autenticados.' });
    return null;
  }
  return auth.userId;
}

/** GET /api/social/friends */
export async function getSocialFriends(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;

  try {
    const rows = await prisma.friend.findMany({
      where: {
        OR: [
          { userId, status: FriendStatus.ACCEPTED },
          { friendId: userId, status: FriendStatus.ACCEPTED },
        ],
      },
    });
    const peerIds = new Set<string>();
    for (const f of rows) {
      peerIds.add(f.userId === userId ? f.friendId : f.userId);
    }
    const users = await prisma.user.findMany({
      where: { id: { in: [...peerIds] } },
      select: { id: true, username: true, realName: true, avatarUrl: true, level: true },
    });
    res.json({ friends: users });
  } catch (e) {
    logError('socialApi.friends', e);
    res.status(500).json({ error: 'Error al listar amigos.' });
  }
}

const friendRequestSchema = z.object({
  friendUserId: uuidSchema,
});

/** POST /api/social/friends/request */
export async function postSocialFriendRequest(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;

  const parsed = friendRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }

  req.body = { userId, friendId: parsed.data.friendUserId };
  const { sendFriendRequest } = await import('./friend.controller');
  await sendFriendRequest(req, res);
}

const acceptRejectSchema = z.object({
  otherUserId: uuidSchema,
});

/** PUT /api/social/friends/requests/:requestId/accept */
export async function putAcceptFriendRequestRest(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;

  const requestId = req.params.requestId?.trim();
  const parsed = acceptRejectSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }

  const row = await prisma.friend.findFirst({
    where: { id: requestId, friendId: userId, status: FriendStatus.PENDING },
    select: { userId: true, friendId: true },
  });
  if (!row) {
    res.status(404).json({ error: 'Solicitud no encontrada.' });
    return;
  }
  if (row.userId !== parsed.data.otherUserId) {
    res.status(400).json({ error: 'otherUserId no coincide con la solicitud.' });
    return;
  }

  req.body = { userId: row.userId, friendId: row.friendId };
  const { acceptFriendRequest } = await import('./friend.controller');
  await acceptFriendRequest(req, res);
}

/** PUT /api/social/friends/requests/:requestId/reject */
export async function putRejectFriendRequestRest(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;

  const requestId = req.params.requestId?.trim();
  const parsed = acceptRejectSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }

  const row = await prisma.friend.findFirst({
    where: { id: requestId, friendId: userId, status: FriendStatus.PENDING },
    select: { userId: true, friendId: true },
  });
  if (!row) {
    res.status(404).json({ error: 'Solicitud no encontrada.' });
    return;
  }
  if (row.userId !== parsed.data.otherUserId) {
    res.status(400).json({ error: 'otherUserId no coincide con la solicitud.' });
    return;
  }

  req.body = { userId: row.userId, friendId: row.friendId };
  const { rejectFriendRequest } = await import('./friend.controller');
  await rejectFriendRequest(req, res);
}

/** DELETE /api/social/friends/:friendId */
export async function deleteSocialFriend(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;

  const friendId = req.params.friendId?.trim();
  if (!friendId) {
    res.status(400).json({ error: 'friendId inválido.' });
    return;
  }

  try {
    await prisma.friend.deleteMany({
      where: {
        OR: [
          { userId, friendId },
          { userId: friendId, friendId: userId },
        ],
      },
    });
    res.status(204).send();
  } catch (e) {
    logError('socialApi.deleteFriend', e);
    res.status(500).json({ error: 'Error al eliminar amigo.' });
  }
}

/** GET /api/social/friends/recommendations */
export async function getFriendRecommendations(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;

  try {
    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { parentId: true, age: true },
    });
    if (!me) {
      res.status(404).json({ error: 'Usuario no encontrado.' });
      return;
    }
    const candidates = await prisma.user.findMany({
      where: {
        type: 'minor',
        status: 'active',
        parentId: me.parentId,
        id: { not: userId },
      },
      take: 10,
      select: { id: true, username: true, realName: true, avatarUrl: true, age: true },
    });
    res.json({ suggestions: candidates });
  } catch (e) {
    logError('socialApi.recommendations', e);
    res.status(500).json({ error: 'Error al sugerir amigos.' });
  }
}

const studyGroupCreateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional(),
  maxMembers: z.coerce.number().int().min(2).max(50).optional(),
  isOpen: z.boolean().optional(),
});

/** GET /api/social/study-groups */
export async function listStudyGroups(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;

  try {
    const memberships = await prisma.studyGroupMember.findMany({
      where: { userId },
      include: { group: true },
    });
    res.json({ groups: memberships.map((m) => m.group) });
  } catch (e) {
    logError('socialApi.listStudyGroups', e);
    res.status(500).json({ error: 'Error al listar grupos.' });
  }
}

/** POST /api/social/study-groups */
export async function postCreateStudyGroup(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;

  const parsed = studyGroupCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }

  try {
    const inviteCode = randomBytes(4).toString('hex').toUpperCase();
    const group = await prisma.studyGroup.create({
      data: {
        name: parsed.data.name,
        description: parsed.data.description ?? '',
        ownerUserId: userId,
        inviteCode,
        maxMembers: parsed.data.maxMembers ?? 12,
        isOpen: parsed.data.isOpen ?? true,
      },
    });
    await prisma.studyGroupMember.create({
      data: { groupId: group.id, userId, role: StudyGroupRole.OWNER },
    });
    res.status(201).json({ group });
  } catch (e) {
    logError('socialApi.createStudyGroup', e);
    res.status(500).json({ error: 'Error al crear grupo.' });
  }
}

/** GET /api/social/study-groups/:groupId */
export async function getStudyGroupDetail(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;

  const groupId = req.params.groupId?.trim();
  if (!groupId) {
    res.status(400).json({ error: 'groupId inválido.' });
    return;
  }

  try {
    const membership = await prisma.studyGroupMember.findFirst({
      where: { groupId, userId },
      include: {
        group: {
          include: {
            members: {
              include: { user: { select: { id: true, username: true, avatarUrl: true } } },
            },
          },
        },
      },
    });
    if (!membership) {
      res.status(403).json({ error: 'No pertenecés a este grupo.' });
      return;
    }
    res.json({ group: membership.group });
  } catch (e) {
    logError('socialApi.studyGroupDetail', e);
    res.status(500).json({ error: 'Error al cargar grupo.' });
  }
}

/** POST /api/social/study-groups/:groupId/join */
export async function postJoinStudyGroup(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;

  const groupId = req.params.groupId?.trim();
  if (!groupId) {
    res.status(400).json({ error: 'groupId inválido.' });
    return;
  }

  try {
    const group = await prisma.studyGroup.findUnique({
      where: { id: groupId },
      include: { _count: { select: { members: true } } },
    });
    if (!group || !group.isOpen) {
      res.status(404).json({ error: 'Grupo no disponible.' });
      return;
    }
    if (group._count.members >= group.maxMembers) {
      res.status(409).json({ error: 'Grupo lleno.' });
      return;
    }
    await prisma.studyGroupMember.upsert({
      where: { groupId_userId: { groupId, userId } },
      create: { groupId, userId, role: StudyGroupRole.MEMBER },
      update: {},
    });
    res.json({ ok: true });
  } catch (e) {
    logError('socialApi.joinStudyGroup', e);
    res.status(500).json({ error: 'Error al unirse al grupo.' });
  }
}

/** POST /api/social/study-groups/:groupId/leave */
export async function postLeaveStudyGroup(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;

  const groupId = req.params.groupId?.trim();
  if (!groupId) {
    res.status(400).json({ error: 'groupId inválido.' });
    return;
  }

  try {
    await prisma.studyGroupMember.deleteMany({ where: { groupId, userId } });
    res.json({ ok: true });
  } catch (e) {
    logError('socialApi.leaveStudyGroup', e);
    res.status(500).json({ error: 'Error al salir del grupo.' });
  }
}

/** GET /api/social/messages — conversaciones recientes (Chat 1:1) */
export async function getSocialConversations(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;

  try {
    const chats = await prisma.chat.findMany({
      where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const peerIds = chats.map((c) => (c.user1Id === userId ? c.user2Id : c.user1Id));
    const users = await prisma.user.findMany({
      where: { id: { in: peerIds } },
      select: { id: true, username: true, realName: true, avatarUrl: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));
    res.json({
      conversations: chats.map((c) => ({
        chatId: c.id,
        peer: byId.get(c.user1Id === userId ? c.user2Id : c.user1Id),
      })),
    });
  } catch (e) {
    logError('socialApi.conversations', e);
    res.status(500).json({ error: 'Error al listar conversaciones.' });
  }
}

/** GET /api/social/messages/:peerUserId */
export async function getSocialMessagesWithUser(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;

  const peerUserId = req.params.userId?.trim();
  if (!peerUserId) {
    res.status(400).json({ error: 'userId inválido.' });
    return;
  }

  try {
    const messages = await prisma.chatMessage.findMany({
      where: {
        OR: [
          { senderId: userId, recipientId: peerUserId },
          { senderId: peerUserId, recipientId: userId },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 80,
    });
    res.json({ messages: messages.reverse() });
  } catch (e) {
    logError('socialApi.messagesWithUser', e);
    res.status(500).json({ error: 'Error al cargar mensajes.' });
  }
}

const predefinedMessageSchema = z.object({
  peerUserId: uuidSchema,
  template: z.enum(['hello', 'study', 'thanks']),
});

/** POST /api/social/messages */
export async function postSocialPredefinedMessage(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;

  const parsed = predefinedMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }

  const bodies: Record<string, string> = {
    hello: '¡Hola! ¿Cómo estás?',
    study: '¿Estudiamos juntos un rato?',
    thanks: '¡Gracias!',
  };

  req.body = {
    recipientId: parsed.data.peerUserId,
    text: bodies[parsed.data.template],
  };

  const { postChatMessage } = await import('./chat.controller');
  await postChatMessage(req, res);
}
