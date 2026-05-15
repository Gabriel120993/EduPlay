import type { Request, Response } from 'express';
import { logError } from '../lib/logger';
import { buildParentCoachPayload } from '../services/coach.service';

/** GET /api/coach/parent/:parentId — guía para padres (contenido curado + señales de actividad). */
export async function getParentCoach(req: Request, res: Response): Promise<void> {
  const parentId = String(req.params.parentId ?? '').trim();
  if (!parentId) {
    res.status(400).json({ error: 'parentId inválido.' });
    return;
  }
  const auth = req.auth;
  if (!auth || auth.kind !== 'parent' || auth.parentId !== parentId) {
    res.status(403).json({ error: 'No autorizado.' });
    return;
  }
  try {
    const payload = await buildParentCoachPayload(parentId);
    res.json(payload);
  } catch (err) {
    logError('coach.getParentCoach', err);
    res.status(500).json({ error: 'Error al cargar la guía para padres.' });
  }
}
