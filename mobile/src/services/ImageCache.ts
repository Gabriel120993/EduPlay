import * as FileSystem from "expo-file-system/legacy";

const CACHE_FOLDER = "eduplay-images";

let initializePromise: Promise<void> | null = null;

/** FNV-1a 32-bit: nombre de archivo estable por URL (sin depender de expo-crypto). */
function hashUrl(url: string): string {
  let h = 2166136261;
  for (let i = 0; i < url.length; i++) {
    h ^= url.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const a = (h >>> 0).toString(16).padStart(8, "0");
  let h2 = 5381;
  for (let i = 0; i < url.length; i++) {
    h2 = ((h2 << 5) + h2) ^ url.charCodeAt(i)!;
  }
  const b = (h2 >>> 0).toString(16).padStart(8, "0");
  return `${a}${b}`;
}

function normalizedFileUri(path: string): string {
  if (path.startsWith("file://")) return path;
  return path.startsWith("/") ? `file://${path}` : path;
}

export class ImageCache {
  /** Directorio de caché terminado en `/` o `null` (p. ej. web). */
  static cacheDirOrNull(): string | null {
    const base = FileSystem.cacheDirectory;
    if (!base) return null;
    return `${base}${CACHE_FOLDER}/`;
  }

  /** Crea la carpeta de caché en disco (no hace nada en web). */
  static async initialize(): Promise<void> {
    if (initializePromise) return initializePromise;

    initializePromise = (async () => {
      const dir = this.cacheDirOrNull();
      if (!dir) return;
      const info = await FileSystem.getInfoAsync(dir);
      if (!info.exists) {
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      }
    })();

    return initializePromise;
  }

  /**
   * Descarga `url` a disco si no existe y devuelve `file://…`.
   * En web o si no hay `cacheDirectory`, devuelve `url` sin descargar.
   */
  static async cacheImage(assetId: string, url: string, headers?: Record<string, string>): Promise<string> {
    const trimmed = url.trim();
    if (!trimmed) return trimmed;

    await this.initialize();
    const dir = this.cacheDirOrNull();
    if (!dir) return trimmed;

    const safeId = assetId.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 64) || "asset";
    const fileName = `${safeId}_${hashUrl(trimmed)}.img`;
    const localPath = `${dir}${fileName}`;

    const existing = await FileSystem.getInfoAsync(localPath);
    if (existing.exists) {
      return normalizedFileUri(existing.uri);
    }

    try {
      const result = await FileSystem.downloadAsync(trimmed, localPath, headers ? { headers } : undefined);
      return result.uri;
    } catch {
      return trimmed;
    }
  }

  /**
   * Solo lectura: `file://…` si el archivo ya está en caché (misma convención que `cacheImage`).
   */
  static async getCachedImage(assetId: string, url: string): Promise<string | null> {
    const trimmed = url.trim();
    if (!trimmed) return null;

    const dir = this.cacheDirOrNull();
    if (!dir) return null;

    const safeId = assetId.replace(/[^a-zA-Z0-9_-]+/g, "_").slice(0, 64) || "asset";
    const fileName = `${safeId}_${hashUrl(trimmed)}.img`;
    const localPath = `${dir}${fileName}`;

    const info = await FileSystem.getInfoAsync(localPath);
    if (!info.exists) return null;
    return normalizedFileUri(info.uri);
  }

  /**
   * Resuelve URL remota a archivo local cuando es posible; alias práctico para UI (`recycleKey` = id de pregunta, etc.).
   */
  static async resolveForDisplay(cacheKey: string, url: string, headers?: Record<string, string>): Promise<string> {
    return this.cacheImage(cacheKey, url, headers);
  }
}
