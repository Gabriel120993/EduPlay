import type { NextFunction, Request, Response } from 'express';
import { logError } from '../lib/logger';

type CacheEntry = {
  body: unknown;
  status: number;
  contentType: string;
  expiresAt: number;
};

const store = new Map<string, CacheEntry>();

function cacheKey(req: Request, userKey: string): string {
  return `${req.method}:${req.originalUrl || req.url}:${userKey}`;
}

function userKeyFromRequest(req: Request): string {
  const a = req.auth;
  if (a?.kind === 'child') return `u:${a.userId}`;
  if (a?.kind === 'parent') return `p:${a.parentId}`;
  return 'anon';
}

/**
 * Cache en memoria para respuestas GET (por usuario / IP anónima).
 * No compartir entre instancias en clúster; considerá Redis en producción multi-replica.
 */
export function cacheResponse(durationSeconds: number) {
  const ttlMs = Math.max(1, Math.floor(durationSeconds * 1000));

  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.method !== 'GET') {
      next();
      return;
    }

    const key = cacheKey(req, userKeyFromRequest(req));
    const now = Date.now();
    const hit = store.get(key);
    if (hit && hit.expiresAt > now) {
      res.setHeader('X-Cache', 'HIT');
      res.setHeader('Content-Type', hit.contentType);
      res.status(hit.status).json(hit.body);
      return;
    }

    if (hit) {
      store.delete(key);
    }

    const originalJson = res.json.bind(res);
    res.json = function jsonOverride(body: unknown) {
      const storedAt = Date.now();
      try {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const ct = res.getHeader('content-type');
          const contentType = typeof ct === 'string' ? ct : 'application/json; charset=utf-8';
          store.set(key, {
            body,
            status: res.statusCode,
            contentType,
            expiresAt: storedAt + ttlMs,
          });
        }
      } catch (e) {
        logError('cache.store', e);
      }
      res.setHeader('X-Cache', 'MISS');
      return originalJson(body);
    };

    res.setHeader('X-Cache', 'MISS');
    next();
  };
}

/**
 * Elimina entradas cuyas claves coincidan con un prefijo o una expresión regular.
 * Útil tras mutaciones (POST/PUT/DELETE) sobre recursos que invalidan listados cacheados.
 */
export function invalidateCache(pattern: string | RegExp): void {
  const re = typeof pattern === 'string' ? new RegExp(`^${escapeRegex(pattern)}`) : pattern;
  for (const key of store.keys()) {
    if (re.test(key)) {
      store.delete(key);
    }
  }
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Limpia todo el cache (tests o mantenimiento). */
export function clearResponseCache(): void {
  store.clear();
}
