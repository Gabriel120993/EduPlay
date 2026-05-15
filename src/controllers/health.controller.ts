import type { Request, Response } from 'express';

import { CONTENT_CATEGORY_VALUES } from '../lib/contentCategory';
import { prisma } from '../lib/prisma';

export async function getHealth(_req: Request, res: Response): Promise<void> {
  const checks = {
    api: 'ok' as const,
    database: 'unknown' as 'ok' | 'error' | 'skipped',
    timestamp: new Date().toISOString(),
  };

  /** En tests de integración Prisma suele estar mockeado o sin Postgres local. */
  if (process.env.NODE_ENV === 'test') {
    checks.database = 'skipped';
    res.json({ status: 'ok', ...checks });
    return;
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
    res.status(503).json({ status: 'degraded', ...checks });
    return;
  }

  res.json({ status: 'ok', ...checks });
}

/** Readiness: proceso listo para recibir tráfico (sin comprobar dependencias profundas). */
export function getReady(_req: Request, res: Response): void {
  res.json({ ready: true, timestamp: new Date().toISOString() });
}

/** Catálogo canónico de categorías (mismo enum que BD y validaciones). */
export function getContentCategories(_req: Request, res: Response): void {
  res.json({ categories: CONTENT_CATEGORY_VALUES });
}
