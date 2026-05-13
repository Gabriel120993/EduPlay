/**
 * Inserta o actualiza solo filas de `EducationalAsset` desde el catálogo (`educationalAssetCatalog`).
 * Idempotente: upsert por `(category, name)`. No borra cuentas ni otros datos.
 *
 *   npx ts-node --project prisma/tsconfig.seed.json -r tsconfig-paths/register prisma/seed-images.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { EDUCATIONAL_ASSET_SEED_DATA } from "./lib/educationalAssetCatalog";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  let n = 0;
  for (const row of EDUCATIONAL_ASSET_SEED_DATA) {
    await prisma.educationalAsset.upsert({
      where: {
        category_name: { category: row.category, name: row.name },
      },
      create: {
        type: row.type,
        category: row.category,
        name: row.name,
        title: row.title,
        description: row.description ?? null,
        urlSmall: row.urlSmall,
        urlMedium: row.urlMedium,
        urlLarge: row.urlLarge,
        source: row.source,
        sourceUrl: row.sourceUrl,
        license: row.license,
        tags: row.tags,
      },
      update: {
        type: row.type,
        title: row.title,
        description: row.description ?? null,
        urlSmall: row.urlSmall,
        urlMedium: row.urlMedium,
        urlLarge: row.urlLarge,
        source: row.source,
        sourceUrl: row.sourceUrl,
        license: row.license,
        tags: row.tags,
      },
    });
    n += 1;
  }
  console.log(`[seed-images] OK · ${n} activos (upsert).`);
}

main()
  .catch((e) => {
    console.error("[seed-images]", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
