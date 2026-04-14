import { sendExpoPushToToken } from "./expoPushSend";
import { prisma } from "./prisma";

const PREVIEW_MAX = 140;
const PUSH_SOUND = "eduplay-push-chime.wav";
const ANDROID_CHANNEL = "default";

function displayLabel(u: { username: string; realName: string }): string {
  return u.realName?.trim() || `@${u.username}`;
}

/**
 * Notifica al destinatario (menor) cuando recibe un mensaje de chat entregado.
 * Respeta `User.notificationsEnabled` y `expoPushToken`.
 */
export async function notifyRecipientNewChatMessage(params: {
  recipientId: string;
  senderId: string;
  messageId: string;
  body: string;
}): Promise<void> {
  const { recipientId, senderId, messageId, body } = params;
  const trimmed = body.trim();
  if (!trimmed) return;

  const [recipient, sender] = await Promise.all([
    prisma.user.findUnique({
      where: { id: recipientId },
      select: { expoPushToken: true, notificationsEnabled: true },
    }),
    prisma.user.findUnique({
      where: { id: senderId },
      select: { username: true, realName: true },
    }),
  ]);

  if (!recipient?.notificationsEnabled) return;
  const token = recipient.expoPushToken?.trim();
  if (!token) return;
  if (!sender) return;

  const preview = trimmed.length > PREVIEW_MAX ? `${trimmed.slice(0, PREVIEW_MAX - 1)}…` : trimmed;
  const peerName = displayLabel(sender);
  const title = `Mensaje de ${peerName}`;

  await sendExpoPushToToken(
    token,
    title,
    preview,
    {
      kind: "CHAT_MESSAGE",
      senderId,
      senderUsername: sender.username,
      peerName,
      messageId,
    },
    { sound: PUSH_SOUND, channelId: ANDROID_CHANNEL }
  );
}
