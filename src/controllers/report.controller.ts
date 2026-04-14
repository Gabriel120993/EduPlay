import type { Request, Response } from "express";
import { ContentReportStatus, ContentReportTarget, Prisma } from "@prisma/client";
import { env } from "../config/env";
import { logError, logSuspicious } from "../lib/logger";
import { recordAndNotifyParentsForNewContentReport } from "../lib/parentSuspiciousNotify";
import { prisma } from "../lib/prisma";
import { sanitizeUserPlainText } from "../lib/sanitizeUserInput";

const TARGET_VALUES = Object.values(ContentReportTarget) as string[];
const STATUS_VALUES = Object.values(ContentReportStatus) as string[];

const MAX_REASON = 500;

function isTarget(v: string): v is ContentReportTarget {
  return TARGET_VALUES.includes(v);
}

function isStatus(v: string): v is ContentReportStatus {
  return STATUS_VALUES.includes(v);
}

function reportVisibleToParentWhere(parentId: string): Prisma.ContentReportWhereInput {
  return {
    OR: [
      { post: { user: { parentId } } },
      { reportedUser: { parentId } },
      { reporter: { parentId } },
      {
        chatMessage: {
          OR: [{ sender: { parentId } }, { recipient: { parentId } }],
        },
      },
    ],
  };
}

export async function postContentReport(req: Request, res: Response): Promise<void> {
  const auth = req.auth;
  if (auth?.kind !== "child") {
    res.status(401).json({ error: "No autenticado." });
    return;
  }
  const reporterUserId = auth.userId;

  if (req.body === null || typeof req.body !== "object") {
    res.status(400).json({ error: "El cuerpo debe ser un objeto JSON." });
    return;
  }
  const b = req.body as Record<string, unknown>;
  const targetTypeRaw = typeof b.targetType === "string" ? b.targetType.trim() : "";
  if (!isTarget(targetTypeRaw)) {
    res.status(400).json({ error: `targetType inválido. Usá: ${TARGET_VALUES.join(", ")}.` });
    return;
  }

  const postId = typeof b.postId === "string" && b.postId.trim() ? b.postId.trim() : null;
  const reportedUserId =
    typeof b.reportedUserId === "string" && b.reportedUserId.trim() ? b.reportedUserId.trim() : null;
  const chatMessageId =
    typeof b.chatMessageId === "string" && b.chatMessageId.trim() ? b.chatMessageId.trim() : null;

  let reason: string | null = null;
  if (b.reason != null) {
    if (typeof b.reason !== "string") {
      res.status(400).json({ error: "reason debe ser texto." });
      return;
    }
    const t = sanitizeUserPlainText(b.reason.trim(), MAX_REASON);
    if (t.length > MAX_REASON) {
      res.status(400).json({ error: `reason no puede superar ${MAX_REASON} caracteres.` });
      return;
    }
    reason = t.length > 0 ? t : null;
  }

  try {
    if (targetTypeRaw === ContentReportTarget.POST) {
      if (!postId || reportedUserId || chatMessageId) {
        res.status(400).json({ error: "Para POST enviá solo postId." });
        return;
      }
      const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
      if (!post) {
        res.status(404).json({ error: "Post no encontrado." });
        return;
      }
    } else if (targetTypeRaw === ContentReportTarget.USER) {
      if (!reportedUserId || postId || chatMessageId) {
        res.status(400).json({ error: "Para USER enviá solo reportedUserId." });
        return;
      }
      if (reportedUserId === reporterUserId) {
        res.status(400).json({ error: "No podés denunciarte a vos mismo." });
        return;
      }
      const u = await prisma.user.findUnique({ where: { id: reportedUserId }, select: { id: true } });
      if (!u) {
        res.status(404).json({ error: "Usuario no encontrado." });
        return;
      }
    } else {
      if (!chatMessageId || postId || reportedUserId) {
        res.status(400).json({ error: "Para CHAT_MESSAGE enviá solo chatMessageId." });
        return;
      }
      const msg = await prisma.chatMessage.findUnique({
        where: { id: chatMessageId },
        select: { id: true, senderId: true, recipientId: true },
      });
      if (!msg) {
        res.status(404).json({ error: "Mensaje no encontrado." });
        return;
      }
      if (msg.senderId !== reporterUserId && msg.recipientId !== reporterUserId) {
        res.status(403).json({ error: "Solo podés denunciar mensajes de tus conversaciones." });
        return;
      }
    }

    const row = await prisma.contentReport.create({
      data: {
        targetType: targetTypeRaw,
        reason,
        reporterUserId,
        postId: targetTypeRaw === ContentReportTarget.POST ? postId : null,
        reportedUserId: targetTypeRaw === ContentReportTarget.USER ? reportedUserId : null,
        chatMessageId: targetTypeRaw === ContentReportTarget.CHAT_MESSAGE ? chatMessageId : null,
      },
      select: {
        id: true,
        targetType: true,
        status: true,
        reason: true,
        postId: true,
        reportedUserId: true,
        chatMessageId: true,
        createdAt: true,
        reporterUserId: true,
      },
    });

    void recordAndNotifyParentsForNewContentReport({
      targetType: row.targetType,
      postId: row.postId,
      reportedUserId: row.reportedUserId,
      chatMessageId: row.chatMessageId,
      reporterUserId: row.reporterUserId,
    });

    logSuspicious("content_report_created", {
      reportId: row.id,
      targetType: row.targetType,
      reporterUserId: row.reporterUserId,
      postId: row.postId,
      reportedUserId: row.reportedUserId,
      chatMessageId: row.chatMessageId,
    });

    if (row.targetType === ContentReportTarget.USER && row.reportedUserId) {
      logSuspicious("user_flagged", {
        reportId: row.id,
        reportedUserId: row.reportedUserId,
        reporterUserId: row.reporterUserId,
      });
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const distinctReporters = await prisma.contentReport.groupBy({
        by: ["reporterUserId"],
        where: {
          targetType: ContentReportTarget.USER,
          reportedUserId: row.reportedUserId,
          createdAt: { gte: dayAgo },
        },
      });
      if (distinctReporters.length >= env.userReportDistinctReportersAlertThreshold) {
        logSuspicious("user_flagged_by_many_distinct_reporters", {
          reportedUserId: row.reportedUserId,
          distinctReporters24h: distinctReporters.length,
          threshold: env.userReportDistinctReportersAlertThreshold,
        });
      }
    }

    res.status(201).json({
      id: row.id,
      targetType: row.targetType,
      status: row.status,
      reason: row.reason,
      postId: row.postId,
      reportedUserId: row.reportedUserId,
      chatMessageId: row.chatMessageId,
      createdAt: row.createdAt.toISOString(),
    });
  } catch (err) {
    logError("report.postContentReport", err);
    res.status(500).json({ error: "Error al registrar la denuncia." });
  }
}

export async function getParentModerationReports(req: Request, res: Response): Promise<void> {
  const parentId = req.params.id?.trim();
  if (!parentId) {
    res.status(400).json({ error: "id del padre/tutor es obligatorio." });
    return;
  }
  const auth = req.auth;
  if (auth?.kind !== "parent" || auth.parentId !== parentId) {
    res.status(403).json({ error: "No autorizado." });
    return;
  }

  const statusRaw = typeof req.query.status === "string" ? req.query.status.trim().toUpperCase() : "";
  const statusFilter =
    statusRaw && isStatus(statusRaw) ? statusRaw : undefined;

  try {
    const reports = await prisma.contentReport.findMany({
      where: {
        AND: [reportVisibleToParentWhere(parentId), ...(statusFilter ? [{ status: statusFilter }] : [])],
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        targetType: true,
        status: true,
        reason: true,
        resolutionNote: true,
        postId: true,
        reportedUserId: true,
        chatMessageId: true,
        reviewedAt: true,
        reviewedByParentId: true,
        createdAt: true,
        updatedAt: true,
        reporter: { select: { id: true, username: true, realName: true } },
        post: {
          select: {
            id: true,
            content: true,
            mediaModerationFlagged: true,
            user: { select: { id: true, username: true } },
          },
        },
        reportedUser: { select: { id: true, username: true, realName: true } },
        chatMessage: {
          select: {
            id: true,
            body: true,
            blocked: true,
            moderationFlagged: true,
            senderId: true,
            recipientId: true,
            createdAt: true,
          },
        },
      },
    });

    res.json({
      reports: reports.map((r) => ({
        id: r.id,
        targetType: r.targetType,
        status: r.status,
        reason: r.reason,
        resolutionNote: r.resolutionNote,
        postId: r.postId,
        reportedUserId: r.reportedUserId,
        chatMessageId: r.chatMessageId,
        reviewedAt: r.reviewedAt?.toISOString() ?? null,
        reviewedByParentId: r.reviewedByParentId,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        reporter: r.reporter,
        post: r.post,
        reportedUser: r.reportedUser,
        chatMessage: r.chatMessage
          ? {
              ...r.chatMessage,
              createdAt: r.chatMessage.createdAt.toISOString(),
            }
          : null,
      })),
    });
  } catch (err) {
    logError("report", err);
    res.status(500).json({ error: "Error al listar denuncias." });
  }
}

export async function patchParentModerationReport(req: Request, res: Response): Promise<void> {
  const parentId = req.params.id?.trim();
  const reportId = req.params.reportId?.trim();
  if (!parentId || !reportId) {
    res.status(400).json({ error: "Parámetros obligatorios faltantes." });
    return;
  }
  const auth = req.auth;
  if (auth?.kind !== "parent" || auth.parentId !== parentId) {
    res.status(403).json({ error: "No autorizado." });
    return;
  }

  if (req.body === null || typeof req.body !== "object") {
    res.status(400).json({ error: "El cuerpo debe ser un objeto JSON." });
    return;
  }
  const b = req.body as Record<string, unknown>;
  const statusRaw = typeof b.status === "string" ? b.status.trim().toUpperCase() : "";
  if (!isStatus(statusRaw) || statusRaw === ContentReportStatus.OPEN) {
    res.status(400).json({ error: `status debe ser DISMISSED o ESCALATED.` });
    return;
  }

  let resolutionNote: string | null = null;
  if (b.resolutionNote != null) {
    if (typeof b.resolutionNote !== "string") {
      res.status(400).json({ error: "resolutionNote debe ser texto." });
      return;
    }
    const t = sanitizeUserPlainText(b.resolutionNote.trim(), MAX_REASON);
    if (t.length > MAX_REASON) {
      res.status(400).json({ error: `resolutionNote no puede superar ${MAX_REASON} caracteres.` });
      return;
    }
    resolutionNote = t.length > 0 ? t : null;
  }

  try {
    const existing = await prisma.contentReport.findFirst({
      where: {
        AND: [{ id: reportId }, reportVisibleToParentWhere(parentId)],
      },
    });
    if (!existing) {
      res.status(404).json({ error: "Denuncia no encontrada o sin acceso." });
      return;
    }
    if (existing.status !== ContentReportStatus.OPEN) {
      res.status(400).json({ error: "Esta denuncia ya fue cerrada." });
      return;
    }

    const updated = await prisma.contentReport.update({
      where: { id: reportId },
      data: {
        status: statusRaw,
        resolutionNote,
        reviewedByParentId: parentId,
        reviewedAt: new Date(),
      },
      select: {
        id: true,
        status: true,
        resolutionNote: true,
        reviewedAt: true,
        reviewedByParentId: true,
        updatedAt: true,
      },
    });

    res.json({
      id: updated.id,
      status: updated.status,
      resolutionNote: updated.resolutionNote,
      reviewedAt: updated.reviewedAt?.toISOString() ?? null,
      reviewedByParentId: updated.reviewedByParentId,
      updatedAt: updated.updatedAt.toISOString(),
    });
  } catch (err) {
    logError("report", err);
    res.status(500).json({ error: "Error al actualizar la denuncia." });
  }
}

export async function postParentApprovePostModeration(req: Request, res: Response): Promise<void> {
  const parentId = req.params.id?.trim();
  const postId = req.params.postId?.trim();
  if (!parentId || !postId) {
    res.status(400).json({ error: "Parámetros obligatorios faltantes." });
    return;
  }
  const auth = req.auth;
  if (auth?.kind !== "parent" || auth.parentId !== parentId) {
    res.status(403).json({ error: "No autorizado." });
    return;
  }

  try {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, user: { select: { parentId: true } } },
    });
    if (!post) {
      res.status(404).json({ error: "Post no encontrado." });
      return;
    }
    if (post.user.parentId !== parentId) {
      res.status(403).json({ error: "Solo el tutor del autor puede aprobar la visibilidad de este post." });
      return;
    }

    const updated = await prisma.post.update({
      where: { id: postId },
      data: {
        parentModerationVisibleAt: new Date(),
        parentModerationVisibleById: parentId,
      },
      select: {
        id: true,
        mediaModerationFlagged: true,
        parentModerationVisibleAt: true,
        parentModerationVisibleById: true,
      },
    });

    res.json({
      id: updated.id,
      mediaModerationFlagged: updated.mediaModerationFlagged,
      parentModerationVisibleAt: updated.parentModerationVisibleAt?.toISOString() ?? null,
      parentModerationVisibleById: updated.parentModerationVisibleById,
    });
  } catch (err) {
    logError("report", err);
    res.status(500).json({ error: "Error al aprobar el post." });
  }
}
