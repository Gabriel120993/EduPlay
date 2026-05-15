import type { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';

import { env } from '../config/env';
import { logSuspicious } from '../lib/logger';

function clientKey(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? 'unknown';
}

function rateLimitMeta(req: Request, limiterName: string): Record<string, unknown> {
  const meta: Record<string, unknown> = {
    limiter: limiterName,
    path: req.path,
    method: req.method,
    ip: clientKey(req),
  };
  const a = req.auth;
  if (a?.kind === 'child') meta.authenticatedChildUserId = a.userId;
  else if (a?.kind === 'parent') meta.authenticatedParentId = a.parentId;
  return meta;
}

function limitExceededHandler(limiterName: string) {
  return (
    req: Request,
    res: Response,
    _next: NextFunction,
    options: { statusCode: number; message: unknown },
  ): void => {
    logSuspicious('rate_limit_exceeded', rateLimitMeta(req, limiterName));
    res.status(options.statusCode).json(options.message as object);
  };
}

/**
 * Login y registro del tutor (`POST /api/auth/login`, `POST /api/auth/register` y rutas `/auth/*` equivalentes).
 * Por defecto: 100 solicitudes / 15 min por IP.
 */
export const loginRegisterRateLimiter = rateLimit({
  windowMs: env.loginRegisterRateLimitWindowMs,
  max: env.loginRegisterRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error:
      'Demasiados intentos de inicio de sesión o registro desde esta red. Probá de nuevo más tarde.',
  },
  keyGenerator: (req) => `login-register:${clientKey(req)}`,
  handler: limitExceededHandler('login-register'),
});

/**
 * Limita otras escrituras sensibles (login hijo, IAP, informes, etc.) por IP.
 */
export const authWriteLimiter = rateLimit({
  windowMs: env.authRateLimitWindowMs,
  max: env.authRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos desde esta red. Probá de nuevo en unos minutos.' },
  keyGenerator: (req) => `auth-write:${clientKey(req)}`,
  handler: limitExceededHandler('auth-write'),
});

/**
 * Límite general por IP sobre rutas `/api` (además del límite específico de auth en escritura).
 */
export const apiGeneralLimiter = rateLimit({
  windowMs: env.apiRateLimitWindowMs,
  max: env.apiRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Demasiadas solicitudes. Esperá un momento e intentá de nuevo.',
    code: 'RATE_LIMIT_IP',
  },
  keyGenerator: (req) => `api:${clientKey(req)}`,
  handler: limitExceededHandler('api-general'),
});

const childApiUserLimiter = rateLimit({
  windowMs: env.apiChildUserRateLimitWindowMs,
  max: env.apiChildUserRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Demasiadas acciones en poco tiempo con tu cuenta. Hacé una pausa e intentá de nuevo.',
    code: 'RATE_LIMIT_USER',
  },
  keyGenerator: (req) => {
    const a = req.auth;
    if (a?.kind === 'child') return `api-user:child:${a.userId}`;
    return `api-user:child-fallback:${clientKey(req)}`;
  },
  handler: limitExceededHandler('api-user-child'),
});

const parentApiUserLimiter = rateLimit({
  windowMs: env.apiParentUserRateLimitWindowMs,
  max: env.apiParentUserRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Demasiadas solicitudes con tu sesión de tutor. Esperá un momento e intentá de nuevo.',
    code: 'RATE_LIMIT_USER',
  },
  keyGenerator: (req) => {
    const a = req.auth;
    if (a?.kind === 'parent') return `api-user:parent:${a.parentId}`;
    return `api-user:parent-fallback:${clientKey(req)}`;
  },
  handler: limitExceededHandler('api-user-parent'),
});

/**
 * Tras `requireAuth`: límite adicional por cuenta (menor o tutor), independiente de la IP.
 */
export function authenticatedUserRateLimiter(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.auth?.kind === 'parent') {
    parentApiUserLimiter(req, res, next);
    return;
  }
  if (req.auth?.kind === 'child') {
    childApiUserLimiter(req, res, next);
    return;
  }
  next();
}

/** Ráfaga de solicitudes de amistad salientes (solo menor autenticado). */
export const friendRequestBurstLimiter = rateLimit({
  windowMs: env.friendRequestBurstWindowMs,
  max: env.friendRequestBurstMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error:
      'Estás enviando solicitudes de amistad muy seguido. Esperá un minuto e intentá de nuevo.',
    code: 'FRIEND_REQUEST_BURST',
  },
  keyGenerator: (req) => {
    const a = req.auth;
    if (a?.kind === 'child') return `friend-req-burst:${a.userId}`;
    return `friend-req-burst:n:${clientKey(req)}`;
  },
  handler: limitExceededHandler('friend-request-burst'),
});

/** Límite sostenido de solicitudes de amistad salientes en una ventana más larga. */
export const friendRequestWindowLimiter = rateLimit({
  windowMs: env.friendRequestWindowMs,
  max: env.friendRequestMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Llegaste al límite de solicitudes de amistad por ahora. Probá más tarde.',
    code: 'FRIEND_REQUEST_LIMIT',
  },
  keyGenerator: (req) => {
    const a = req.auth;
    if (a?.kind === 'child') return `friend-req-win:${a.userId}`;
    return `friend-req-win:n:${clientKey(req)}`;
  },
  handler: limitExceededHandler('friend-request-window'),
});

/**
 * Operaciones muy sensibles (auth, admin). Por defecto misma ventana/máximo que login/registro
 * (`RATE_LIMIT_STRICT_*` o fallback a `LOGIN_REGISTER_*` vía `env`).
 * Contador por IP: `rl-strict:` (distinto de `login-register:`).
 */
export const strictLimiter = rateLimit({
  windowMs: env.rateLimitStrictWindowMs,
  max: env.rateLimitStrictMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Demasiados intentos en poco tiempo. Esperá e intentá de nuevo.',
    code: 'RATE_LIMIT_STRICT',
  },
  keyGenerator: (req) => `rl-strict:${clientKey(req)}`,
  handler: limitExceededHandler('strict'),
});

/** Operaciones de escritura “normales” (distinto contador a `authWrite` por IP). */
export const mediumLimiter = rateLimit({
  windowMs: env.rateLimitMediumWindowMs,
  max: env.rateLimitMediumMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Límite de solicitudes. Probá de nuevo en unos segundos.',
    code: 'RATE_LIMIT_MEDIUM',
  },
  keyGenerator: (req) => `rl-medium:${clientKey(req)}`,
  handler: limitExceededHandler('medium'),
});

/** Muchas lecturas puntuales (GET) sin compartir contador con el límite general de `/api` si se monta aparte). */
export const generousLimiter = rateLimit({
  windowMs: env.rateLimitGenerousWindowMs,
  max: env.rateLimitGenerousMax,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas consultas. Esperá un momento.', code: 'RATE_LIMIT_GENEROUS' },
  keyGenerator: (req) => `rl-generous:${clientKey(req)}`,
  handler: limitExceededHandler('generous'),
});

/** Denuncias creadas por el mismo menor en 24 h (anti-spam de reportes). */
export const contentReportUserLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: env.contentReportUserMaxPer24h,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Llegaste al límite de denuncias por día. Si hace falta, pedí ayuda a un tutor.',
    code: 'CONTENT_REPORT_LIMIT',
  },
  keyGenerator: (req) => {
    const a = req.auth;
    if (a?.kind === 'child') return `content-report-user:${a.userId}`;
    return `content-report-user:n:${clientKey(req)}`;
  },
  handler: limitExceededHandler('content-report-user'),
});
