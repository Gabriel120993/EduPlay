/**
 * Reescribe en BD los anchos de los thumbnails de Wikimedia a los "thumbnail steps"
 * permitidos (Wikimedia ya solo acepta 20, 40, 60, 120, 250, 330, 500, 960, 1280...).
 * Mapeo: 150→120, 400→500, 800→960. Otros anchos también se acercan al permitido.
 *
 * Tablas afectadas (campos `imageUrl` y URLs del asset):
 *   - EducationalAsset (urlSmall, urlMedium, urlLarge)
 *   - VisualQuestion (imageUrl)
 *   - EducationalContent (imageUrl)
 *
 *   npx ts-node --project prisma/tsconfig.seed.json -r tsconfig-paths/register prisma/rewrite-wikimedia-widths.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ALLOWED: number[] = [20, 40, 60, 120, 250, 330, 500, 960, 1280, 1920, 3840];

function nearestAllowed(width: number): number {
  let best = ALLOWED[0]!;
  let bestDelta = Math.abs(best - width);
  for (const w of ALLOWED) {
    const d = Math.abs(w - width);
    if (d < bestDelta || (d === bestDelta && w > best)) {
      best = w;
      bestDelta = d;
    }
  }
  return best;
}

function rewriteUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  if (!input.includes("upload.wikimedia.org/wikipedia/commons/thumb/")) return input;
  return input.replace(/\/(\d+)px-/g, (_full, raw: string) => {
    const w = parseInt(raw, 10);
    if (Number.isNaN(w)) return `/${raw}px-`;
    if (ALLOWED.includes(w)) return `/${w}px-`;
    return `/${nearestAllowed(w)}px-`;
  });
}

async function main(): Promise<void> {
  let touched = 0;

  const assets = await prisma.educationalAsset.findMany({
    select: { id: true, urlSmall: true, urlMedium: true, urlLarge: true },
  });
  for (const a of assets) {
    const s = rewriteUrl(a.urlSmall) ?? a.urlSmall;
    const m = rewriteUrl(a.urlMedium) ?? a.urlMedium;
    const l = rewriteUrl(a.urlLarge) ?? a.urlLarge;
    if (s !== a.urlSmall || m !== a.urlMedium || l !== a.urlLarge) {
      await prisma.educationalAsset.update({
        where: { id: a.id },
        data: { urlSmall: s, urlMedium: m, urlLarge: l },
      });
      touched += 1;
    }
  }
  console.log(`[rewrite-widths] EducationalAsset · actualizados=${touched}/${assets.length}`);

  let visualTouched = 0;
  const visuals = await prisma.visualQuestion.findMany({ select: { id: true, imageUrl: true } });
  for (const q of visuals) {
    const next = rewriteUrl(q.imageUrl);
    if (next && next !== q.imageUrl) {
      await prisma.visualQuestion.update({ where: { id: q.id }, data: { imageUrl: next } });
      visualTouched += 1;
    }
  }
  console.log(`[rewrite-widths] VisualQuestion · actualizadas=${visualTouched}/${visuals.length}`);

  let contentTouched = 0;
  const contents = await prisma.educationalContent.findMany({ select: { id: true, imageUrl: true } });
  for (const c of contents) {
    const next = rewriteUrl(c.imageUrl ?? null);
    if (next && next !== c.imageUrl) {
      await prisma.educationalContent.update({ where: { id: c.id }, data: { imageUrl: next } });
      contentTouched += 1;
    }
  }
  console.log(`[rewrite-widths] EducationalContent · actualizados=${contentTouched}/${contents.length}`);
}

main()
  .catch((e) => {
    console.error("[rewrite-widths]", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
