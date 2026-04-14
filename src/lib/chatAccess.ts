import { prisma } from "./prisma";
import { areAcceptedFriends } from "./chatFriendship";
import { assertAllowChat, assertAllowFriends } from "./parentalRestrictions";

export type ChatGateFailure = { ok: false; status: 400 | 403 | 404; error: string };

/**
 * Reglas para enviar mensajes:
 * 1. Amistad `ACCEPTED` entre ambos (cualquier dirección).
 * 2. Chat permitido por el tutor de cada menor (`ParentSettings.chatEnabled`).
 * 3. Función “amigos” permitida para ambos (`allowFriends`), coherente con el producto.
 */
export async function assertOutgoingChatAllowed(
  senderId: string,
  recipientId: string
): Promise<{ ok: true } | ChatGateFailure> {
  if (!recipientId) {
    return { ok: false, status: 400, error: "recipientId es obligatorio." };
  }
  if (recipientId === senderId) {
    return { ok: false, status: 400, error: "No podés chatear con vos mismo." };
  }

  const [recipientUser, friendsOk, senderChat, recipientChat, senderFriends, recipientFriends] =
    await Promise.all([
      prisma.user.findUnique({ where: { id: recipientId }, select: { id: true } }),
      areAcceptedFriends(senderId, recipientId),
      assertAllowChat(senderId),
      assertAllowChat(recipientId),
      assertAllowFriends(senderId),
      assertAllowFriends(recipientId),
    ]);

  if (!recipientUser) {
    return { ok: false, status: 404, error: "Destinatario no encontrado." };
  }
  if (!friendsOk) {
    return { ok: false, status: 403, error: "Solo podés chatear con amigos aceptados." };
  }
  if (!senderChat.ok) {
    return { ok: false, status: 403, error: senderChat.message };
  }
  if (!recipientChat.ok) {
    return { ok: false, status: 403, error: "El chat no está disponible para ese usuario." };
  }
  if (!senderFriends.ok) {
    return { ok: false, status: 403, error: senderFriends.message };
  }
  if (!recipientFriends.ok) {
    return { ok: false, status: 403, error: "El destinatario no puede recibir mensajes de amigos." };
  }

  return { ok: true };
}

/**
 * Menores con fila en `ParentSettings` y `chatEnabled === false`.
 * Sin fila en ajustes → se considera chat permitido (mismo criterio que `assertAllowChat`).
 */
export async function getChildIdsWithParentChatDisabled(childIds: string[]): Promise<Set<string>> {
  if (childIds.length === 0) return new Set();
  const rows = await prisma.parentSettings.findMany({
    where: { childId: { in: childIds }, chatEnabled: false },
    select: { childId: true },
  });
  return new Set(rows.map((r) => r.childId));
}
