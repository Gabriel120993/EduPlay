/**
 * Helpers para construir URLs del proxy/caché de imágenes (`/api/image-proxy/:asset`).
 * Centraliza la regla "si hay asset vinculado, devolver URL local del proxy".
 *
 * Por qué: muchas CDNs (Wikimedia, etc.) responden 429/403 a `<img>` cargado en
 * navegadores domésticos (rate limit por IP, hotlinking). Servir desde el API
 * con caché en disco evita esos errores y unifica el origen.
 */

export type ImageProxySize = 'small' | 'medium' | 'large';

/** URL relativa del proxy. El cliente la resuelve contra `API_BASE_URL`. */
export function imageProxyUrl(assetId: string, size: ImageProxySize = 'medium'): string {
  return `/api/image-proxy/${assetId}-${size}`;
}

/**
 * Devuelve la URL ideal para mostrar la imagen de un asset/legacy:
 *  - Si hay `assetId` → URL del proxy local (estable, cacheable).
 *  - Si no, vuelve a la `legacyUrl` (compatibilidad).
 */
export function pickImageUrl(
  asset: { id?: string | null } | null | undefined,
  legacyUrl: string | null | undefined,
  size: ImageProxySize = 'medium',
): string | null {
  if (asset?.id) return imageProxyUrl(asset.id, size);
  const trimmed = legacyUrl?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}
