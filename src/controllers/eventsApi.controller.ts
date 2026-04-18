import type { Request, Response } from "express";
import { LiveEventStatus } from "@prisma/client";
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

/** GET /api/events/upcoming */
export async function getUpcomingEvents(_req: Request, res: Response): Promise<void> {
  try {
    const now = new Date();
    const rows = await prisma.liveEvent.findMany({
      where: { startsAt: { gte: now }, status: { not: LiveEventStatus.CANCELLED } },
      orderBy: { startsAt: "asc" },
      take: 30,
    });
    res.json({ events: rows });
  } catch (e) {
    logError("eventsApi.upcoming", e);
    res.status(500).json({ error: "Error al listar eventos." });
  }
}

/** GET /api/events/live */
export async function getLiveEventsNow(_req: Request, res: Response): Promise<void> {
  try {
    const now = new Date();
    const rows = await prisma.liveEvent.findMany({
      where: {
        status: LiveEventStatus.LIVE,
        startsAt: { lte: now },
        endsAt: { gte: now },
      },
    });
    res.json({ events: rows });
  } catch (e) {
    logError("eventsApi.live", e);
    res.status(500).json({ error: "Error al listar eventos en vivo." });
  }
}

/** GET /api/events/:eventId */
export async function getEventDetail(req: Request, res: Response): Promise<void> {
  const eventId = req.params.eventId?.trim();
  if (!eventId) {
    res.status(400).json({ error: "eventId inválido." });
    return;
  }
  try {
    const ev = await prisma.liveEvent.findUnique({ where: { id: eventId } });
    if (!ev) {
      res.status(404).json({ error: "Evento no encontrado." });
      return;
    }
    res.json({ event: ev });
  } catch (e) {
    logError("eventsApi.detail", e);
    res.status(500).json({ error: "Error al obtener evento." });
  }
}

/** POST /api/events/:eventId/join */
export async function postJoinEvent(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;

  const eventId = req.params.eventId?.trim();
  if (!eventId) {
    res.status(400).json({ error: "eventId inválido." });
    return;
  }

  try {
    await prisma.liveEventAttendee.upsert({
      where: { eventId_userId: { eventId, userId } },
      create: { eventId, userId },
      update: {},
    });
    res.status(201).json({ ok: true });
  } catch (e) {
    logError("eventsApi.join", e);
    res.status(500).json({ error: "Error al unirse al evento." });
  }
}

/** POST /api/events/:eventId/leave */
export async function postLeaveEvent(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;

  const eventId = req.params.eventId?.trim();
  if (!eventId) {
    res.status(400).json({ error: "eventId inválido." });
    return;
  }

  try {
    await prisma.liveEventAttendee.deleteMany({ where: { eventId, userId } });
    res.json({ ok: true });
  } catch (e) {
    logError("eventsApi.leave", e);
    res.status(500).json({ error: "Error al salir del evento." });
  }
}

const answerSchema = z.object({
  answerIndex: z.coerce.number().int().min(0).max(20),
});

/** POST /api/events/:eventId/answer */
export async function postEventTriviaAnswer(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;

  const eventId = req.params.eventId?.trim();
  if (!eventId) {
    res.status(400).json({ error: "eventId inválido." });
    return;
  }

  const parsed = answerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }

  try {
    await prisma.analyticsEvent.create({
      data: {
        userId,
        eventName: "live_event_trivia_answer",
        metadata: { eventId, answerIndex: parsed.data.answerIndex },
      },
    });
    res.status(201).json({ ok: true, recorded: true });
  } catch (e) {
    logError("eventsApi.answer", e);
    res.status(500).json({ error: "Error al enviar respuesta." });
  }
}

/** GET /api/events/:eventId/leaderboard */
export async function getEventLeaderboard(req: Request, res: Response): Promise<void> {
  const eventId = req.params.eventId?.trim();
  if (!eventId) {
    res.status(400).json({ error: "eventId inválido." });
    return;
  }

  try {
    const rows = await prisma.analyticsEvent.findMany({
      where: { eventName: "live_event_trivia_answer" },
      take: 500,
    });
    const filtered = rows.filter((r) => {
      const m = r.metadata as { eventId?: string } | null;
      return m?.eventId === eventId;
    });
    const scores = new Map<string, number>();
    for (const r of filtered) {
      const uid = r.userId;
      if (!uid) continue;
      scores.set(uid, (scores.get(uid) ?? 0) + 1);
    }
    const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);
    const users = await prisma.user.findMany({
      where: { id: { in: sorted.map((s) => s[0]) } },
      select: { id: true, username: true, avatarUrl: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));
    res.json({
      leaderboard: sorted.map(([id, score], i) => ({
        rank: i + 1,
        score,
        user: byId.get(id),
      })),
    });
  } catch (e) {
    logError("eventsApi.leaderboard", e);
    res.status(500).json({ error: "Error al cargar ranking del evento." });
  }
}
