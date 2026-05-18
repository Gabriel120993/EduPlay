import type { Request, Response } from 'express';
import { listSocialFriendStreaks } from '../services/socialStreak.service';

function requireChild(req: Request, res: Response): string | null {
  const auth = req.auth;
  if (!auth || auth.kind !== 'child') {
    res.status(403).json({ error: 'Solo menores autenticados.' });
    return null;
  }
  return auth.userId;
}

/** GET /api/social-streaks */
export async function getSocialStreaks(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;
  try {
    const streaks = await listSocialFriendStreaks(userId);
    res.json({ streaks });
  } catch {
    res.status(500).json({ error: 'Error al cargar rachas.' });
  }
}
