/**
 * Logging de servidor: errores y actividad sospechosa, sin contraseñas ni tokens en claro.
 */

const JWT_LIKE = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

/** Claves cuyo valor no debe aparecer en logs (coincidencia por subcadena, case-insensitive). */
const SENSITIVE_KEY_HINTS = [
  'password',
  'token',
  'secret',
  'authorization',
  'bearer',
  'apikey',
  'api_key',
  'accesstoken',
  'refreshtoken',
  'cookie',
  'jwt',
  'credential',
];

function keyLooksSensitive(key: string): boolean {
  const k = key.toLowerCase().replace(/[_-]/g, '');
  return SENSITIVE_KEY_HINTS.some((h) => k.includes(h.replace(/[_-]/g, '')));
}

function redactString(value: string): string {
  const t = value.trim();
  if (JWT_LIKE.test(t)) return '[redacted:jwt]';
  if (t.startsWith('ExponentPushToken[')) return '[redacted:expo-push]';
  if (t.length > 80 && /^[A-Za-z0-9+/=_-]+$/.test(t)) return '[redacted:opaque]';
  return value;
}

/**
 * Copia superficial/profunda limitada para logs: oculta valores bajo claves sensibles y JWT en strings.
 */
export function sanitizeForLog(value: unknown, depth = 0): unknown {
  if (depth > 8) return '[max-depth]';
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return redactString(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) {
    return { name: value.name, message: redactString(value.message) };
  }
  if (Array.isArray(value)) {
    return value.map((x) => sanitizeForLog(x, depth + 1));
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (keyLooksSensitive(k)) {
        out[k] = '[redacted]';
      } else {
        out[k] = sanitizeForLog(v, depth + 1);
      }
    }
    return out;
  }
  return '[unserializable]';
}

function errorToSafeParts(err: unknown): { line: string; stack?: string } {
  if (err instanceof Error) {
    return {
      line: `${err.name}: ${redactString(err.message)}`,
      stack: err.stack,
    };
  }
  try {
    return { line: JSON.stringify(sanitizeForLog(err)) };
  } catch {
    return { line: String(err) };
  }
}

/** Errores de servidor (mensaje/stack saneados; nunca se registra el cuerpo crudo de peticiones). */
export function logError(scope: string, err: unknown, meta?: Record<string, unknown>): void {
  const { line, stack } = errorToSafeParts(err);
  const suffix =
    meta && Object.keys(meta).length > 0 ? ` | meta=${JSON.stringify(sanitizeForLog(meta))}` : '';
  console.error(`[error] ${scope} | ${line}${suffix}`);
  if (stack && process.env.NODE_ENV !== 'test') {
    console.error(stack);
  }
}

/** Intentos anómalos o eventos de seguridad/moderación (sin secretos). */
export function logSuspicious(event: string, meta?: Record<string, unknown>): void {
  const m = meta && Object.keys(meta).length > 0 ? ` ${JSON.stringify(sanitizeForLog(meta))}` : '';
  console.warn(`[suspicious] ${event}${m}`);
}
