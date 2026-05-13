/**
 * Resolución de URLs de Wikimedia Commons via MediaWiki Action API.
 *
 * Por qué: las URLs hardcodeadas con buckets de hash (`upload.wikimedia.org/wikipedia/commons/X/YY/Name.jpg`)
 * pueden quedar obsoletas si el archivo se renombra/mueve (cambia el bucket). Además,
 * Wikimedia exige "thumbnail steps" predefinidos. La API resuelve ambos problemas:
 * devuelve la URL canónica vigente del archivo y el `thumburl` válido para el ancho pedido.
 *
 * Doc: https://www.mediawiki.org/wiki/API:Imageinfo
 */

const COMMONS_API = "https://commons.wikimedia.org/w/api.php";

const HEADERS: Record<string, string> = {
  "User-Agent": "EduPlay/1.0 (https://eduplay.local; contact: dev@eduplay.local)",
  Accept: "application/json",
};

const cache = new Map<string, { url: string | null; expiresAt: number }>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

function isCommonsUploadUrl(input: string): boolean {
  return /upload\.wikimedia\.org\/wikipedia\/commons\//.test(input);
}

/** Extrae el nombre del archivo del path commons (`X/YY/Name.ext` o `thumb/X/YY/Name.ext/...`). */
function extractFileName(commonsUrl: string): string | null {
  const m =
    /upload\.wikimedia\.org\/wikipedia\/commons\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/]+?)(?:\/\d+px-[^/]+)?(?:[?#]|$)/.exec(
      commonsUrl,
    );
  if (!m?.[1]) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

type ImageInfo = {
  thumburl?: string;
  url?: string;
  thumbwidth?: number;
  thumbheight?: number;
};

type ApiResponse = {
  query?: {
    pages?: Array<{
      missing?: boolean;
      imageinfo?: ImageInfo[];
    }>;
  };
};

/**
 * Devuelve la URL canónica del thumbnail al ancho pedido (o la URL original si Wikimedia no genera thumb).
 * Devuelve `null` si el archivo no existe o la API falla.
 */
export async function resolveWikimediaUrl(originalUrl: string, width: number): Promise<string | null> {
  if (!isCommonsUploadUrl(originalUrl)) return originalUrl;

  const fileName = extractFileName(originalUrl);
  if (!fileName) return null;

  const cacheKey = `${fileName}@${width}`;
  const hit = cache.get(cacheKey);
  if (hit && hit.expiresAt > Date.now()) return hit.url;

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
    const res = await fetch(`${COMMONS_API}?${params.toString()}`, {
      headers: HEADERS,
      signal: ctl.signal,
    });
    if (!res.ok) {
      cache.set(cacheKey, { url: null, expiresAt: Date.now() + 60_000 });
      return null;
    }
    const j = (await res.json()) as ApiResponse;
    const page = j.query?.pages?.[0];
    if (!page || page.missing) {
      cache.set(cacheKey, { url: null, expiresAt: Date.now() + 60_000 });
      return null;
    }
    const info = page.imageinfo?.[0];
    const url = info?.thumburl ?? info?.url ?? null;
    cache.set(cacheKey, { url, expiresAt: Date.now() + CACHE_TTL_MS });
    return url;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
