#!/usr/bin/env node
/**
 * Valida variables críticas antes de desplegar a producción.
 * Uso: NODE_ENV=production node scripts/verify-prod.mjs
 *      o con --env-file .env.prod (Node 20+)
 */
import { config } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

const root = resolve(process.cwd());
const envFile = process.argv.includes('--env-file')
  ? process.argv[process.argv.indexOf('--env-file') + 1]
  : resolve(root, '.env.prod');

if (existsSync(envFile)) {
  config({ path: envFile });
} else {
  console.warn(`[verify:prod] No se encontró ${envFile}; usando process.env actual.`);
}

const errors = [];
const warnings = [];

const jwt = process.env.JWT_SECRET?.trim() ?? '';
const dbUrl = process.env.DATABASE_URL?.trim() ?? '';
const cors = (process.env.CORS_ALLOWED_ORIGINS ?? '').trim();
const sentry = process.env.SENTRY_DSN?.trim() ?? '';
const nodeEnv = process.env.NODE_ENV ?? '';

if (nodeEnv !== 'production') {
  warnings.push('NODE_ENV no es "production" (este script está pensado para prod).');
}

if (jwt.length < 32) {
  errors.push('JWT_SECRET debe tener al menos 32 caracteres.');
}

const weakDbPatterns = [/password/i, /123456/, /eduplay2024/i, /changeme/i];
if (!dbUrl) {
  errors.push('DATABASE_URL es obligatoria.');
} else if (weakDbPatterns.some((re) => re.test(dbUrl))) {
  errors.push('DATABASE_URL parece usar credenciales débiles o de ejemplo.');
}

if (cors === '*' || cors === '') {
  errors.push('CORS_ALLOWED_ORIGINS no puede ser "*" ni estar vacío en producción.');
}

if (!sentry) {
  warnings.push('SENTRY_DSN no configurado: no habrá monitoreo de errores en Sentry.');
}

for (const w of warnings) {
  console.warn(`[verify:prod] ADVERTENCIA: ${w}`);
}

if (errors.length > 0) {
  console.error('[verify:prod] Errores de configuración:');
  for (const e of errors) {
    console.error(`  - ${e}`);
  }
  process.exit(1);
}

console.log('[verify:prod] Configuración de producción OK.');
