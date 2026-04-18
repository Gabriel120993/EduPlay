import type { Request, Response } from "express";
import { z } from "zod";
import { logError } from "../lib/logger";
import { prisma } from "../lib/prisma";
import { formatZodError } from "../lib/validation/schemas";

function requireChild(req: Request, res: Response): string | null {
  const auth = req.auth;
  if (!auth || auth.kind !== "child") {
    res.status(403).json({ error: "Solo menores autenticados." });
    return null;
  }
  return auth.userId;
}

/** GET /api/games */
export async function listMiniGames(_req: Request, res: Response): Promise<void> {
  try {
    const rows = await prisma.miniGame.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    res.json({ games: rows });
  } catch (e) {
    logError("gamesApi.list", e);
    res.status(500).json({ error: "Error al listar juegos." });
  }
}

/** GET /api/games/:gameId */
export async function getMiniGameDetail(req: Request, res: Response): Promise<void> {
  const gameId = req.params.gameId?.trim();
  if (!gameId) {
    res.status(400).json({ error: "gameId inválido." });
    return;
  }
  try {
    const game = await prisma.miniGame.findUnique({ where: { id: gameId } });
    if (!game || !game.isActive) {
      res.status(404).json({ error: "Juego no encontrado." });
      return;
    }
    res.json({ game });
  } catch (e) {
    logError("gamesApi.detail", e);
    res.status(500).json({ error: "Error al obtener juego." });
  }
}

const sessionCreateSchema = z.object({
  levelIndex: z.coerce.number().int().min(0).optional(),
});

/** POST /api/games/:gameId/sessions */
export async function postCreateGameSession(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;

  const gameId = req.params.gameId?.trim();
  if (!gameId) {
    res.status(400).json({ error: "gameId inválido." });
    return;
  }

  const parsed = sessionCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }

  try {
    const game = await prisma.miniGame.findUnique({ where: { id: gameId } });
    if (!game || !game.isActive) {
      res.status(404).json({ error: "Juego no encontrado." });
      return;
    }

    const session = await prisma.miniGameSession.create({
      data: {
        userId,
        miniGameId: gameId,
        score: 0,
        levelIndex: parsed.data.levelIndex ?? 0,
        metadata: {},
      },
    });
    res.status(201).json({ session });
  } catch (e) {
    logError("gamesApi.createSession", e);
    res.status(500).json({ error: "Error al crear sesión." });
  }
}

const sessionUpdateSchema = z.object({
  score: z.coerce.number().int().optional(),
  levelIndex: z.coerce.number().int().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/** PUT /api/games/sessions/:sessionId */
export async function putUpdateGameSession(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;

  const sessionId = req.params.sessionId?.trim();
  if (!sessionId) {
    res.status(400).json({ error: "sessionId inválido." });
    return;
  }

  const parsed = sessionUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }

  try {
    const existing = await prisma.miniGameSession.findFirst({
      where: { id: sessionId, userId },
    });
    if (!existing) {
      res.status(404).json({ error: "Sesión no encontrada." });
      return;
    }
    if (existing.endedAt) {
      res.status(409).json({ error: "La sesión ya finalizó." });
      return;
    }

    const session = await prisma.miniGameSession.update({
      where: { id: sessionId },
      data: {
        ...(parsed.data.score != null ? { score: parsed.data.score } : {}),
        ...(parsed.data.levelIndex != null ? { levelIndex: parsed.data.levelIndex } : {}),
        ...(parsed.data.metadata != null ? { metadata: parsed.data.metadata as never } : {}),
      },
    });
    res.json({ session });
  } catch (e) {
    logError("gamesApi.updateSession", e);
    res.status(500).json({ error: "Error al actualizar sesión." });
  }
}

/** POST /api/games/sessions/:sessionId/finish */
export async function postFinishGameSession(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;

  const sessionId = req.params.sessionId?.trim();
  if (!sessionId) {
    res.status(400).json({ error: "sessionId inválido." });
    return;
  }

  try {
    const existing = await prisma.miniGameSession.findFirst({
      where: { id: sessionId, userId },
    });
    if (!existing) {
      res.status(404).json({ error: "Sesión no encontrada." });
      return;
    }
    if (existing.endedAt) {
      res.status(409).json({ error: "La sesión ya finalizó." });
      return;
    }

    const session = await prisma.miniGameSession.update({
      where: { id: sessionId },
      data: { endedAt: new Date() },
    });
    res.json({ session });
  } catch (e) {
    logError("gamesApi.finishSession", e);
    res.status(500).json({ error: "Error al finalizar sesión." });
  }
}

/** GET /api/games/my-sessions */
export async function getMyGameSessions(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;

  try {
    const rows = await prisma.miniGameSession.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      take: 40,
      include: { miniGame: { select: { id: true, name: true, slug: true } } },
    });
    res.json({ sessions: rows });
  } catch (e) {
    logError("gamesApi.mySessions", e);
    res.status(500).json({ error: "Error al listar sesiones." });
  }
}

/** GET /api/games/leaderboard/:gameId */
export async function getGameLeaderboard(req: Request, res: Response): Promise<void> {
  const gameId = req.params.gameId?.trim();
  if (!gameId) {
    res.status(400).json({ error: "gameId inválido." });
    return;
  }

  try {
    const rows = await prisma.miniGameSession.findMany({
      where: { miniGameId: gameId, endedAt: { not: null } },
      orderBy: { score: "desc" },
      take: 30,
      include: {
        user: { select: { id: true, username: true, realName: true, avatarUrl: true } },
      },
    });
    res.json({
      leaderboard: rows.map((r, i) => ({
        rank: i + 1,
        score: r.score,
        user: r.user,
        endedAt: r.endedAt?.toISOString() ?? null,
      })),
    });
  } catch (e) {
    logError("gamesApi.leaderboard", e);
    res.status(500).json({ error: "Error al cargar ranking." });
  }
}
