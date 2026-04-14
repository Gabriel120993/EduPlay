import type { Prisma, XpGainSource } from "@prisma/client";

export async function recordXpGain(
  tx: Prisma.TransactionClient,
  userId: string,
  amount: number,
  source: XpGainSource
): Promise<void> {
  if (amount <= 0) return;
  await tx.xpGainLedger.create({
    data: { userId, amount, source },
  });
}
