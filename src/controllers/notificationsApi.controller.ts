import type { Request, Response } from "express";
import { z } from "zod";
import { logError } from "../lib/logger";
import { prisma } from "../lib/prisma";
import { formatZodError } from "../lib/validation/schemas";

function requireAuthUserId(req: Request, res: Response): string | null {
  const auth = req.auth;
  if (!auth) {
    res.status(401).json({ error: "No autenticado." });
    return null;
  }
  if (auth.kind === "child") return auth.userId;
  res.status(403).json({ error: "Solo menores tienen bandeja de notificaciones in-app." });
  return null;
}

/** GET /api/notifications */
export async function listNotifications(req: Request, res: Response): Promise<void> {
  const userId = requireAuthUserId(req, res);
  if (!userId) return;

  try {
    const rows = await prisma.appNotification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json({ notifications: rows });
  } catch (e) {
    logError("notificationsApi.list", e);
    res.status(500).json({ error: "Error al listar notificaciones." });
  }
}

/** GET /api/notifications/unread-count */
export async function getUnreadCount(req: Request, res: Response): Promise<void> {
  const userId = requireAuthUserId(req, res);
  if (!userId) return;

  try {
    const count = await prisma.appNotification.count({
      where: { userId, readAt: null },
    });
    res.json({ unreadCount: count });
  } catch (e) {
    logError("notificationsApi.unread", e);
    res.status(500).json({ error: "Error al contar notificaciones." });
  }
}

/** PUT /api/notifications/:notificationId/read */
export async function putNotificationRead(req: Request, res: Response): Promise<void> {
  const userId = requireAuthUserId(req, res);
  if (!userId) return;

  const id = req.params.notificationId?.trim();
  if (!id) {
    res.status(400).json({ error: "notificationId inválido." });
    return;
  }

  try {
    await prisma.appNotification.updateMany({
      where: { id, userId },
      data: { readAt: new Date() },
    });
    res.json({ ok: true });
  } catch (e) {
    logError("notificationsApi.read", e);
    res.status(500).json({ error: "Error al marcar notificación." });
  }
}

/** PUT /api/notifications/read-all */
export async function putNotificationsReadAll(req: Request, res: Response): Promise<void> {
  const userId = requireAuthUserId(req, res);
  if (!userId) return;

  try {
    await prisma.appNotification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    res.json({ ok: true });
  } catch (e) {
    logError("notificationsApi.readAll", e);
    res.status(500).json({ error: "Error al marcar todas." });
  }
}

/** DELETE /api/notifications/:notificationId */
export async function deleteNotification(req: Request, res: Response): Promise<void> {
  const userId = requireAuthUserId(req, res);
  if (!userId) return;

  const id = req.params.notificationId?.trim();
  if (!id) {
    res.status(400).json({ error: "notificationId inválido." });
    return;
  }

  try {
    await prisma.appNotification.deleteMany({ where: { id, userId } });
    res.status(204).send();
  } catch (e) {
    logError("notificationsApi.delete", e);
    res.status(500).json({ error: "Error al eliminar notificación." });
  }
}

/** GET /api/notifications/preferences */
export async function getNotificationPreferences(req: Request, res: Response): Promise<void> {
  const userId = requireAuthUserId(req, res);
  if (!userId) return;

  try {
    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { notificationsEnabled: true, notificationSoundsEnabled: true },
    });
    res.json({ preferences: u });
  } catch (e) {
    logError("notificationsApi.getPrefs", e);
    res.status(500).json({ error: "Error al cargar preferencias." });
  }
}

const prefsSchema = z.object({
  notificationsEnabled: z.boolean().optional(),
  notificationSoundsEnabled: z.boolean().optional(),
});

/** PUT /api/notifications/preferences */
export async function putNotificationPreferences(req: Request, res: Response): Promise<void> {
  const userId = requireAuthUserId(req, res);
  if (!userId) return;

  const parsed = prefsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }

  try {
    const u = await prisma.user.update({
      where: { id: userId },
      data: parsed.data,
      select: { notificationsEnabled: true, notificationSoundsEnabled: true },
    });
    res.json({ preferences: u });
  } catch (e) {
    logError("notificationsApi.putPrefs", e);
    res.status(500).json({ error: "Error al actualizar preferencias." });
  }
}
