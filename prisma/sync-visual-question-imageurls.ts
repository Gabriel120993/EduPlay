/**
 * Sincroniza `VisualQuestion.imageUrl` con `EducationalAsset.urlMedium` cuando hay
 * `imageAssetId` (la app usa el proxy, pero la columna queda coherente para dumps/BI).
 *
 *   npx ts-node --project prisma/tsconfig.seed.json -r tsconfig-paths/register prisma/sync-visual-question-imageurls.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const rows = await prisma.visualQuestion.findMany({
    where: { imageAssetId: { not: null } },
    select: { id: true, imageUrl: true, imageAsset: { select: { urlMedium: true } } },
  });
  let n = 0;
  for (const q of rows) {
    const medium = q.imageAsset?.urlMedium?.trim();
    if (!medium || q.imageUrl.trim() === medium) continue;
    await prisma.visualQuestion.update({ where: { id: q.id }, data: { imageUrl: medium } });
    n += 1;
  }
  console.log(`[sync-visual-imageurls] actualizadas: ${n} / ${rows.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
