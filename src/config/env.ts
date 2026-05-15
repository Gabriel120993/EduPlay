import dotenv from 'dotenv';

dotenv.config();

const port = Number(process.env.PORT) || 3000;
const nodeEnv = process.env.NODE_ENV ?? 'development';
const isProduction = nodeEnv === 'production';
const databaseUrl = process.env.DATABASE_URL;
const jwtSecretFromEnv = process.env.JWT_SECRET?.trim();
const JWT_SECRET_MIN_LENGTH = 32;

/** Detrás de proxy (nginx, etc.): necesario para rate limiting y `req.ip` correctos. */
const trustProxy = process.env.TRUST_PROXY?.trim().toLowerCase() === 'true';

/**
 * Orígenes CORS permitidos (lista separada por comas). `*` = reflejar cualquier origen (solo si lo aceptás conscientemente).
 * En producción conviene dominios explícitos, p. ej. `https://app.eduplay.com,https://admin.eduplay.com`.
 */
const corsAllowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? '*').trim() || '*';

const bcryptRoundsRaw = Number(process.env.BCRYPT_ROUNDS);
const bcryptRounds =
  Number.isFinite(bcryptRoundsRaw) && bcryptRoundsRaw >= 10 && bcryptRoundsRaw <= 14
    ? Math.floor(bcryptRoundsRaw)
    : 12;

const authRateLimitWindowMs = Math.max(
  60_000,
  Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
);
const authRateLimitMax = Math.max(5, Number(process.env.AUTH_RATE_LIMIT_MAX) || 25);

const apiRateLimitWindowMs = Math.max(
  10_000,
  Number(process.env.API_RATE_LIMIT_WINDOW_MS) || 60_000,
);
const apiRateLimitMax = Math.max(30, Number(process.env.API_RATE_LIMIT_MAX) || 200);

/** Por usuario autenticado (JWT): menores — ventana y máximo de solicitudes. */
const apiChildUserRateLimitWindowMs = Math.max(
  10_000,
  Number(process.env.API_CHILD_USER_RATE_LIMIT_WINDOW_MS) || 60_000,
);
const apiChildUserRateLimitMax = Math.max(
  20,
  Number(process.env.API_CHILD_USER_RATE_LIMIT_MAX) || 280,
);

/** Por tutor autenticado (JWT): panel e IAP suelen generar más tráfico. */
const apiParentUserRateLimitWindowMs = Math.max(
  10_000,
  Number(process.env.API_PARENT_USER_RATE_LIMIT_WINDOW_MS) || 60_000,
);
const apiParentUserRateLimitMax = Math.max(
  50,
  Number(process.env.API_PARENT_USER_RATE_LIMIT_MAX) || 900,
);

/** Solicitudes de amistad salientes (por menor): ráfaga corta. */
const friendRequestBurstWindowMs = Math.max(
  5_000,
  Number(process.env.FRIEND_REQUEST_BURST_WINDOW_MS) || 60_000,
);
const friendRequestBurstMax = Math.max(1, Number(process.env.FRIEND_REQUEST_BURST_MAX) || 5);

/** Solicitudes de amistad salientes: ventana más larga. */
const friendRequestWindowMs = Math.max(
  60_000,
  Number(process.env.FRIEND_REQUEST_WINDOW_MS) || 15 * 60 * 1000,
);
const friendRequestMax = Math.max(1, Number(process.env.FRIEND_REQUEST_MAX) || 14);

/** Máximo de filas `Friend` nuevas (mismo remitente) creadas en la última hora (anti-abuso en DB). */
const friendRequestDbMaxPerHour = Math.max(
  5,
  Number(process.env.FRIEND_REQUEST_DB_MAX_PER_HOUR) || 40,
);

/** Máximo de denuncias (`ContentReport`) que un menor puede crear en 24 h. */
const contentReportUserMaxPer24h = Math.max(
  3,
  Number(process.env.CONTENT_REPORT_USER_MAX_PER_24H) || 24,
);

/** Si en 24 h distintos menores denuncian al mismo usuario (USER), registramos evento sospechoso a partir de este número. */
const userReportDistinctReportersAlertThreshold = Math.max(
  2,
  Number(process.env.USER_REPORT_DISTINCT_REPORTERS_ALERT) || 4,
);

/** Login y registro de tutor: por defecto 100 solicitudes / 15 min por IP. */
const loginRegisterRateLimitWindowMs = Math.max(
  60_000,
  Number(process.env.LOGIN_REGISTER_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
);
const loginRegisterRateLimitMax = Math.max(
  1,
  Number(process.env.LOGIN_REGISTER_RATE_LIMIT_MAX) || 100,
);

if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL no está definida. Copia .env.example a .env y configura la conexión a PostgreSQL.',
  );
}

if (!jwtSecretFromEnv) {
  throw new Error(
    'JWT_SECRET no está definida en .env. Generá un valor aleatorio largo (p. ej. openssl rand -base64 48) y copiá .env.example.',
  );
}

if (jwtSecretFromEnv.length < JWT_SECRET_MIN_LENGTH) {
  throw new Error(
    `JWT_SECRET debe tener al menos ${JWT_SECRET_MIN_LENGTH} caracteres. Usá un valor aleatorio largo (p. ej. openssl rand -base64 48).`,
  );
}

const jwtSecret = jwtSecretFromEnv;

const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim() || '';
const cloudinaryApiKey = process.env.CLOUDINARY_API_KEY?.trim() || '';
const cloudinaryApiSecret = process.env.CLOUDINARY_API_SECRET?.trim() || '';
const cloudinaryUploadFolder = process.env.CLOUDINARY_UPLOAD_FOLDER?.trim() || 'eduplay';
/** p. ej. `aws_rek` o `perception_point` si está habilitado en Cloudinary; vacío = sin moderación en subida. */
const cloudinaryModeration = process.env.CLOUDINARY_MODERATION?.trim() || '';

/** Secreto para endpoints `/api/admin/*` (header `x-admin-secret`). Vacío = rutas admin deshabilitadas. */
const adminApiSecret = process.env.ADMIN_API_SECRET?.trim() ?? '';

/**
 * Límites con nombre: estricto (auth / admin), medio (escritura típica), generoso (lectura).
 * Por defecto, `strict` hereda los mismos valores que login/registro si no definís `RATE_LIMIT_STRICT_*`.
 */
const rateLimitStrictWindowMs = Math.max(
  60_000,
  Number(process.env.RATE_LIMIT_STRICT_WINDOW_MS) || loginRegisterRateLimitWindowMs,
);
const rateLimitStrictMax = Math.max(
  1,
  Number(process.env.RATE_LIMIT_STRICT_MAX) || loginRegisterRateLimitMax,
);
const rateLimitMediumWindowMs = Math.max(
  10_000,
  Number(process.env.RATE_LIMIT_MEDIUM_WINDOW_MS) || 60_000,
);
const rateLimitMediumMax = Math.max(10, Number(process.env.RATE_LIMIT_MEDIUM_MAX) || 120);
const rateLimitGenerousWindowMs = Math.max(
  5_000,
  Number(process.env.RATE_LIMIT_GENEROUS_WINDOW_MS) || 60_000,
);
const rateLimitGenerousMax = Math.max(50, Number(process.env.RATE_LIMIT_GENEROUS_MAX) || 600);

export const env = {
  port,
  nodeEnv,
  isProduction,
  corsAllowedOrigins,
  databaseUrl,
  jwtSecret,
  trustProxy,
  bcryptRounds,
  authRateLimitWindowMs,
  authRateLimitMax,
  apiRateLimitWindowMs,
  apiRateLimitMax,
  apiChildUserRateLimitWindowMs,
  apiChildUserRateLimitMax,
  apiParentUserRateLimitWindowMs,
  apiParentUserRateLimitMax,
  friendRequestBurstWindowMs,
  friendRequestBurstMax,
  friendRequestWindowMs,
  friendRequestMax,
  friendRequestDbMaxPerHour,
  contentReportUserMaxPer24h,
  userReportDistinctReportersAlertThreshold,
  loginRegisterRateLimitWindowMs,
  loginRegisterRateLimitMax,
  cloudinaryCloudName,
  cloudinaryApiKey,
  cloudinaryApiSecret,
  cloudinaryUploadFolder,
  cloudinaryModeration,
  adminApiSecret,
  rateLimitStrictWindowMs,
  rateLimitStrictMax,
  rateLimitMediumWindowMs,
  rateLimitMediumMax,
  rateLimitGenerousWindowMs,
  rateLimitGenerousMax,
} as const;

export function isCloudinaryConfigured(): boolean {
  return Boolean(env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret);
}
