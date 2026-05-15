import type { Request, Response } from 'express';
import { FriendStatus } from '@prisma/client';
import { getChildIdsWithParentChatDisabled } from '../lib/chatAccess';
import { executeChildOutgoingChat } from '../services/chat.service';
import { areAcceptedFriends } from '../lib/chatFriendship';
import { ensureChatForUsers, findChatById, peerUserIdFromChat } from '../lib/chatThreadRegistry';
import { prisma } from '../lib/prisma';
import { assertAllowChat } from '../lib/parentalRestrictions';

const THREAD_PAGE_DEFAULT = 60;
const THREAD_PAGE_MAX = 100;

function parsePeerId(req: Request): string {
  return String(req.params.peerId ?? '').trim();
}

function parseBefore(req: Request): Date | undefined {
  const raw = req.query.before;
  if (raw == null || raw === '') return undefined;
  const s = Array.isArray(raw) ? String(raw[0]) : String(raw);
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function parseThreadTake(req: Request): number {
  const raw = req.query.limit;
  if (raw == null || raw === '') return THREAD_PAGE_DEFAULT;
  const s = Array.isArray(raw) ? String(raw[0]) : String(raw);
  const n = Number(s);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) return THREAD_PAGE_DEFAULT;
  return Math.min(THREAD_PAGE_MAX, n);
}

export async function postChatMessage(req: Request, res: Response): Promise<void> {
  const auth = req.auth;
  if (auth?.kind !== 'child') {
    res.status(401).json({ error: 'No autenticado.' });
    return;
  }
  const senderId = auth.userId;

  if (req.body === null || typeof req.body !== 'object') {
    res.status(400).json({ error: 'El cuerpo debe ser un objeto JSON.' });
    return;
  }
  const b = req.body as Record<string, unknown>;
  const recipientId = typeof b.recipientId === 'string' ? b.recipientId.trim() : '';
  const text = typeof b.text === 'string' ? b.text : '';

  if (!recipientId) {
    res.status(400).json({ error: 'recipientId es obligatorio.' });
    return;
  }

  const result = await executeChildOutgoingChat(senderId, recipientId, text);
  if (!result.ok) {
    res
      .status(result.status)
      .json({ error: result.error, ...(result.code ? { code: result.code } : {}) });
    return;
  }
  const { row } = result;

  res.status(201).json({
    id: row.id,
    body: row.body,
    blocked: row.blocked,
    blockReason: row.blockReason,
    moderationFlagged: row.moderationFlagged,
    createdAt: row.createdAt.toISOString(),
  });
}

/**
 * POST /api/messages — enviar mensaje usando `chatId` o `recipientId` (uno de los dos).
 */
export async function postRestMessage(req: Request, res: Response): Promise<void> {
  const auth = req.auth;
  if (auth?.kind !== 'child') {
    res.status(401).json({ error: 'No autenticado.' });
    return;
  }
  const senderId = auth.userId;

  if (req.body === null || typeof req.body !== 'object') {
    res.status(400).json({ error: 'El cuerpo debe ser un objeto JSON.' });
    return;
  }
  const b = req.body as Record<string, unknown>;
  const text = typeof b.text === 'string' ? b.text : '';
  const chatId = typeof b.chatId === 'string' ? b.chatId.trim() : '';
  const recipientIdRaw = typeof b.recipientId === 'string' ? b.recipientId.trim() : '';

  if (chatId && recipientIdRaw) {
    res.status(400).json({ error: 'Enviá solo chatId o solo recipientId, no ambos.' });
    return;
  }
  if (!chatId && !recipientIdRaw) {
    res.status(400).json({ error: 'Incluí chatId o recipientId, y text.' });
    return;
  }

  let recipientId: string;
  if (chatId) {
    const chat = await findChatById(chatId);
    if (!chat) {
      res.status(404).json({ error: 'Chat no encontrado.' });
      return;
    }
    const peer = peerUserIdFromChat(chat, senderId);
    if (!peer) {
      res.status(403).json({ error: 'No participás en este chat.' });
      return;
    }
    recipientId = peer;
  } else {
    recipientId = recipientIdRaw;
  }

  const result = await executeChildOutgoingChat(senderId, recipientId, text);
  if (!result.ok) {
    res
      .status(result.status)
      .json({ error: result.error, ...(result.code ? { code: result.code } : {}) });
    return;
  }
  const { row } = result;
  const thread = await ensureChatForUsers(senderId, recipientId);

  res.status(201).json({
    chatId: thread.id,
    id: row.id,
    body: row.body,
    blocked: row.blocked,
    blockReason: row.blockReason,
    moderationFlagged: row.moderationFlagged,
    createdAt: row.createdAt.toISOString(),
  });
}

type ConversationSummary = {
  peer: { id: string; username: string; realName: string; avatarUrl: string | null };
  lastMessage: {
    id: string;
    createdAt: string;
    fromSelf: boolean;
    blocked: boolean;
    moderationFlagged: boolean;
    preview: string;
  };
};

async function loadChildConversationSummaries(
  userId: string,
): Promise<ConversationSummary[] | { error: string }> {
  const allow = await assertAllowChat(userId);
  if (!allow.ok) {
    return { error: allow.message };
  }

  const recent = await prisma.chatMessage.findMany({
    where: {
      OR: [{ senderId: userId }, { recipientId: userId, blocked: false }],
    },
    orderBy: { createdAt: 'desc' },
    take: 400,
    select: {
      id: true,
      senderId: true,
      recipientId: true,
      body: true,
      blocked: true,
      moderationFlagged: true,
      createdAt: true,
    },
  });

  const peerToLatest = new Map<string, (typeof recent)[0]>();
  for (const m of recent) {
    const peerId = m.senderId === userId ? m.recipientId : m.senderId;
    if (!peerToLatest.has(peerId)) {
      peerToLatest.set(peerId, m);
    }
  }

  const peerIds = Array.from(peerToLatest.keys());
  if (peerIds.length === 0) {
    return [];
  }

  const acceptedRows = await prisma.friend.findMany({
    where: {
      status: FriendStatus.ACCEPTED,
      OR: [
        { userId: userId, friendId: { in: peerIds } },
        { friendId: userId, userId: { in: peerIds } },
      ],
    },
    select: { userId: true, friendId: true },
  });
  const acceptedPeerIds = new Set<string>();
  for (const r of acceptedRows) {
    acceptedPeerIds.add(r.userId === userId ? r.friendId : r.userId);
  }

  let filteredPeerIds = peerIds.filter((id) => acceptedPeerIds.has(id));
  const chatDisabledPeers = await getChildIdsWithParentChatDisabled(filteredPeerIds);
  filteredPeerIds = filteredPeerIds.filter((id) => !chatDisabledPeers.has(id));
  if (filteredPeerIds.length === 0) {
    return [];
  }

  const users = await prisma.user.findMany({
    where: { id: { in: filteredPeerIds } },
    select: { id: true, username: true, realName: true, avatarUrl: true },
  });
  const userById = new Map(users.map((u) => [u.id, u]));

  const conversations: ConversationSummary[] = [];
  for (const pid of filteredPeerIds) {
    const m = peerToLatest.get(pid);
    const peer = userById.get(pid);
    if (!m || !peer) continue;
    const fromSelf = m.senderId === userId;
    const preview =
      m.blocked && fromSelf
        ? 'No se entregó (filtro o política)'
        : m.body.length > 140
          ? `${m.body.slice(0, 137)}…`
          : m.body;
    conversations.push({
      peer: {
        id: peer.id,
        username: peer.username,
        realName: peer.realName,
        avatarUrl: peer.avatarUrl,
      },
      lastMessage: {
        id: m.id,
        createdAt: m.createdAt.toISOString(),
        fromSelf,
        blocked: m.blocked,
        moderationFlagged: m.moderationFlagged,
        preview,
      },
    });
  }

  conversations.sort(
    (a, b) =>
      new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime(),
  );

  return conversations;
}

export async function listChatConversations(req: Request, res: Response): Promise<void> {
  const auth = req.auth;
  if (auth?.kind !== 'child') {
    res.status(401).json({ error: 'No autenticado.' });
    return;
  }
  const userId = auth.userId;

  const summaries = await loadChildConversationSummaries(userId);
  if (!Array.isArray(summaries)) {
    res.status(403).json({ error: summaries.error });
    return;
  }

  res.json({ conversations: summaries });
}

/**
 * GET /api/chats/:userId — listar hilos con `chatId` (solo el propio usuario autenticado).
 */
export async function getRestChatsByUserId(req: Request, res: Response): Promise<void> {
  const auth = req.auth;
  if (auth?.kind !== 'child') {
    res.status(401).json({ error: 'No autenticado.' });
    return;
  }
  const paramUserId = String(req.params.userId ?? '').trim();
  if (!paramUserId || paramUserId !== auth.userId) {
    res.status(403).json({ error: 'Solo podés listar tus propios chats.' });
    return;
  }

  const summaries = await loadChildConversationSummaries(auth.userId);
  if (!Array.isArray(summaries)) {
    res.status(403).json({ error: summaries.error });
    return;
  }

  const chats = await Promise.all(
    summaries.map(async (s) => {
      const thread = await ensureChatForUsers(auth.userId, s.peer.id);
      return {
        id: thread.id,
        createdAt: thread.createdAt.toISOString(),
        peer: s.peer,
        lastMessage: s.lastMessage,
      };
    }),
  );

  res.json({ chats });
}

async function loadPeerThreadPayload(
  userId: string,
  peerId: string,
  before: Date | undefined,
  take: number,
): Promise<
  | {
      messages: {
        id: string;
        senderId: string;
        recipientId: string;
        body: string;
        blocked: boolean;
        moderationFlagged: boolean;
        createdAt: string;
      }[];
      hasMore: boolean;
    }
  | { error: string; status: number }
> {
  const allowSelf = await assertAllowChat(userId);
  if (!allowSelf.ok) {
    return { status: 403, error: allowSelf.message };
  }

  const allowPeer = await assertAllowChat(peerId);
  if (!allowPeer.ok) {
    return { status: 403, error: 'El chat no está disponible con ese usuario.' };
  }

  if (!(await areAcceptedFriends(userId, peerId))) {
    return { status: 403, error: 'Solo podés ver el chat con amigos aceptados.' };
  }

  const rows = await prisma.chatMessage.findMany({
    where: {
      AND: [
        {
          OR: [
            { senderId: userId, recipientId: peerId },
            { senderId: peerId, recipientId: userId, blocked: false },
          ],
        },
        before ? { createdAt: { lt: before } } : {},
      ],
    },
    orderBy: { createdAt: 'desc' },
    take,
    select: {
      id: true,
      senderId: true,
      recipientId: true,
      body: true,
      blocked: true,
      moderationFlagged: true,
      createdAt: true,
    },
  });

  const chronological = [...rows].reverse();

  return {
    messages: chronological.map((m) => ({
      id: m.id,
      senderId: m.senderId,
      recipientId: m.recipientId,
      body: m.body,
      blocked: m.blocked,
      moderationFlagged: m.moderationFlagged,
      createdAt: m.createdAt.toISOString(),
    })),
    hasMore: rows.length === take,
  };
}

export async function getChatThread(req: Request, res: Response): Promise<void> {
  const auth = req.auth;
  if (auth?.kind !== 'child') {
    res.status(401).json({ error: 'No autenticado.' });
    return;
  }
  const userId = auth.userId;
  const peerId = parsePeerId(req);
  if (!peerId) {
    res.status(400).json({ error: 'peerId inválido.' });
    return;
  }

  const before = parseBefore(req);
  const take = THREAD_PAGE_DEFAULT;
  const payload = await loadPeerThreadPayload(userId, peerId, before, take);
  if ('error' in payload) {
    res.status(payload.status).json({ error: payload.error });
    return;
  }
  res.json(payload);
}

/**
 * GET /api/messages/:chatId — mensajes del hilo identificado por `Chat.id`.
 */
export async function getRestMessagesByChatId(req: Request, res: Response): Promise<void> {
  const auth = req.auth;
  if (auth?.kind !== 'child') {
    res.status(401).json({ error: 'No autenticado.' });
    return;
  }
  const userId = auth.userId;
  const chatId = String(req.params.chatId ?? '').trim();
  if (!chatId) {
    res.status(400).json({ error: 'chatId inválido.' });
    return;
  }

  const chat = await findChatById(chatId);
  if (!chat) {
    res.status(404).json({ error: 'Chat no encontrado.' });
    return;
  }
  const peerId = peerUserIdFromChat(chat, userId);
  if (!peerId) {
    res.status(403).json({ error: 'No participás en este chat.' });
    return;
  }

  const before = parseBefore(req);
  const take = parseThreadTake(req);
  const payload = await loadPeerThreadPayload(userId, peerId, before, take);
  if ('error' in payload) {
    res.status(payload.status).json({ error: payload.error });
    return;
  }

  res.json({ chatId, ...payload });
}
