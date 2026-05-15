import type { Request, Response } from 'express';
import { ActivityApprovalStatus, ContentFilterLevel } from '@prisma/client';
import { z } from 'zod';
import { logError } from '../lib/logger';
import { prisma } from '../lib/prisma';
import { formatZodError, uuidSchema } from '../lib/validation/schemas';
import { listPendingApprovalsForParent, resolveParentUserId } from '../services/parents.service';
import { parentResourceId } from './parent.controller';

const respondApprovalSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  note: z.string().trim().max(500).optional(),
});

const settingsPutSchema = z.object({
  defaultDailyScreenTimeLimit: z.coerce.number().int().min(15).max(480).optional(),
  notifyParentNewContact: z.boolean().optional(),
  notifyParentSuspiciousChat: z.boolean().optional(),
});

/** GET /api/parents/:parentId/approvals */
export async function listPendingApprovals(req: Request, res: Response): Promise<void> {
  const parentId = parentResourceId(req);
  if (!parentId) {
    res.status(400).json({ error: 'parentId es obligatorio.' });
    return;
  }
  const auth = req.auth;
  if (auth?.kind !== 'parent' || auth.parentId !== parentId) {
    res.status(403).json({ error: 'No autorizado.' });
    return;
  }

  try {
    const parentUserId = await resolveParentUserId(parentId);
    if (!parentUserId) {
      res.status(400).json({ error: 'Perfil tutor no encontrado.' });
      return;
    }

    const rows = await listPendingApprovalsForParent(parentUserId);

    res.json({
      approvals: rows.map((r) => ({
        id: r.id,
        activityType: r.activityType,
        activityData: r.activityData,
        requestedAt: r.requestedAt.toISOString(),
        minor: r.minor,
      })),
    });
  } catch (e) {
    logError('parentsApi.listPendingApprovals', e);
    res.status(500).json({ error: 'Error al listar solicitudes.' });
  }
}

/** POST /api/parents/:parentId/approvals/:approvalId/respond */
export async function respondToApproval(req: Request, res: Response): Promise<void> {
  const parentId = parentResourceId(req);
  const approvalId = req.params.approvalId?.trim();
  if (!parentId || !approvalId) {
    res.status(400).json({ error: 'Parámetros inválidos.' });
    return;
  }
  const auth = req.auth;
  if (auth?.kind !== 'parent' || auth.parentId !== parentId) {
    res.status(403).json({ error: 'No autorizado.' });
    return;
  }

  const parsed = respondApprovalSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }

  try {
    const parentUserId = await resolveParentUserId(parentId);
    if (!parentUserId) {
      res.status(400).json({ error: 'Perfil tutor no encontrado.' });
      return;
    }

    const row = await prisma.activityApproval.findFirst({
      where: { id: approvalId, parentId: parentUserId },
    });
    if (!row) {
      res.status(404).json({ error: 'Solicitud no encontrada.' });
      return;
    }
    if (row.status !== ActivityApprovalStatus.pending) {
      res.status(409).json({ error: 'La solicitud ya fue procesada.' });
      return;
    }

    const status =
      parsed.data.decision === 'approved'
        ? ActivityApprovalStatus.approved
        : ActivityApprovalStatus.rejected;

    await prisma.activityApproval.update({
      where: { id: approvalId },
      data: {
        status,
        respondedAt: new Date(),
        activityData: {
          ...(typeof row.activityData === 'object' && row.activityData
            ? (row.activityData as object)
            : {}),
          ...(parsed.data.note ? { parentNote: parsed.data.note } : {}),
        },
      },
    });

    res.json({ ok: true, status });
  } catch (e) {
    logError('parentsApi.respondToApproval', e);
    res.status(500).json({ error: 'Error al responder la solicitud.' });
  }
}

/** GET /api/parents/:parentId/reports — resumen semanal simple por menor (analytics). */
export async function getParentMinorWeeklyReports(req: Request, res: Response): Promise<void> {
  const parentId = parentResourceId(req);
  if (!parentId) {
    res.status(400).json({ error: 'parentId es obligatorio.' });
    return;
  }
  const auth = req.auth;
  if (auth?.kind !== 'parent' || auth.parentId !== parentId) {
    res.status(403).json({ error: 'No autorizado.' });
    return;
  }

  try {
    const children = await prisma.user.findMany({
      where: { parentId, type: 'minor' },
      select: { id: true, username: true },
    });
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const reports = await Promise.all(
      children.map(async (c) => {
        const events = await prisma.analyticsEvent.findMany({
          where: { userId: c.id, createdAt: { gte: since } },
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: { eventName: true, metadata: true, createdAt: true },
        });
        return {
          minorId: c.id,
          username: c.username,
          windowDays: 7,
          events,
        };
      }),
    );
    res.json({ reports });
  } catch (e) {
    logError('parentsApi.getParentMinorWeeklyReports', e);
    res.status(500).json({ error: 'Error al cargar reportes.' });
  }
}

/** GET /api/parents/:parentId/settings */
export async function getParentSettingsBundle(req: Request, res: Response): Promise<void> {
  const parentId = parentResourceId(req);
  if (!parentId) {
    res.status(400).json({ error: 'parentId es obligatorio.' });
    return;
  }
  const auth = req.auth;
  if (auth?.kind !== 'parent' || auth.parentId !== parentId) {
    res.status(403).json({ error: 'No autorizado.' });
    return;
  }

  try {
    const children = await prisma.user.findMany({
      where: { parentId, type: 'minor' },
      select: { id: true, username: true },
    });
    const settingsRows =
      children.length === 0
        ? []
        : await prisma.parentSettings.findMany({
            where: { childId: { in: children.map((c) => c.id) } },
          });
    const byChild = new Map(settingsRows.map((s) => [s.childId, s]));

    res.json({
      parentId,
      children: children.map((c) => {
        const s = byChild.get(c.id);
        return {
          minorId: c.id,
          username: c.username,
          settings: s
            ? {
                dailyScreenTimeLimit: s.dailyScreenTimeLimit,
                allowPosting: s.allowPosting,
                allowFriends: s.allowFriends,
                chatEnabled: s.chatEnabled,
                parentChatSupervisionEnabled: s.parentChatSupervisionEnabled,
                notifyParentNewContact: s.notifyParentNewContact,
                notifyParentSuspiciousChat: s.notifyParentSuspiciousChat,
                contentFilterLevel: s.contentFilterLevel,
              }
            : null,
        };
      }),
    });
  } catch (e) {
    logError('parentsApi.getParentSettingsBundle', e);
    res.status(500).json({ error: 'Error al cargar configuración.' });
  }
}

/** PUT /api/parents/:parentId/settings — aplica defaults a todos los menores si no se especifica minorId */
export async function putParentSettingsBundle(req: Request, res: Response): Promise<void> {
  const parentId = parentResourceId(req);
  if (!parentId) {
    res.status(400).json({ error: 'parentId es obligatorio.' });
    return;
  }
  const auth = req.auth;
  if (auth?.kind !== 'parent' || auth.parentId !== parentId) {
    res.status(403).json({ error: 'No autorizado.' });
    return;
  }

  const bodySchema = settingsPutSchema.extend({
    minorId: uuidSchema.optional(),
  });
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }

  try {
    const parentUserId = await resolveParentUserId(parentId);
    if (!parentUserId) {
      res.status(400).json({ error: 'Perfil tutor no encontrado.' });
      return;
    }

    const children = await prisma.user.findMany({
      where: {
        parentId,
        type: 'minor',
        ...(parsed.data.minorId ? { id: parsed.data.minorId } : {}),
      },
      select: { id: true },
    });

    for (const c of children) {
      const existing = await prisma.parentSettings.findUnique({ where: { childId: c.id } });
      const data = {
        dailyScreenTimeLimit:
          parsed.data.defaultDailyScreenTimeLimit ?? existing?.dailyScreenTimeLimit ?? 120,
        notifyParentNewContact:
          parsed.data.notifyParentNewContact ?? existing?.notifyParentNewContact ?? true,
        notifyParentSuspiciousChat:
          parsed.data.notifyParentSuspiciousChat ?? existing?.notifyParentSuspiciousChat ?? true,
      };
      if (existing) {
        await prisma.parentSettings.update({
          where: { childId: c.id },
          data,
        });
      } else {
        await prisma.parentSettings.create({
          data: {
            parentId,
            childId: c.id,
            dailyScreenTimeLimit: data.dailyScreenTimeLimit,
            allowPosting: true,
            allowFriends: true,
            chatEnabled: true,
            parentChatSupervisionEnabled: true,
            notifyParentNewContact: data.notifyParentNewContact,
            notifyParentSuspiciousChat: data.notifyParentSuspiciousChat,
            contentFilterLevel: ContentFilterLevel.MEDIUM,
          },
        });
      }
    }

    res.json({ ok: true, updated: children.length });
  } catch (e) {
    logError('parentsApi.putParentSettingsBundle', e);
    res.status(500).json({ error: 'Error al actualizar configuración.' });
  }
}
