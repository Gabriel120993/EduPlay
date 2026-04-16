import type { NextFunction, Request, Response } from "express";
import { ActivityType } from "@prisma/client";
import { logError } from "../lib/logger";
import { prisma } from "../lib/prisma";

type GuardAction = "post_content" | "add_friend" | "make_purchase" | "chat";

const ACTION_TO_APPROVAL_KEY: Record<GuardAction, string> = {
  post_content: "post",
  add_friend: "friend_request",
  make_purchase: "purchase",
  chat: "chat",
};

const ACTION_TO_ACTIVITY_TYPE: Record<GuardAction, ActivityType> = {
  post_content: ActivityType.post,
  add_friend: ActivityType.friend_request,
  make_purchase: ActivityType.purchase,
  // Chat no existe como ActivityType; reutilizamos content_access.
  chat: ActivityType.content_access,
};

function denied(res: Response, status: number, error: string, code?: string): void {
  res.status(status).json(code ? { error, code } : { error });
}

function targetUserIdFromReq(req: Request): string {
  return (
    (typeof req.params.userId === "string" && req.params.userId) ||
    (typeof req.params.minorId === "string" && req.params.minorId) ||
    (typeof req.params.id === "string" && req.params.id) ||
    ""
  ).trim();
}

export async function requireParent(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = req.auth;
  if (!auth || auth.kind !== "parent") {
    denied(res, 403, "Esta operación es solo para tutores.");
    return;
  }

  try {
    const parentUser = await prisma.user.findFirst({
      where: { parentId: auth.parentId, type: "parent" },
      select: {
        id: true,
        status: true,
        parentProfile: { select: { verificationStatus: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    if (!parentUser) {
      denied(res, 403, "No existe perfil de tutor asociado.");
      return;
    }
    if (parentUser.status !== "active") {
      denied(res, 403, "La cuenta de tutor no está activa.", "PARENT_INACTIVE");
      return;
    }
    if (parentUser.parentProfile?.verificationStatus !== "verified") {
      denied(res, 403, "Debés verificar tu cuenta para continuar.", "PARENT_NOT_VERIFIED");
      return;
    }
    next();
  } catch (err) {
    logError("role.requireParent", err);
    denied(res, 500, "Error al verificar permisos de tutor.");
  }
}

export async function requireMinor(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = req.auth;
  if (!auth || auth.kind !== "child") {
    denied(res, 403, "Esta operación es solo para menores.");
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { type: true, status: true, parentAccountApprovedAt: true },
    });
    if (!user || user.type !== "minor") {
      denied(res, 403, "Solo menores pueden acceder a este recurso.");
      return;
    }
    if (user.status !== "active") {
      denied(res, 403, "La cuenta del menor está bloqueada.", "MINOR_BLOCKED");
      return;
    }
    if (!user.parentAccountApprovedAt) {
      denied(res, 403, "La cuenta del menor está pendiente de aprobación.", "MINOR_PENDING_APPROVAL");
      return;
    }
    next();
  } catch (err) {
    logError("role.requireMinor", err);
    denied(res, 500, "Error al verificar permisos de menor.");
  }
}

export async function requireParentOrSelf(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = req.auth;
  if (!auth) {
    denied(res, 401, "No autenticado.");
    return;
  }
  const targetUserId = targetUserIdFromReq(req);
  if (!targetUserId) {
    denied(res, 400, "Falta el identificador del usuario objetivo.");
    return;
  }

  try {
    if (auth.kind === "child") {
      if (auth.userId !== targetUserId) {
        denied(res, 403, "Solo podés acceder a tu propio recurso.");
        return;
      }
      next();
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, parentId: true, type: true },
    });
    if (!user || user.type !== "minor") {
      denied(res, 404, "Usuario menor no encontrado.");
      return;
    }
    if (user.parentId !== auth.parentId) {
      denied(res, 403, "Ese recurso no pertenece a un menor de tu familia.");
      return;
    }
    next();
  } catch (err) {
    logError("role.requireParentOrSelf", err);
    denied(res, 500, "Error al verificar acceso al recurso.");
  }
}

export async function checkContentAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = req.auth;
  if (!auth || auth.kind !== "child") {
    next();
    return;
  }

  const rawMinAge = (req.body as { minAge?: unknown })?.minAge ?? req.query.minAge;
  const minAge =
    rawMinAge === undefined || rawMinAge === null || rawMinAge === ""
      ? null
      : Number(Array.isArray(rawMinAge) ? rawMinAge[0] : rawMinAge);
  const categoryRaw = ((req.body as { category?: unknown })?.category ?? req.query.category ?? "")
    .toString()
    .trim()
    .toLowerCase();

  try {
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        age: true,
        minorProfile: { select: { contentRestrictions: true } },
      },
    });
    if (!user) {
      denied(res, 401, "Sesión inválida.");
      return;
    }

    if (minAge !== null && Number.isFinite(minAge) && user.age < minAge) {
      denied(res, 403, "Contenido no permitido para tu edad.", "AGE_RESTRICTED_CONTENT");
      return;
    }

    const restrictions = user.minorProfile?.contentRestrictions as Record<string, unknown> | null | undefined;
    const blockedCategories = Array.isArray(restrictions?.blockedCategories)
      ? restrictions?.blockedCategories.map((v) => String(v).toLowerCase())
      : [];
    if (categoryRaw && blockedCategories.includes(categoryRaw)) {
      denied(res, 403, "Contenido restringido por control parental.", "PARENTAL_CONTENT_RESTRICTED");
      return;
    }

    next();
  } catch (err) {
    logError("role.checkContentAccess", err);
    denied(res, 500, "Error al validar acceso al contenido.");
  }
}

export function requireApprovalFor(action: GuardAction) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const auth = req.auth;
    if (!auth || auth.kind !== "child") {
      next();
      return;
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: auth.userId },
        select: {
          parentId: true,
          minorProfile: {
            select: {
              canPostContent: true,
              canAddFriends: true,
              canMakePurchases: true,
            },
          },
        },
      });
      if (!user) {
        denied(res, 401, "Sesión inválida.");
        return;
      }

      if (action === "post_content" && user.minorProfile && !user.minorProfile.canPostContent) {
        denied(res, 403, "No tenés permiso para publicar contenido.", "POST_BLOCKED");
        return;
      }
      if (action === "add_friend" && user.minorProfile && !user.minorProfile.canAddFriends) {
        denied(res, 403, "No tenés permiso para agregar amigos.", "FRIEND_BLOCKED");
        return;
      }
      if (action === "make_purchase" && user.minorProfile && !user.minorProfile.canMakePurchases) {
        denied(res, 403, "No tenés permiso para realizar compras.", "PURCHASE_BLOCKED");
        return;
      }

      const parentUser = await prisma.user.findFirst({
        where: { parentId: user.parentId, type: "parent" },
        select: { id: true },
      });
      if (!parentUser) {
        denied(res, 403, "No existe perfil de tutor para validar aprobación.");
        return;
      }

      const relation = await prisma.parentChildRelation.findFirst({
        where: { parentId: parentUser.id, childId: auth.userId, status: "active" },
        select: { approvalRequiredFor: true },
      });
      if (!relation) {
        next();
        return;
      }

      const requiredFor = Array.isArray(relation.approvalRequiredFor)
        ? relation.approvalRequiredFor.map((v) => String(v))
        : [];
      const approvalKey = ACTION_TO_APPROVAL_KEY[action];
      const needsApproval = requiredFor.includes(approvalKey) || requiredFor.includes(action);
      if (!needsApproval) {
        next();
        return;
      }

      const approved = await prisma.activityApproval.findFirst({
        where: {
          minorId: auth.userId,
          parentId: parentUser.id,
          activityType: ACTION_TO_ACTIVITY_TYPE[action],
          status: "approved",
        },
        orderBy: { respondedAt: "desc" },
        select: { id: true },
      });
      if (!approved) {
        denied(res, 403, "Esta acción requiere aprobación parental.", "PARENTAL_APPROVAL_REQUIRED");
        return;
      }

      next();
    } catch (err) {
      logError("role.requireApprovalFor", err, { action });
      denied(res, 500, "Error al verificar aprobación parental.");
    }
  };
}
