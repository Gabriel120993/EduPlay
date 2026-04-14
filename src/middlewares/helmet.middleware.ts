import helmet from "helmet";

/**
 * Cabeceras HTTP vía Helmet (API JSON).
 * - **Clickjacking:** `X-Frame-Options: DENY` + resto de cabeceras seguras por defecto (p. ej. `nosniff`).
 * - **Sin CSP estricta en cada respuesta:** el API solo devuelve JSON; `Content-Security-Policy` global muy
 *   restrictiva en todas las rutas puede interferir con la app web (Expo) o proxies en desarrollo.
 */
export const securityHeadersMiddleware = helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  frameguard: { action: "deny" },
});
