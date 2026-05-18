import type { Request, Response } from 'express';
import { z } from 'zod';
import { isPlayGameSlug } from '../games/types';
import { logError } from '../lib/logger';
import { formatZodError } from '../lib/validation/schemas';
import {
  acceptPlayGameChallenge,
  completePlayGameSession,
  createPlayGameChallenge,
  declinePlayGameChallenge,
  forfeitPlayGameSession,
  getPlayGameBySlug,
  getPlayGameHistory,
  getPlayGameLeaderboard,
  getPlayGameSessionState,
  listPlayGameChallenges,
  listPlayGames,
  runPlayGameAction,
  startPlayGameSession,
} from '../services/playGames.service';

function requireChild(req: Request, res: Response): string | null {
  const auth = req.auth;
  if (!auth || auth.kind !== 'child') {
    res.status(403).json({ error: 'Solo menores autenticados.' });
    return null;
  }
  return auth.userId;
}

function mapServiceError(res: Response, e: unknown): void {
  const msg = e instanceof Error ? e.message : 'Error inesperado.';
  if (
    msg.includes('no encontrad') ||
    msg.includes('no válida') ||
    msg.includes('expiró')
  ) {
    res.status(404).json({ error: msg });
    return;
  }
  if (
    msg.includes('autorizado') ||
    msg.includes('turno') ||
    msg.includes('amigos') ||
    msg.includes('bloqueado') ||
    msg.includes('oponente')
  ) {
    res.status(403).json({ error: msg });
    return;
  }
  res.status(400).json({ error: msg });
}

const startSchema = z.object({
  opponentId: z.string().uuid().optional(),
  difficulty: z.coerce.number().int().min(1).max(10).default(3),
  mode: z.enum(['SOLO', 'VERSUS', 'COOPERATIVE', 'DAILY_CHALLENGE']).optional(),
});

const actionSchema = z.object({
  action: z.string().min(1).max(64),
  data: z.record(z.unknown()).default({}),
});

const completeSchema = z.object({
  durationMs: z.coerce.number().int().min(0).max(15 * 60 * 1000),
  wonVersus: z.boolean().optional(),
});

const challengeSchema = z.object({
  gameId: z.string().uuid(),
  opponentId: z.string().uuid(),
});

/** GET /api/play-games */
export async function listPlayGamesHandler(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;
  try {
    const games = await listPlayGames({
      category: typeof req.query.category === 'string' ? req.query.category : undefined,
      type: typeof req.query.type === 'string' ? req.query.type : undefined,
      difficulty:
        req.query.difficulty != null ? Number(req.query.difficulty) : undefined,
    });
    res.json({ games });
  } catch (e) {
    logError('playGames.list', e);
    res.status(500).json({ error: 'Error al listar juegos.' });
  }
}

/** GET /api/play-games/history */
export async function getPlayGameHistoryHandler(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;
  try {
    const sessions = await getPlayGameHistory(userId);
    res.json({ sessions });
  } catch (e) {
    logError('playGames.history', e);
    res.status(500).json({ error: 'Error al obtener historial.' });
  }
}

/** GET /api/play-games/challenges */
export async function listPlayGameChallengesHandler(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;
  try {
    const data = await listPlayGameChallenges(userId);
    res.json(data);
  } catch (e) {
    logError('playGames.challenges', e);
    res.status(500).json({ error: 'Error al listar desafíos.' });
  }
}

/** GET /api/play-games/leaderboard/:slug */
export async function getPlayGameLeaderboardHandler(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;
  const slug = req.params.slug?.trim();
  const period =
    typeof req.query.period === 'string' ? req.query.period : 'all_time';
  if (!slug) {
    res.status(400).json({ error: 'slug inválido.' });
    return;
  }
  try {
    const leaderboard = await getPlayGameLeaderboard(slug, period, userId);
    res.json({ leaderboard });
  } catch (e) {
    mapServiceError(res, e);
  }
}

/** GET /api/play-games/:slug */
export async function getPlayGameDetailHandler(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;
  const slug = req.params.slug?.trim();
  if (!slug || !isPlayGameSlug(slug)) {
    res.status(400).json({ error: 'slug inválido.' });
    return;
  }
  try {
    const game = await getPlayGameBySlug(slug);
    if (!game?.isActive) {
      res.status(404).json({ error: 'Juego no encontrado.' });
      return;
    }
    res.json({
      game,
      rules: game.rules,
      howToPlay: game.rules ?? game.description,
    });
  } catch (e) {
    logError('playGames.detail', e);
    res.status(500).json({ error: 'Error al obtener juego.' });
  }
}

/** POST /api/play-games/:slug/start */
export async function startPlayGameHandler(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;
  const slug = req.params.slug?.trim();
  if (!slug || !isPlayGameSlug(slug)) {
    res.status(400).json({ error: 'slug inválido.' });
    return;
  }
  const parsed = startSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }
  try {
    const result = await startPlayGameSession({
      userId,
      slug,
      opponentId: parsed.data.opponentId,
      difficulty: parsed.data.difficulty,
      mode: parsed.data.mode,
    });
    res.status(201).json(result);
  } catch (e) {
    mapServiceError(res, e);
  }
}

/** POST /api/play-games/:slug/:sessionId/action */
export async function playGameActionHandler(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;
  const sessionId = req.params.sessionId?.trim();
  const slug = req.params.slug?.trim();
  if (!sessionId || !slug) {
    res.status(400).json({ error: 'Parámetros inválidos.' });
    return;
  }
  const parsed = actionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }
  try {
    const result = await runPlayGameAction({
      sessionId,
      userId,
      action: parsed.data.action,
      data: parsed.data.data,
    });
    res.json(result);
  } catch (e) {
    mapServiceError(res, e);
  }
}

/** GET /api/play-games/:slug/:sessionId/state */
export async function getPlayGameStateHandler(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;
  const sessionId = req.params.sessionId?.trim();
  if (!sessionId) {
    res.status(400).json({ error: 'sessionId inválido.' });
    return;
  }
  try {
    const view = await getPlayGameSessionState(sessionId, userId);
    res.json(view);
  } catch (e) {
    mapServiceError(res, e);
  }
}

/** POST /api/play-games/:slug/:sessionId/complete */
export async function completePlayGameHandler(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;
  const sessionId = req.params.sessionId?.trim();
  if (!sessionId) {
    res.status(400).json({ error: 'sessionId inválido.' });
    return;
  }
  const parsed = completeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }
  try {
    const result = await completePlayGameSession({
      sessionId,
      userId,
      durationMs: parsed.data.durationMs,
      wonVersus: parsed.data.wonVersus,
    });
    res.json(result);
  } catch (e) {
    mapServiceError(res, e);
  }
}

/** POST /api/play-games/:slug/:sessionId/forfeit */
export async function forfeitPlayGameHandler(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;
  const sessionId = req.params.sessionId?.trim();
  if (!sessionId) {
    res.status(400).json({ error: 'sessionId inválido.' });
    return;
  }
  try {
    const result = await forfeitPlayGameSession(sessionId, userId);
    res.json(result);
  } catch (e) {
    mapServiceError(res, e);
  }
}

/** POST /api/play-games/challenge */
export async function createPlayGameChallengeHandler(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;
  const parsed = challengeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }
  try {
    const challenge = await createPlayGameChallenge({
      challengerId: userId,
      gameId: parsed.data.gameId,
      opponentId: parsed.data.opponentId,
    });
    res.status(201).json({
      challengeId: challenge.id,
      status: challenge.status,
      expiresAt: challenge.expiresAt.toISOString(),
    });
  } catch (e) {
    mapServiceError(res, e);
  }
}

/** POST /api/play-games/challenge/:challengeId/accept */
export async function acceptPlayGameChallengeHandler(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;
  const challengeId = req.params.challengeId?.trim();
  if (!challengeId) {
    res.status(400).json({ error: 'challengeId inválido.' });
    return;
  }
  try {
    const started = await acceptPlayGameChallenge(challengeId, userId);
    res.json(started);
  } catch (e) {
    mapServiceError(res, e);
  }
}

/** POST /api/play-games/challenge/:challengeId/decline */
export async function declinePlayGameChallengeHandler(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;
  const challengeId = req.params.challengeId?.trim();
  if (!challengeId) {
    res.status(400).json({ error: 'challengeId inválido.' });
    return;
  }
  try {
    const result = await declinePlayGameChallenge(challengeId, userId);
    res.json(result);
  } catch (e) {
    mapServiceError(res, e);
  }
}
