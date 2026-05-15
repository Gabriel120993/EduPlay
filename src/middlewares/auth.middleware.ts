import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { verifyAuthToken, type VerifiedAuth } from '../lib/auth';
import { logSuspicious } from '../lib/logger';

const PUBLIC_PATHS = new Set([
  '/',
  '/api/health',
  '/api/content-categories',
  '/api/auth/register',
  '/api/auth/register/parent',
  /** Alta menor: JWT lo valida `validateJwtMiddleware` en la ruta; no exigir `req.auth` aquí. */
  '/api/auth/register/minor',
  '/api/auth/login',
  '/api/auth/login-child',
  '/api/auth/login/minor-code',
  '/api/auth/minor/login-with-code',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  /** Alias de registro (mismo handler que `/api/auth/register`). */
  '/api/parents',
  '/api/parents/',
  '/auth/register',
  '/auth/register/parent',
  '/auth/register/minor',
  '/auth/login',
  '/auth/login-child',
  '/auth/login/minor-code',
  '/auth/minor/login-with-code',
  '/auth/forgot-password',
  '/auth/reset-password',
]);

function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.has(path);
}

export function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}

function applyVerifiedPayload(req: Request, payload: VerifiedAuth): void {
  req.auth =
    payload.kind === 'parent'
      ? { kind: 'parent', parentId: payload.parentId, email: payload.email }
      : { kind: 'child', userId: payload.userId, username: payload.username };
  req.role = payload.kind === 'parent' ? 'parent' : 'child';
}

/**
 * Verifica JWT sin registrar el token. Responde 401 y devuelve null si falla.
 */
function tryVerifyJwt(req: Request, res: Response): VerifiedAuth | null {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: 'No autenticado.' });
    return null;
  }

  try {
    return verifyAuthToken(token);
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expirado.' });
      return null;
    }
    if (err instanceof jwt.NotBeforeError) {
      res.status(401).json({ error: 'Token aún no válido.' });
      return null;
    }
    if (err instanceof jwt.JsonWebTokenError) {
      logSuspicious('jwt_invalid', {
        path: req.path,
        method: req.method,
        reason: err.message,
      });
    } else {
      logSuspicious('jwt_verify_error', { path: req.path, method: req.method });
    }
    res.status(401).json({ error: 'Token inválido.' });
    return null;
  }
}

/**
 * Valida el JWT del header `Authorization: Bearer …`, rellena `req.auth` / `req.role` o responde 401.
 * Para rutas montadas antes del `requireAuth` global (p. ej. `GET /auth/me`).
 */
export function validateJwtMiddleware(req: Request, res: Response, next: NextFunction): void {
  const payload = tryVerifyJwt(req, res);
  if (!payload) return;
  applyVerifiedPayload(req, payload);
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.method === 'OPTIONS' || isPublicPath(req.path)) {
    next();
    return;
  }

  const payload = tryVerifyJwt(req, res);
  if (!payload) return;
  applyVerifiedPayload(req, payload);
  next();
}
