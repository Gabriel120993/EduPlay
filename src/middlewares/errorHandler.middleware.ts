import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { env } from '../config/env';
import { logError, logSuspicious } from '../lib/logger';

/** Error HTTP explícito para controladores y middlewares. */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

function newRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Debe montarse **al final** de la cadena de middlewares (después de todas las rutas).
 * Captura errores pasados con `next(err)` y respuestas no manejadas.
 */
export function errorHandlerMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (res.headersSent) {
    return;
  }

  const requestId = req.requestId ?? newRequestId();

  if (err instanceof HttpError) {
    if (err.status >= 500) {
      logError('http', err, { requestId, code: err.code, path: req.path, method: req.method });
    } else {
      logSuspicious('http_client_error', {
        requestId,
        status: err.status,
        code: err.code,
        path: req.path,
        method: req.method,
        message: err.message,
      });
    }
    res.status(err.status).json({
      error: err.message,
      ...(err.code ? { code: err.code } : {}),
      ...(err.details != null ? { details: err.details } : {}),
      requestId,
    });
    return;
  }

  if (err instanceof Error && err.message.startsWith('CORS:')) {
    logSuspicious('cors_blocked', {
      requestId,
      path: req.path,
      method: req.method,
      message: err.message,
    });
    res.status(403).json({
      error: err.message,
      code: 'CORS_NOT_ALLOWED',
      requestId,
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    logError('prisma', err, { requestId, path: req.path, code: err.code });
    if (err.code === 'P2002') {
      res.status(409).json({
        error: 'Conflicto con datos existentes.',
        code: 'UNIQUE_VIOLATION',
        requestId,
      });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Registro no encontrado.', code: 'NOT_FOUND', requestId });
      return;
    }
    res.status(500).json({ error: 'Error de base de datos.', code: 'DATABASE_ERROR', requestId });
    return;
  }

  const message = err instanceof Error ? err.message : 'Error inesperado.';
  logError('unhandled', err instanceof Error ? err : new Error(String(err)), {
    requestId,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    error: env.isProduction ? 'Error interno del servidor.' : message,
    code: 'INTERNAL_ERROR',
    requestId,
  });
}

/** Ruta no encontrada (montar justo antes de `errorHandlerMiddleware`). */
export function notFoundHandler(req: Request, res: Response): void {
  const requestId = req.requestId ?? newRequestId();
  res.status(404).json({
    error: 'Ruta no encontrada.',
    code: 'NOT_FOUND',
    requestId,
  });
}
