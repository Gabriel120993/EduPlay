import { createReadStream } from "node:fs";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { Request, Response } from "express";

import { logError } from "../lib/logger";
import { prisma } from "../lib/prisma";
import { resolveWikimediaUrl } from "../lib/wikimediaResolver";

/**
 * Proxy/caché de imágenes de `EducationalAsset`.
 *
 * Por qué: muchas CDNs (Wikimedia, etc.) bloquean hotlinking desde navegadores
 * con referer `localhost` o sin User-Agent de browser. El navegador del usuario
 * recibe un 429/403 al cargar `<img>` directamente. El backend descarga la imagen
 * con cabeceras correctas, la guarda en disco y la sirve al frontend desde el
 * mismo origen del API (sin restricciones de CORS/referer).
 *
 * Endpoint público (sin auth): `GET /api/image-proxy/:assetId[.ext]`
 *  - `assetId` puede incluir un sufijo de tamaño (`-small`, `-medium`, `-large`).
 *  - La primera petición descarga del CDN externo y guarda en `cache/educational-assets/`.
 *  - Las siguientes peticiones se sirven directo desde disco.
 */

const CACHE_ROOT = resolve(process.cwd(), "cache", "educational-assets");

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
  "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
};

type Size = "small" | "medium" | "large";

const ALLOWED_SIZES: Size[] = ["small", "medium", "large"];

function parseAssetParam(raw: string): { id: string; size: Size } | null {
  const cleaned = raw.replace(/\.(png|jpg|jpeg|webp|svg|gif)$/i, "");
  const match = cleaned.match(/^([0-9a-fA-F-]{36})(?:-(small|medium|large))?$/);
  if (!match) return null;
  return { id: match[1]!, size: (match[2] as Size) ?? "medium" };
}

function pickSourceUrl(asset: { urlSmall: string; urlMedium: string; urlLarge: string }, size: Size): string {
  if (size === "small") return asset.urlSmall;
  if (size === "large") return asset.urlLarge;
  return asset.urlMedium;
}

/** Devuelve la extensión razonable a partir de Content-Type / URL. */
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

function mimeFromExt(ext: string): string {
  switch (ext) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "svg":
      return "image/svg+xml";
    case "gif":
      return "image/gif";
    case "jpg":
    default:
      return "image/jpeg";
  }
}

async function fileExists(path: string): Promise<{ exists: boolean; size: number }> {
  try {
    const s = await stat(path);
    return { exists: s.isFile(), size: s.size };
  } catch {
    return { exists: false, size: 0 };
  }
}

/** Si encuentra cache previo con cualquier extensión válida, devuelve la ruta y la ext. */
async function findCachedFile(baseNoExt: string): Promise<{ path: string; ext: string } | null> {
  for (const ext of ["png", "jpg", "webp", "svg", "gif"]) {
    const candidate = `${baseNoExt}.${ext}`;
    const r = await fileExists(candidate);
    if (r.exists && r.size > 0) return { path: candidate, ext };
  }
  return null;
}

const SIZE_TO_WIDTH: Record<Size, number> = { small: 250, medium: 500, large: 960 };

async function fetchOnce(url: string): Promise<{ buf: Buffer; ext: string } | { error: string; status: number }> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 20_000);
  try {
    const res = await fetch(url, { headers: BROWSER_HEADERS, signal: ctl.signal, redirect: "follow" });
    if (!res.ok) {
      return { error: `HTTP ${res.status}`, status: res.status };
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const ext = detectExtension(res.headers.get("content-type"), url);
    return { buf, ext };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e), status: 0 };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Descarga la imagen y la guarda en disco. Si la URL directa falla (404 por bucket
 * obsoleto, o 400 por ancho inválido), intenta resolver vía MediaWiki API.
 */
async function downloadAndCache(sourceUrl: string, baseNoExt: string, size: Size): Promise<{ path: string; ext: string }> {
  await mkdir(CACHE_ROOT, { recursive: true });

  let attempt = await fetchOnce(sourceUrl);

  if ("error" in attempt && (attempt.status === 404 || attempt.status === 400 || attempt.status === 403)) {
    const resolved = await resolveWikimediaUrl(sourceUrl, SIZE_TO_WIDTH[size]);
    if (resolved && resolved !== sourceUrl) {
      attempt = await fetchOnce(resolved);
    }
  }

  if ("error" in attempt) {
    throw new Error(`Source ${attempt.error}`);
  }

  const outPath = `${baseNoExt}.${attempt.ext}`;
  await writeFile(outPath, attempt.buf);
  return { path: outPath, ext: attempt.ext };
}

export async function serveImageProxy(req: Request, res: Response): Promise<void> {
  const param = parseAssetParam(req.params.asset ?? "");
  if (!param) {
    res.status(400).json({ error: "asset inválido." });
    return;
  }
  if (!ALLOWED_SIZES.includes(param.size)) {
    res.status(400).json({ error: "size inválido." });
    return;
  }

  try {
    const asset = await prisma.educationalAsset.findUnique({
      where: { id: param.id },
      select: { id: true, urlSmall: true, urlMedium: true, urlLarge: true },
    });
    if (!asset) {
      res.status(404).json({ error: "Activo no encontrado." });
      return;
    }

    const sourceUrl = pickSourceUrl(asset, param.size).trim();
    if (!sourceUrl) {
      res.status(404).json({ error: "Activo sin URL fuente." });
      return;
    }

    const baseNoExt = join(CACHE_ROOT, `${asset.id}-${param.size}`);

    const cached = await findCachedFile(baseNoExt);
    let final: { path: string; ext: string };
    if (cached) {
      final = cached;
    } else {
      try {
        final = await downloadAndCache(sourceUrl, baseNoExt, param.size);
      } catch (downloadErr) {
        logError("imageProxy.download", downloadErr);
        res.status(502).json({ error: "No se pudo descargar la imagen del origen." });
        return;
      }
    }

    res.setHeader("Content-Type", mimeFromExt(final.ext));
    res.setHeader("Cache-Control", "public, max-age=604800, immutable");
    res.setHeader("X-Image-Proxy", cached ? "HIT" : "MISS");
    createReadStream(final.path)
      .on("error", (streamErr) => {
        logError("imageProxy.stream", streamErr);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error al servir la imagen." });
        } else {
          res.end();
        }
      })
      .pipe(res);
  } catch (e) {
    logError("imageProxy.serve", e);
    if (!res.headersSent) {
      res.status(500).json({ error: "Error al servir la imagen." });
    }
  }
}
