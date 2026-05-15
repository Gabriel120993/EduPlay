import { prisma } from './prisma';

/** Par ordenado lexicográfico (convención del modelo `Chat`). */
export function orderedUserPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export async function ensureChatForUsers(userIdA: string, userIdB: string) {
  const [user1Id, user2Id] = orderedUserPair(userIdA, userIdB);
  return prisma.chat.upsert({
    where: {
      user1Id_user2Id: { user1Id, user2Id },
    },
    create: { user1Id, user2Id },
    update: {},
    select: { id: true, user1Id: true, user2Id: true, createdAt: true },
  });
}

export async function findChatById(chatId: string) {
  return prisma.chat.findUnique({
    where: { id: chatId.trim() },
    select: { id: true, user1Id: true, user2Id: true },
  });
}

export function peerUserIdFromChat(
  chat: { user1Id: string; user2Id: string },
  viewerId: string,
): string | null {
  if (chat.user1Id === viewerId) return chat.user2Id;
  if (chat.user2Id === viewerId) return chat.user1Id;
  return null;
}
