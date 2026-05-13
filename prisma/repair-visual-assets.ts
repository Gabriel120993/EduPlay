/**
 * Repara `VisualQuestion` existentes en BD asociándoles `imageAssetId` correcto y
 * reemplazando `imageUrl` (placehold.co) por la URL real del `EducationalAsset`.
 * Idempotente: solo actualiza filas que aún apuntan al placeholder o no tienen asset.
 *
 *   npx ts-node --project prisma/tsconfig.seed.json -r tsconfig-paths/register prisma/repair-visual-assets.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { ES_NAME_TO_FLAG_CODE } from "./lib/countryFlagsSeed";

const prisma = new PrismaClient();

function assetSlug(label: string): string {
  return label
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

/** Extrae el label desde una URL `placehold.co/...?text=<label>` (decodifica %xx y `+`). */
function extractPlaceholdLabel(url: string): string | null {
  const m = url.match(/[?&]text=([^&]+)/i);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]!.replace(/\+/g, " ")).trim();
  } catch {
    return null;
  }
}

/** Decide qué `EducationalAsset.name` corresponde a una `VisualQuestion`. */
function inferAssetName(question: string, label: string, category: string): string[] {
  const slug = assetSlug(label);
  const q = question.toLowerCase();
  const candidates: string[] = [];

  if (category === "astronomy" || q.includes("planeta") || q.includes("astro") || q.includes("estrella")) {
    candidates.push(`planet_${slug}`);
  }
  if (category === "science" && (q.includes("dinosaurio") || /dino/i.test(q))) {
    candidates.push(`dino_${slug}`);
  }
  if (category === "geography") {
    if (q.includes("bandera")) {
      const code = ES_NAME_TO_FLAG_CODE[label];
      if (code) candidates.push(`bandera_${code}`);
    }
    if (q.includes("forma") || q.includes("mapa")) {
      candidates.push(`map_${slug}`);
    }
    if (q.includes("monumento") || q.includes("lugar")) {
      candidates.push(`monumento_${slug}`);
    }
  }
  candidates.push(`dino_${slug}`, `planet_${slug}`, `map_${slug}`, `bandera_${slug}`, slug);
  return Array.from(new Set(candidates));
}

async function main(): Promise<void> {
  const questions = await prisma.visualQuestion.findMany({
    select: {
      id: true,
      imageUrl: true,
      imageAssetId: true,
      question: true,
      category: true,
    },
  });

  const assets = await prisma.educationalAsset.findMany({ select: { id: true, name: true, urlMedium: true } });
  const byName = new Map(assets.map((a) => [a.name, a]));

  let updated = 0;
  let missing = 0;
  const missingSamples: string[] = [];

  for (const q of questions) {
    const isPlaceholder = q.imageUrl.includes("placehold.co");
    if (!isPlaceholder && q.imageAssetId) continue;

    const label = extractPlaceholdLabel(q.imageUrl);
    if (!label) {
      missing += 1;
      if (missingSamples.length < 5) missingSamples.push(`${q.id}: no label in ${q.imageUrl}`);
      continue;
    }

    const candidates = inferAssetName(q.question, label, q.category);
    const asset = candidates.map((n) => byName.get(n)).find((a) => a) ?? null;
    if (!asset) {
      missing += 1;
      if (missingSamples.length < 5) missingSamples.push(`${q.id}: ${q.category} · ${label} (tried ${candidates.join(", ")})`);
      continue;
    }

    await prisma.visualQuestion.update({
      where: { id: q.id },
      data: { imageAssetId: asset.id, imageUrl: asset.urlMedium },
    });
    updated += 1;
  }

  console.log(`[repair-visual] OK · actualizadas: ${updated} · sin match: ${missing} / total: ${questions.length}`);
  if (missingSamples.length > 0) {
    console.log("[repair-visual] ejemplos sin match:");
    for (const s of missingSamples) console.log(`  - ${s}`);
  }
}

main()
  .catch((e) => {
    console.error("[repair-visual]", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
