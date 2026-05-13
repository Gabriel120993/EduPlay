/**
 * Precarga a disco todas las imágenes de `EducationalAsset` para que el proxy del API
 * (`/api/image-proxy/:asset`) siempre las sirva como HIT (sin tocar al CDN).
 *
 * - Throttling: pausa configurable entre requests (Wikimedia rate-limita por IP).
 * - Retries con backoff en 429 (Too Many Requests).
 * - Idempotente: salta archivos ya existentes en `cache/educational-assets/`.
 *
 *   npx ts-node --project prisma/tsconfig.seed.json -r tsconfig-paths/register prisma/prefetch-asset-images.ts
 *
 * Variables:
 *   PREFETCH_DELAY_MS   pausa entre requests (default 1500)
 *   PREFETCH_MAX_RETRY  reintentos en 429 (default 4)
 *   PREFETCH_SIZES      lista separada por coma: "small,medium,large" (default "medium")
 */
import "dotenv/config";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CACHE_ROOT = resolve(process.cwd(), "cache", "educational-assets");
const DELAY_MS = Number(process.env.PREFETCH_DELAY_MS ?? 1500);
const MAX_RETRY = Number(process.env.PREFETCH_MAX_RETRY ?? 4);

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
  "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
};

type Size = "small" | "medium" | "large";

function parseSizes(): Size[] {
  const raw = (process.env.PREFETCH_SIZES ?? "medium").toLowerCase();
  const out: Size[] = [];
  for (const tok of raw.split(",")) {
    const v = tok.trim();
    if (v === "small" || v === "medium" || v === "large") out.push(v);
  }
  return out.length ? out : ["medium"];
}

function pickSize(asset: { urlSmall: string; urlMedium: string; urlLarge: string }, size: Size): string {
  if (size === "small") return asset.urlSmall;
  if (size === "large") return asset.urlLarge;
  return asset.urlMedium;
}

function detectExtension(contentType: string | null, url: string): string {
  const ct = (contentType ?? "").toLowerCase();
  if (ct.includes("png")) return "png";
  if (ct.includes("jpeg") || ct.includes("jpg")) return "jpg";
  if (ct.includes("webp")) return "webp";
  if (ct.includes("svg")) return "svg";
  if (ct.includes("gif")) return "gif";
  const fromUrl = url.match(/\.(png|jpe?g|webp|svg|gif)(?:\?|$)/i)?.[1]?.toLowerCase();
  if (fromUrl) return fromUrl === "jpeg" ? "jpg" : fromUrl;
  return "jpg";
}

async function fileExists(path: string): Promise<{ exists: boolean; size: number }> {
  try {
    const s = await stat(path);
    return { exists: s.isFile(), size: s.size };
  } catch {
    return { exists: false, size: 0 };
  }
}

async function findCachedFile(baseNoExt: string): Promise<{ path: string; ext: string } | null> {
  for (const ext of ["png", "jpg", "webp", "svg", "gif"]) {
    const candidate = `${baseNoExt}.${ext}`;
    const r = await fileExists(candidate);
    if (r.exists && r.size > 0) return { path: candidate, ext };
  }
  return null;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const API_HEADERS: Record<string, string> = {
  "User-Agent": "EduPlay/1.0 (https://eduplay.local; contact: dev@eduplay.local)",
  Accept: "application/json",
};

const SIZE_WIDTH: Record<Size, number> = { small: 250, medium: 500, large: 960 };

function extractCommonsFileName(url: string): string | null {
  const m =
    /upload\.wikimedia\.org\/wikipedia\/commons\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/]+?)(?:\/\d+px-[^/]+)?(?:[?#]|$)/.exec(
      url,
    );
  if (!m?.[1]) return null;
  try { return decodeURIComponent(m[1]); } catch { return m[1]; }
}

async function resolveViaApi(originalUrl: string, width: number): Promise<string | null> {
  const fileName = extractCommonsFileName(originalUrl);
  if (!fileName) return null;
  const params = new URLSearchParams({
    action: "query",
    titles: `File:${fileName}`,
    prop: "imageinfo",
    iiprop: "url|size",
    iiurlwidth: String(width),
    format: "json",
    formatversion: "2",
    redirects: "1",
  });
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 15_000);
  try {
    const res = await fetch(`${COMMONS_API}?${params.toString()}`, { headers: API_HEADERS, signal: ctl.signal });
    if (!res.ok) return null;
    const j = (await res.json()) as { query?: { pages?: Array<{ missing?: boolean; imageinfo?: Array<{ thumburl?: string; url?: string }> }> } };
    const page = j.query?.pages?.[0];
    if (!page || page.missing) return null;
    return page.imageinfo?.[0]?.thumburl ?? page.imageinfo?.[0]?.url ?? null;
  } catch { return null; } finally { clearTimeout(timer); }
}

async function fetchOnce(url: string): Promise<{ buf: Buffer; ext: string } | { error: string; status: number }> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 25_000);
  try {
    const res = await fetch(url, { headers: BROWSER_HEADERS, signal: ctl.signal, redirect: "follow" });
    clearTimeout(timer);
    if (!res.ok) return { error: `HTTP ${res.status}`, status: res.status };
    const buf = Buffer.from(await res.arrayBuffer());
    const ext = detectExtension(res.headers.get("content-type"), url);
    return { buf, ext };
  } catch (e) {
    clearTimeout(timer);
    return { error: e instanceof Error ? e.message : String(e), status: 0 };
  }
}

async function downloadWithRetry(url: string, size: Size, label: string): Promise<{ buf: Buffer; ext: string } | { error: string }> {
  let attempt = 0;
  let delay = 1500;
  let target = url;
  let resolvedOnce = false;
  while (attempt <= MAX_RETRY) {
    attempt += 1;
    const r = await fetchOnce(target);
    if ("buf" in r) return r;

    if (r.status === 429) {
      console.log(`  · ${label} · 429, esperando ${delay}ms (intento ${attempt}/${MAX_RETRY + 1})`);
      await sleep(delay);
      delay = Math.min(delay * 2, 30_000);
      continue;
    }
    if ((r.status === 404 || r.status === 400 || r.status === 403) && !resolvedOnce) {
      resolvedOnce = true;
      const resolved = await resolveViaApi(url, SIZE_WIDTH[size]);
      if (resolved && resolved !== target) {
        console.log(`  · ${label} · resolviendo via MediaWiki API → ${resolved}`);
        target = resolved;
        continue;
      }
      return { error: r.error };
    }
    return { error: r.error };
  }
  return { error: "max retries (429)" };
}

async function main(): Promise<void> {
  const sizes = parseSizes();
  console.log(`[prefetch] sizes=${sizes.join(",")} · delay=${DELAY_MS}ms · maxRetry=${MAX_RETRY}`);

  await mkdir(CACHE_ROOT, { recursive: true });

  const assets = await prisma.educationalAsset.findMany({
    select: { id: true, name: true, category: true, urlSmall: true, urlMedium: true, urlLarge: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  let ok = 0;
  let skipped = 0;
  let failed = 0;
  const failures: string[] = [];

  for (const a of assets) {
    for (const size of sizes) {
      const baseNoExt = join(CACHE_ROOT, `${a.id}-${size}`);
      const cached = await findCachedFile(baseNoExt);
      const label = `${a.category}/${a.name}@${size}`;
      if (cached) {
        skipped += 1;
        continue;
      }
      const src = pickSize(a, size).trim();
      if (!src) {
        failed += 1;
        failures.push(`${label} · sin URL fuente`);
        continue;
      }
      const result = await downloadWithRetry(src, size, label);
      if ("error" in result) {
        failed += 1;
        failures.push(`${label} · ${result.error} · ${src}`);
        console.log(`FAIL ${label} · ${result.error}`);
      } else {
        const out = `${baseNoExt}.${result.ext}`;
        await writeFile(out, result.buf);
        ok += 1;
        console.log(`OK   ${label} · ${result.buf.byteLength}B → ${result.ext}`);
      }
      await sleep(DELAY_MS);
    }
  }

  console.log(`\n[prefetch] OK=${ok} · skipped=${skipped} · failed=${failed}`);
  if (failures.length > 0) {
    console.log("\nFalladas:");
    for (const f of failures) console.log("  · " + f);
  }
}

main()
  .catch((e) => {
    console.error("[prefetch]", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
