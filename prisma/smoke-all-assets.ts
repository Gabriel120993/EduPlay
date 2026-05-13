/**
 * Smoke test final: pide CADA `EducationalAsset` al proxy local en los 3 tamaños y
 * comprueba que responda 200 + Content-Type imagen.
 *
 *   npx ts-node --project prisma/tsconfig.seed.json -r tsconfig-paths/register prisma/smoke-all-assets.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE = process.env.SMOKE_API_BASE ?? "http://localhost:3000";

const DELAY_MS = Number(process.env.SMOKE_DELAY_MS ?? 40);

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

async function probe(url: string): Promise<{ status: number; bytes: number; ct: string }> {
  try {
    const res = await fetch(url);
    const ct = res.headers.get("content-type") ?? "";
    if (!res.ok) return { status: res.status, bytes: 0, ct };
    const buf = await res.arrayBuffer();
    return { status: res.status, bytes: buf.byteLength, ct };
  } catch (e) {
    return { status: 0, bytes: 0, ct: `ERR ${e instanceof Error ? e.message : String(e)}` };
  }
}

async function main(): Promise<void> {
  const sizes = ["small", "medium", "large"] as const;
  const assets = await prisma.educationalAsset.findMany({
    select: { id: true, name: true, category: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  const byCategory = new Map<string, { ok: number; fail: number; failures: string[] }>();

  for (const a of assets) {
    for (const size of sizes) {
      const url = `${BASE}/api/image-proxy/${a.id}-${size}`;
      const r = await probe(url);
      const ok = r.status === 200 && r.ct.startsWith("image/");
      const bucket = byCategory.get(a.category) ?? { ok: 0, fail: 0, failures: [] };
      if (ok) bucket.ok += 1;
      else {
        bucket.fail += 1;
        bucket.failures.push(`${a.name}@${size} · status=${r.status} · ct=${r.ct}`);
      }
      byCategory.set(a.category, bucket);
      await sleep(DELAY_MS);
    }
  }

  let okTotal = 0;
  let failTotal = 0;
  console.log("Category".padEnd(15) + "OK".padStart(6) + "FAIL".padStart(6));
  for (const [cat, b] of [...byCategory.entries()].sort()) {
    console.log(cat.padEnd(15) + String(b.ok).padStart(6) + String(b.fail).padStart(6));
    okTotal += b.ok;
    failTotal += b.fail;
  }
  console.log("-".repeat(27));
  console.log("TOTAL".padEnd(15) + String(okTotal).padStart(6) + String(failTotal).padStart(6));

  for (const [cat, b] of byCategory) {
    if (b.failures.length > 0) {
      console.log(`\n[${cat}] fallos:`);
      for (const f of b.failures) console.log("  · " + f);
    }
  }
}

main()
  .catch((e) => {
    console.error("[smoke-all]", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
