import { ContentReportTarget } from "@prisma/client";
import { sendExpoPushToToken } from "./expoPushSend";
import { logError } from "./logger";
import { prisma } from "./prisma";

function displayLabel(u: { username: string; realName: string }): string {
  return u.realName?.trim() || `@${u.username}`;
}

const KIND_SUSPICIOUS = "SUSPICIOUS_ACTIVITY";
const KIND_SUSPICIOUS_MEDIA = "SUSPICIOUS_MEDIA";
const KIND_CHAT_FILTER = "CHAT_FILTER_ALERT";

function blockReasonLabel(reason: string | null): string {
  if (!reason) return "";
  switch (reason) {
    case "PERSONAL_DATA":
      return " (datos personales)";
    case "BAD_WORDS":
      return " (lenguaje)";
    case "CONTACT_OR_LINK":
      return " (enlace o contacto)";
    case "EMPTY":
      return "";
    default:
      return ` (${reason})`;
  }
}

/**
 * Tras crear una denuncia: avisa a tutores de menores involucrados (feed + push).
 */
export async function recordAndNotifyParentsForNewContentReport(params: {
  targetType: ContentReportTarget;
  postId: string | null;
  reportedUserId: string | null;
  chatMessageId: string | null;
  reporterUserId: string;
}): Promise<void> {
  const { targetType, postId, reportedUserId, chatMessageId, reporterUserId } = params;
  const title = "Actividad revisable";
  try {
    if (targetType === ContentReportTarget.POST && postId) {
      const post = await prisma.post.findUnique({
        where: { id: postId },
        select: {
          id: true,
          user: { select: { id: true, username: true, realName: true, parentId: true } },
        },
      });
      if (!post) return;
      const u = post.user;
      const body = `Denunciaron una publicación de ${displayLabel(u)} (@${u.username}). Revisá moderación en la app.`;
      await prisma.parentFamilyEvent.create({
        data: {
          parentId: u.parentId,
          kind: KIND_SUSPICIOUS,
          childId: u.id,
          peerUserId: reporterUserId,
          title,
          body,
        },
      });
      const parent = await prisma.parent.findUnique({
        where: { id: u.parentId },
        select: { expoPushToken: true },
      });
      if (parent?.expoPushToken) {
        void sendExpoPushToToken(parent.expoPushToken, title, body, {
          kind: KIND_SUSPICIOUS,
          childId: u.id,
          reportTarget: "POST",
          postId: post.id,
        });
      }
      return;
    }

    if (targetType === ContentReportTarget.USER && reportedUserId) {
      const u = await prisma.user.findUnique({
        where: { id: reportedUserId },
        select: { id: true, username: true, realName: true, parentId: true },
      });
      if (!u) return;
      const body = `Denunciaron el perfil de ${displayLabel(u)} (@${u.username}). Revisá moderación en la app.`;
      await prisma.parentFamilyEvent.create({
        data: {
          parentId: u.parentId,
          kind: KIND_SUSPICIOUS,
          childId: u.id,
          peerUserId: reporterUserId,
          title,
          body,
        },
      });
      const parent = await prisma.parent.findUnique({
        where: { id: u.parentId },
        select: { expoPushToken: true },
      });
      if (parent?.expoPushToken) {
        void sendExpoPushToToken(parent.expoPushToken, title, body, {
          kind: KIND_SUSPICIOUS,
          childId: u.id,
          reportTarget: "USER",
        });
      }
      return;
    }

    if (targetType === ContentReportTarget.CHAT_MESSAGE && chatMessageId) {
      const msg = await prisma.chatMessage.findUnique({
        where: { id: chatMessageId },
        select: {
          id: true,
          senderId: true,
          recipientId: true,
          sender: { select: { id: true, username: true, realName: true, parentId: true } },
          recipient: { select: { id: true, username: true, realName: true, parentId: true } },
        },
      });
      if (!msg) return;
      const s = msg.sender;
      const r = msg.recipient;

      if (s.parentId === r.parentId) {
        const body = `Denunciaron un mensaje entre ${displayLabel(s)} (@${s.username}) y ${displayLabel(r)} (@${r.username}). Revisá moderación en la app.`;
        await prisma.parentFamilyEvent.create({
          data: {
            parentId: s.parentId,
            kind: KIND_SUSPICIOUS,
            childId: s.id,
            peerUserId: r.id,
            title,
            body,
          },
        });
        const parent = await prisma.parent.findUnique({
          where: { id: s.parentId },
          select: { expoPushToken: true },
        });
        if (parent?.expoPushToken) {
          void sendExpoPushToToken(parent.expoPushToken, title, body, {
            kind: KIND_SUSPICIOUS,
            childId: s.id,
            peerUserId: r.id,
            reportTarget: "CHAT_MESSAGE",
            chatMessageId: msg.id,
          });
        }
        return;
      }

      const bodyForS = `Denunciaron un mensaje en el chat de ${displayLabel(s)} con ${displayLabel(r)} (@${r.username}). Revisá moderación en la app.`;
      const bodyForR = `Denunciaron un mensaje en el chat de ${displayLabel(r)} con ${displayLabel(s)} (@${s.username}). Revisá moderación en la app.`;

      await prisma.parentFamilyEvent.createMany({
        data: [
          {
            parentId: s.parentId,
            kind: KIND_SUSPICIOUS,
            childId: s.id,
            peerUserId: r.id,
            title,
            body: bodyForS,
          },
          {
            parentId: r.parentId,
            kind: KIND_SUSPICIOUS,
            childId: r.id,
            peerUserId: s.id,
            title,
            body: bodyForR,
          },
        ],
      });

      const parents = await prisma.parent.findMany({
        where: { id: { in: [s.parentId, r.parentId] } },
        select: { id: true, expoPushToken: true },
      });
      for (const p of parents) {
        if (!p.expoPushToken) continue;
        const body = p.id === s.parentId ? bodyForS : bodyForR;
        const childId = p.id === s.parentId ? s.id : r.id;
        const peerUserId = p.id === s.parentId ? r.id : s.id;
        void sendExpoPushToToken(p.expoPushToken, title, body, {
          kind: KIND_SUSPICIOUS,
          childId,
          peerUserId,
          reportTarget: "CHAT_MESSAGE",
          chatMessageId: msg.id,
        });
      }
    }
  } catch (e) {
    logError("parentSuspiciousNotify.contentReport", e);
  }
}

/**
 * Multimedia del post marcada por moderación automática: avisa al tutor del autor.
 */
export async function recordAndNotifyParentForModerationFlaggedPost(
  authorUserId: string,
  postId: string
): Promise<void> {
  try {
    const u = await prisma.user.findUnique({
      where: { id: authorUserId },
      select: { id: true, username: true, realName: true, parentId: true },
    });
    if (!u) return;

    const title = "Contenido marcado automáticamente";
    const body = `Una publicación de ${displayLabel(u)} (@${u.username}) fue marcada por posible contenido inapropiado. Revisá en la app.`;

    await prisma.parentFamilyEvent.create({
      data: {
        parentId: u.parentId,
        kind: KIND_SUSPICIOUS_MEDIA,
        childId: u.id,
        peerUserId: null,
        title,
        body,
      },
    });

    const parent = await prisma.parent.findUnique({
      where: { id: u.parentId },
      select: { expoPushToken: true },
    });
    if (parent?.expoPushToken) {
      void sendExpoPushToToken(parent.expoPushToken, title, body, {
        kind: KIND_SUSPICIOUS_MEDIA,
        childId: u.id,
        postId,
      });
    }
  } catch (e) {
    logError("parentSuspiciousNotify.moderationFlagged", e);
  }
}

/**
 * Mensaje bloqueado o marcado por el filtro de chat: evento en panel + push al tutor (según preferencias del menor).
 */
export async function recordAndNotifyParentsForChatFilterSignal(params: {
  messageId: string;
  senderId: string;
  recipientId: string;
  blocked: boolean;
  moderationFlagged: boolean;
  blockReason: string | null;
}): Promise<void> {
  const { messageId, senderId, recipientId, blocked, moderationFlagged, blockReason } = params;
  if (!blocked && !moderationFlagged) return;

  try {
    const [sender, recipient] = await Promise.all([
      prisma.user.findUnique({
        where: { id: senderId },
        select: { id: true, username: true, realName: true, parentId: true },
      }),
      prisma.user.findUnique({
        where: { id: recipientId },
        select: { id: true, username: true, realName: true, parentId: true },
      }),
    ]);
    if (!sender || !recipient) return;

    const [setS, setR] = await Promise.all([
      prisma.parentSettings.findUnique({
        where: { childId: sender.id },
        select: { notifyParentSuspiciousChat: true },
      }),
      prisma.parentSettings.findUnique({
        where: { childId: recipient.id },
        select: { notifyParentSuspiciousChat: true },
      }),
    ]);
    const wantS = setS?.notifyParentSuspiciousChat !== false;
    const wantR = setR?.notifyParentSuspiciousChat !== false;

    const title = "Mensaje de chat revisable";
    const reasonHint = blockReasonLabel(blockReason);

    const pushSound = "eduplay-push-chime.wav";
    const androidChannel = "default";
    const sendPush = (token: string | null, body: string, childId: string, peerUserId: string) => {
      if (!token) return;
      void sendExpoPushToToken(
        token,
        title,
        body,
        {
          kind: KIND_CHAT_FILTER,
          childId,
          peerUserId,
          chatMessageId: messageId,
        },
        { sound: pushSound, channelId: androidChannel }
      );
    };

    if (sender.parentId === recipient.parentId) {
      if (!wantS && !wantR) return;

      let body: string;
      if (blocked) {
        body = `Entre ${displayLabel(sender)} (@${sender.username}) y ${displayLabel(recipient)} (@${recipient.username}): mensaje no entregado por el filtro${reasonHint}. Revisá supervisión de chat.`;
      } else {
        body = `Mensaje entre ${displayLabel(sender)} (@${sender.username}) y ${displayLabel(recipient)} (@${recipient.username}) marcado para revisión (p. ej. enlace).`;
      }

      await prisma.parentFamilyEvent.create({
        data: {
          parentId: sender.parentId,
          kind: KIND_CHAT_FILTER,
          childId: sender.id,
          peerUserId: recipient.id,
          title,
          body,
        },
      });

      const parent = await prisma.parent.findUnique({
        where: { id: sender.parentId },
        select: { expoPushToken: true },
      });
      sendPush(parent?.expoPushToken ?? null, body, sender.id, recipient.id);
      return;
    }

    type EventRow = {
      parentId: string;
      childId: string;
      peerUserId: string;
      body: string;
    };
    const events: EventRow[] = [];

    if (blocked) {
      if (wantS) {
        events.push({
          parentId: sender.parentId,
          childId: sender.id,
          peerUserId: recipient.id,
          body: `${displayLabel(sender)} intentó enviar un mensaje a ${displayLabel(recipient)} (@${recipient.username}) que no se entregó por el filtro${reasonHint}.`,
        });
      }
      if (wantR) {
        events.push({
          parentId: recipient.parentId,
          childId: recipient.id,
          peerUserId: sender.id,
          body: `${displayLabel(sender)} (@${sender.username}) intentó enviar un mensaje filtrado hacia ${displayLabel(recipient)}.`,
        });
      }
    } else if (moderationFlagged) {
      if (wantS) {
        events.push({
          parentId: sender.parentId,
          childId: sender.id,
          peerUserId: recipient.id,
          body: `${displayLabel(sender)} envió un mensaje marcado para revisión hacia ${displayLabel(recipient)} (@${recipient.username}).`,
        });
      }
      if (wantR) {
        events.push({
          parentId: recipient.parentId,
          childId: recipient.id,
          peerUserId: sender.id,
          body: `${displayLabel(recipient)} recibió un mensaje marcado para revisión de ${displayLabel(sender)} (@${sender.username}).`,
        });
      }
    }

    if (events.length === 0) return;

    await prisma.parentFamilyEvent.createMany({
      data: events.map((e) => ({
        parentId: e.parentId,
        kind: KIND_CHAT_FILTER,
        childId: e.childId,
        peerUserId: e.peerUserId,
        title,
        body: e.body,
      })),
    });

    const parentIds = [...new Set(events.map((e) => e.parentId))];
    const parents = await prisma.parent.findMany({
      where: { id: { in: parentIds } },
      select: { id: true, expoPushToken: true },
    });
    const tokenById = new Map(parents.map((p) => [p.id, p.expoPushToken]));

    for (const e of events) {
      const token = tokenById.get(e.parentId) ?? null;
      sendPush(token, e.body, e.childId, e.peerUserId);
    }
  } catch (e) {
    logError("parentSuspiciousNotify.chatFilter", e);
  }
}
