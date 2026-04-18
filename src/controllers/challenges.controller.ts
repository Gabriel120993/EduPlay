import type { Request, Response } from "express";
import { ChallengeBucket } from "@prisma/client";

import { logError } from "../lib/logger";
import { prisma } from "../lib/prisma";
import {
  applyGamifiedChallengeProgress,
  buildChallengeNotificationBlueprint,
  listGamifiedChallengesForUser,
} from "../services/challenges.service";

function assertChildSelf(req: Request, userId: string): boolean {
  const auth = req.auth;
  return Boolean(auth && auth.kind === "child" && auth.userId === userId);
}

async function ensureUserExists(userId: string): Promise<boolean> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  return Boolean(u);
}

function parseBucket(raw: unknown): ChallengeBucket | null {
  if (raw === "DAILY") return ChallengeBucket.DAILY;
  if (raw === "WEEKLY") return ChallengeBucket.WEEKLY;
  if (raw === "SPECIAL") return ChallengeBucket.SPECIAL;
  return null;
}

/** Retos diarios (3 rotativos), metas y progreso persistido. */
export async function getChallengesDaily(req: Request, res: Response): Promise<void> {
  const userId = req.params.id?.trim() ?? "";
  if (!userId) {
    res.status(400).json({ error: "id de usuario es obligatorio." });
    return;
  }
  if (!assertChildSelf(req, userId)) {
    res.status(403).json({ error: "Solo el menor puede consultar sus retos." });
    return;
  }

  try {
    if (!(await ensureUserExists(userId))) {
      res.status(404).json({ error: "Usuario no encontrado." });
      return;
    }
    const pack = await listGamifiedChallengesForUser(userId);
    res.json({
      dateKey: pack.dateKey,
      challenges: pack.daily.map((c) => ({
        id: c.id,
        slug: c.challengeSlug,
        title: c.title,
        description: c.description,
        target: c.target,
        progress: c.progress,
        completed: c.completed,
        completedAt: c.completedAt?.toISOString() ?? null,
        rewardsGranted: c.rewardsGranted,
      })),
    });
  } catch (err) {
    logError("challenges.daily", err);
    res.status(500).json({ error: "Error al obtener los retos diarios." });
  }
}

/** Reto semanal grande (1 por semana lunes UTC). */
export async function getChallengesWeekly(req: Request, res: Response): Promise<void> {
  const userId = req.params.id?.trim() ?? "";
  if (!userId) {
    res.status(400).json({ error: "id de usuario es obligatorio." });
    return;
  }
  if (!assertChildSelf(req, userId)) {
    res.status(403).json({ error: "Solo el menor puede consultar sus retos." });
    return;
  }

  try {
    if (!(await ensureUserExists(userId))) {
      res.status(404).json({ error: "Usuario no encontrado." });
      return;
    }
    const pack = await listGamifiedChallengesForUser(userId);
    const w = pack.weekly;
    if (!w) {
      res.json({ mondayKey: pack.mondayKey, challenge: null });
      return;
    }
    res.json({
      mondayKey: pack.mondayKey,
      challenge: {
        id: w.id,
        slug: w.challengeSlug,
        title: w.title,
        description: w.description,
        target: w.target,
        progress: w.progress,
        completed: w.completed,
        completedAt: w.completedAt?.toISOString() ?? null,
        rewardsGranted: w.rewardsGranted,
      },
    });
  } catch (err) {
    logError("challenges.weekly", err);
    res.status(500).json({ error: "Error al obtener el reto semanal." });
  }
}

/** Retos especiales de eventos activos en la ventana calendario configurada. */
export async function getChallengesSpecials(req: Request, res: Response): Promise<void> {
  const userId = req.params.id?.trim() ?? "";
  if (!userId) {
    res.status(400).json({ error: "id de usuario es obligatorio." });
    return;
  }
  if (!assertChildSelf(req, userId)) {
    res.status(403).json({ error: "Solo el menor puede consultar sus retos." });
    return;
  }

  try {
    if (!(await ensureUserExists(userId))) {
      res.status(404).json({ error: "Usuario no encontrado." });
      return;
    }
    const pack = await listGamifiedChallengesForUser(userId);
    res.json({
      challenges: pack.specials.map((c) => ({
        id: c.id,
        periodKey: c.periodKey,
        slug: c.challengeSlug,
        title: c.title,
        description: c.description,
        target: c.target,
        progress: c.progress,
        completed: c.completed,
        completedAt: c.completedAt?.toISOString() ?? null,
        rewardsGranted: c.rewardsGranted,
      })),
    });
  } catch (err) {
    logError("challenges.specials", err);
    res.status(500).json({ error: "Error al obtener los retos especiales." });
  }
}

/**
 * Plan de notificaciones locales / push (plantillas).
 * - 9:00 recordatorio de retos del día.
 * - 20:00 recordatorio antes de cerrar el día.
 * - Celebración al completar (payload sugerido para animación especial en app).
 */
export async function getChallengesNotifications(req: Request, res: Response): Promise<void> {
  const userId = req.params.id?.trim() ?? "";
  if (!userId) {
    res.status(400).json({ error: "id de usuario es obligatorio." });
    return;
  }
  if (!assertChildSelf(req, userId)) {
    res.status(403).json({ error: "Solo el menor puede consultar sus retos." });
    return;
  }

  try {
    if (!(await ensureUserExists(userId))) {
      res.status(404).json({ error: "Usuario no encontrado." });
      return;
    }
    const blueprint = buildChallengeNotificationBlueprint();
    res.json({
      userId,
      ...blueprint,
      notes: [
        "Programá estas notificaciones en hora local del dispositivo (expo-notifications) o enviá push desde un cron con la zona del usuario.",
        "Al completar un reto, usá celebrationDefaults y el campo rewardsGranted.celebration devuelto en /progress.",
      ],
    });
  } catch (err) {
    logError("challenges.notifications", err);
    res.status(500).json({ error: "Error al armar el plan de notificaciones." });
  }
}

/** Resumen: diarios + semanal + especiales + catálogo de recompensas. */
export async function getChallengesOverview(req: Request, res: Response): Promise<void> {
  const userId = req.params.id?.trim() ?? "";
  if (!userId) {
    res.status(400).json({ error: "id de usuario es obligatorio." });
    return;
  }
  if (!assertChildSelf(req, userId)) {
    res.status(403).json({ error: "Solo el menor puede consultar sus retos." });
    return;
  }

  try {
    if (!(await ensureUserExists(userId))) {
      res.status(404).json({ error: "Usuario no encontrado." });
      return;
    }
    const pack = await listGamifiedChallengesForUser(userId);
    const notifications = buildChallengeNotificationBlueprint();
    res.json({
      dateKey: pack.dateKey,
      mondayKey: pack.mondayKey,
      daily: pack.daily,
      weekly: pack.weekly,
      specials: pack.specials,
      rewards: pack.rewards,
      notifications,
    });
  } catch (err) {
    logError("challenges.overview", err);
    res.status(500).json({ error: "Error al obtener el resumen de retos." });
  }
}

/**
 * Actualiza progreso de un reto (la app debe invocarlo cuando ocurren acciones relevantes).
 * Body: `{ bucket: "DAILY"|"WEEKLY"|"SPECIAL", challengeSlug: string, increment?: number, setProgress?: number }`
 */
export async function postChallengeProgress(req: Request, res: Response): Promise<void> {
  const userId = req.params.id?.trim() ?? "";
  if (!userId) {
    res.status(400).json({ error: "id de usuario es obligatorio." });
    return;
  }
  if (!assertChildSelf(req, userId)) {
    res.status(403).json({ error: "Solo el menor puede actualizar sus retos." });
    return;
  }

  const body = req.body as {
    bucket?: unknown;
    challengeSlug?: unknown;
    increment?: unknown;
    setProgress?: unknown;
  };

  const bucket = parseBucket(body.bucket);
  const slug = typeof body.challengeSlug === "string" ? body.challengeSlug.trim() : "";
  if (!bucket || !slug) {
    res.status(400).json({ error: "bucket y challengeSlug son obligatorios." });
    return;
  }

  const increment =
    body.increment == null ? undefined : Number.isFinite(Number(body.increment)) ? Number(body.increment) : NaN;
  const setProgress =
    body.setProgress == null ? undefined : Number.isFinite(Number(body.setProgress)) ? Number(body.setProgress) : NaN;
  if (increment !== undefined && (Number.isNaN(increment) || increment < 0)) {
    res.status(400).json({ error: "increment inválido." });
    return;
  }
  if (setProgress !== undefined && (Number.isNaN(setProgress) || setProgress < 0)) {
    res.status(400).json({ error: "setProgress inválido." });
    return;
  }
  if (increment === undefined && setProgress === undefined) {
    res.status(400).json({ error: "increment o setProgress es obligatorio." });
    return;
  }

  try {
    if (!(await ensureUserExists(userId))) {
      res.status(404).json({ error: "Usuario no encontrado." });
      return;
    }
    const result = await applyGamifiedChallengeProgress({
      userId,
      bucket,
      challengeSlug: slug,
      increment,
      setProgress,
    });
    res.json(result);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "INVALID_PROGRESS_DELTA") {
        res.status(400).json({ error: "Progreso inválido." });
        return;
      }
      if (err.message === "SPECIAL_NOT_ACTIVE") {
        res.status(400).json({ error: "Este reto especial no está activo en la fecha actual." });
        return;
      }
      if (err.message === "CHALLENGE_ROW_NOT_FOUND") {
        res.status(404).json({ error: "No existe el reto para el periodo actual." });
        return;
      }
      if (err.message === "UNKNOWN_CHALLENGE_DEF") {
        res.status(400).json({ error: "Reto desconocido." });
        return;
      }
    }
    logError("challenges.progress", err);
    res.status(500).json({ error: "Error al actualizar el progreso del reto." });
  }
}
