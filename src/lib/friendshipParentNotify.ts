import { sendExpoPushToToken } from "./expoPushSend";
import { prisma } from "./prisma";

function displayLabel(u: { username: string; realName: string }): string {
  return u.realName?.trim() || `@${u.username}`;
}

async function childWantsNewContactNotify(childId: string): Promise<boolean> {
  const s = await prisma.parentSettings.findUnique({
    where: { childId },
    select: { notifyParentNewContact: true },
  });
  return s?.notifyParentNewContact !== false;
}

/**
 * Nueva solicitud PENDING: avisa a los tutores (remitente y destinatario, o uno si son hermanos).
 */
export async function recordAndNotifyFriendRequest(senderId: string, recipientId: string): Promise<void> {
  const [a, b] = await Promise.all([
    prisma.user.findUnique({
      where: { id: senderId },
      select: { id: true, username: true, realName: true, parentId: true },
    }),
    prisma.user.findUnique({
      where: { id: recipientId },
      select: { id: true, username: true, realName: true, parentId: true },
    }),
  ]);
  if (!a || !b) return;

  if (a.parentId === b.parentId) {
    const title = "Solicitud de amistad entre tus hijos";
    const body = `${displayLabel(a)} (@${a.username}) envió una solicitud a ${displayLabel(b)} (@${b.username}).`;
    await prisma.parentFamilyEvent.create({
      data: {
        parentId: a.parentId,
        kind: "FRIEND_REQUEST_SIBLINGS",
        childId: a.id,
        peerUserId: b.id,
        title,
        body,
      },
    });
    const parent = await prisma.parent.findUnique({
      where: { id: a.parentId },
      select: { expoPushToken: true },
    });
    if (parent?.expoPushToken) {
      void sendExpoPushToToken(parent.expoPushToken, title, body, {
        kind: "FRIEND_REQUEST",
        childId: a.id,
        peerUserId: b.id,
      });
    }
    return;
  }

  const title = "Nueva solicitud de amistad";
  const bodyRecipient = `${displayLabel(a)} (@${a.username}) quiere ser amigo de ${displayLabel(b)} (@${b.username}).`;
  const bodySender = `${displayLabel(a)} envió una solicitud de amistad a ${displayLabel(b)} (@${b.username}).`;

  await prisma.parentFamilyEvent.createMany({
    data: [
      {
        parentId: b.parentId,
        kind: "FRIEND_REQUEST",
        childId: b.id,
        peerUserId: a.id,
        title,
        body: bodyRecipient,
      },
      {
        parentId: a.parentId,
        kind: "FRIEND_REQUEST",
        childId: a.id,
        peerUserId: b.id,
        title,
        body: bodySender,
      },
    ],
  });

  const parents = await prisma.parent.findMany({
    where: { id: { in: [a.parentId, b.parentId] } },
    select: { id: true, expoPushToken: true },
  });

  for (const p of parents) {
    if (!p.expoPushToken) continue;
    const body = p.id === b.parentId ? bodyRecipient : bodySender;
    const childId = p.id === b.parentId ? b.id : a.id;
    const peerUserId = p.id === b.parentId ? a.id : b.id;
    void sendExpoPushToToken(p.expoPushToken, title, body, {
      kind: "FRIEND_REQUEST",
      childId,
      peerUserId,
    });
  }
}

/**
 * El destinatario aceptó pero falta OK del tutor: avisa al tutor del menor que aceptó.
 */
export async function recordAndNotifyFriendshipAwaitingParentApproval(
  senderId: string,
  recipientId: string
): Promise<void> {
  const [sender, recipient] = await Promise.all([
    prisma.user.findUnique({
      where: { id: senderId },
      select: { id: true, username: true, realName: true },
    }),
    prisma.user.findUnique({
      where: { id: recipientId },
      select: { id: true, username: true, realName: true, parentId: true },
    }),
  ]);
  if (!sender || !recipient) return;

  const title = "Amistad pendiente de tu aprobación";
  const body = `${displayLabel(recipient)} aceptó la solicitud de ${displayLabel(sender)} (@${sender.username}). Revisá y aprobá en la app.`;

  await prisma.parentFamilyEvent.create({
    data: {
      parentId: recipient.parentId,
      kind: "FRIEND_AWAITING_PARENT",
      childId: recipient.id,
      peerUserId: sender.id,
      title,
      body,
    },
  });

  const parent = await prisma.parent.findUnique({
    where: { id: recipient.parentId },
    select: { expoPushToken: true },
  });
  if (parent?.expoPushToken) {
    void sendExpoPushToToken(parent.expoPushToken, title, body, {
      kind: "FRIEND_AWAITING_PARENT",
      childId: recipient.id,
      peerUserId: sender.id,
    });
  }
}

/**
 * Tras amistad ACCEPTED: registra evento(s) en el panel del tutor y envía push si hay token.
 */
export async function recordAndNotifyNewFriendship(userIdA: string, userIdB: string): Promise<void> {
  const [a, b] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userIdA },
      select: { id: true, username: true, realName: true, parentId: true },
    }),
    prisma.user.findUnique({
      where: { id: userIdB },
      select: { id: true, username: true, realName: true, parentId: true },
    }),
  ]);
  if (!a || !b) return;

  const [wantA, wantB] = await Promise.all([childWantsNewContactNotify(a.id), childWantsNewContactNotify(b.id)]);

  if (a.parentId === b.parentId) {
    if (!wantA && !wantB) return;
    const title = "Amistad aceptada entre tus hijos";
    const body = `${displayLabel(a)} y ${displayLabel(b)} (@${b.username}) ahora son amigos.`;
    await prisma.parentFamilyEvent.create({
      data: {
        parentId: a.parentId,
        kind: "NEW_FRIEND_SIBLINGS",
        childId: a.id,
        peerUserId: b.id,
        title,
        body,
      },
    });
    const parent = await prisma.parent.findUnique({
      where: { id: a.parentId },
      select: { expoPushToken: true },
    });
    if (parent?.expoPushToken) {
      void sendExpoPushToToken(parent.expoPushToken, title, body, {
        kind: "NEW_FRIEND",
        childId: a.id,
        peerUserId: b.id,
      });
    }
    return;
  }

  const title = "Amistad aceptada";
  const bodyA = `${displayLabel(a)} y ${displayLabel(b)} (@${b.username}) son amigos.`;
  const bodyB = `${displayLabel(b)} y ${displayLabel(a)} (@${a.username}) son amigos.`;

  const eventRows: {
    parentId: string;
    kind: string;
    childId: string;
    peerUserId: string;
    title: string;
    body: string;
  }[] = [];
  if (wantA) {
    eventRows.push({
      parentId: a.parentId,
      kind: "NEW_FRIEND",
      childId: a.id,
      peerUserId: b.id,
      title,
      body: bodyA,
    });
  }
  if (wantB) {
    eventRows.push({
      parentId: b.parentId,
      kind: "NEW_FRIEND",
      childId: b.id,
      peerUserId: a.id,
      title,
      body: bodyB,
    });
  }
  if (eventRows.length === 0) return;

  await prisma.parentFamilyEvent.createMany({ data: eventRows });

  const parents = await prisma.parent.findMany({
    where: { id: { in: [a.parentId, b.parentId] } },
    select: { id: true, expoPushToken: true },
  });

  for (const p of parents) {
    if (!p.expoPushToken) continue;
    if (p.id === a.parentId && !wantA) continue;
    if (p.id === b.parentId && !wantB) continue;
    const body = p.id === a.parentId ? bodyA : bodyB;
    const childId = p.id === a.parentId ? a.id : b.id;
    const peerUserId = p.id === a.parentId ? b.id : a.id;
    void sendExpoPushToToken(p.expoPushToken, title, body, {
      kind: "NEW_FRIEND",
      childId,
      peerUserId,
    });
  }
}
