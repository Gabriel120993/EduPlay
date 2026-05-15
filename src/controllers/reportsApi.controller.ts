import type { Request, Response } from 'express';
import { logError } from '../lib/logger';
import { prisma } from '../lib/prisma';

function requireChild(req: Request, res: Response): string | null {
  const auth = req.auth;
  if (!auth || auth.kind !== 'child') {
    res.status(403).json({ error: 'Solo menores autenticados.' });
    return null;
  }
  return auth.userId;
}

/** GET /api/reports/my-reports */
export async function getMyContentReports(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;

  try {
    const rows = await prisma.contentReport.findMany({
      where: { reporterUserId: userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ reports: rows });
  } catch (e) {
    logError('reportsApi.myReports', e);
    res.status(500).json({ error: 'Error al listar reportes.' });
  }
}
