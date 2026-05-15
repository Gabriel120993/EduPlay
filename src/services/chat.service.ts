import { ContentFilterLevel } from '@prisma/client';
import { assertOutgoingChatAllowed } from '../lib/chatAccess';
import { filterOutgoingChatMessage } from '../lib/chatFilter';
import { notifyRecipientNewChatMessage } from '../lib/chatRecipientPush';
import { assertChatSendSafety } from '../lib/chatSafetyLimits';
import { recordAndNotifyParentsForChatFilterSignal } from '../lib/parentSuspiciousNotify';
import { prisma } from '../lib/prisma';

export const MAX_CHAT_LEN = 2000;

export type OutgoingChatRow = {
  id: string;
  body: string;
  blocked: boolean;
  blockReason: string | null;
  moderationFlagged: boolean;
  createdAt: Date;
};

export type SendChatFail = { ok: false; status: number; error: string; code?: string };

export async function executeChildOutgoingChat(
  senderId: string,
  recipientId: string,
  text: string,
): Promise<{ ok: true; row: OutgoingChatRow } | SendChatFail> {
  if (text.length > MAX_CHAT_LEN) {
    return {
      ok: false,
      status: 400,
      error: `El mensaje no puede superar ${MAX_CHAT_LEN} caracteres.`,
    };
  }

  const gate = await assertOutgoingChatAllowed(senderId, recipientId);
  if (!gate.ok) {
    return { ok: false, status: gate.status, error: gate.error };
  }

  const settings = await prisma.parentSettings.findUnique({
    where: { childId: senderId },
    select: { contentFilterLevel: true },
  });
  const level = settings?.contentFilterLevel ?? ContentFilterLevel.MEDIUM;
  const filtered = filterOutgoingChatMessage(text, level);

  if (!filtered.allowed && filtered.blockReason === 'EMPTY') {
    return { ok: false, status: 400, error: 'El mensaje no puede estar vacío.' };
  }

  const safety = assertChatSendSafety(senderId, text);
  if (!safety.ok) {
    return { ok: false, status: 429, error: safety.error, code: safety.code };
  }

  const row = await prisma.chatMessage.create({
    data: {
      senderId,
      recipientId,
      body: filtered.deliveredBody,
      blocked: !filtered.allowed,
      blockReason: filtered.blockReason,
      auditPlain: filtered.auditPlain,
      moderationFlagged: filtered.moderationFlagged,
    },
    select: {
      id: true,
      body: true,
      blocked: true,
      blockReason: true,
      moderationFlagged: true,
      createdAt: true,
    },
  });

  if (row.blocked || row.moderationFlagged) {
    void recordAndNotifyParentsForChatFilterSignal({
      messageId: row.id,
      senderId,
      recipientId,
      blocked: row.blocked,
      moderationFlagged: row.moderationFlagged,
      blockReason: row.blockReason,
    });
  }

  if (!row.blocked && row.body.trim().length > 0) {
    void notifyRecipientNewChatMessage({
      recipientId,
      senderId,
      messageId: row.id,
      body: row.body,
    });
  }

  return { ok: true, row };
}
