import type { Prisma } from '@prisma/client';

/** Monedas del juego (`User.quizCoins`). `gems` se mapean 1:1 a monedas extra por ahora. */
export async function addQuizCoins(
  tx: Prisma.TransactionClient,
  userId: string,
  coins: number,
  gems = 0,
): Promise<void> {
  const total = Math.max(0, coins) + Math.max(0, gems);
  if (total <= 0) return;
  await tx.user.update({
    where: { id: userId },
    data: { quizCoins: { increment: total } },
  });
}
