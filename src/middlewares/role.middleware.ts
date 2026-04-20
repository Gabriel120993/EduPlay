import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { ActivityType } from "@prisma/client";
import { env } from "../config/env";
import { logError } from "../lib/logger";
import { prisma } from "../lib/prisma";
import { extractBearerToken } from "./auth.middleware";
import { requireParent as requireParentRole, requireChild } from "./rbac.middleware";

/**
 * Solo tutores/padres activos y verificados.
 * Mantiene compatibilidad con el middleware legado usado en tests.
 */
export async function requireParent(req: Request, res: Response, next: NextFunction): Promise<void> {
  requireParentRole(req, res, async () => {
    const auth = req.auth;
    if (!auth || auth.kind !== "parent") {
      res.status(401).json({ error: "No autenticado." });
      return;
    }
    try {
      const row = await prisma.user.findFirst({
        where: { parentId: auth.parentId, type: "parent" },
        select: { status: true, parentProfile: { select: { verificationStatus: true } } },
        orderBy: { createdAt: "asc" },
      });
      if (!row || row.status !== "active") {
        res.status(403).json({ error: "Cuenta de tutor no activa.", code: "PARENT_INACTIVE" });
        return;
      }
      if (row.parentProfile?.verificationStatus !== "verified") {
        res.status(403).json({ error: "Tutor no verificado.", code: "PARENT_NOT_VERIFIED" });
        return;
      }
      next();
    } catch (e) {
      logError("role.requireParent", e);
      res.status(500).json({ error: "Error al verificar la cuenta del tutor." });
    }
  });
}

/**
 * Solo menores con cuenta aprobada por el tutor (`parentAccountApprovedAt`).
 * Complementa `requireApprovedChildAccount` global cuando usás rutas montadas fuera de esa cadena.
 */
export async function requireMinor(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = req.auth;
  if (!auth || auth.kind !== "child") {
    res.status(403).json({ error: "Esta operación es solo para menores.", code: "FORBIDDEN_NOT_MINOR" });
    return;
  }

  try {
    const row = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { parentAccountApprovedAt: true, status: true, type: true },
    });
    if (!row || row.type !== "minor") {
      res.status(403).json({ error: "Cuenta de menor inválida.", code: "FORBIDDEN_NOT_MINOR" });
      return;
    }
    if (row.status !== "active") {
      res.status(403).json({ error: "Cuenta inactiva o suspendida.", code: "MINOR_BLOCKED" });
      return;
    }
    if (!row.parentAccountApprovedAt) {
      res.status(403).json({
        error: "Tu tutor debe aprobar tu cuenta antes de usar esta función.",
        code: "CHILD_ACCOUNT_PENDING_APPROVAL",
      });
      return;
    }
    next();
  } catch (e) {
    logError("role.requireMinor", e);
    res.status(500).json({ error: "Error al verificar el estado de la cuenta." });
  }
}

/**
 * Administración: usuario `User.type === admin` con JWT `{ typ: 'admin', sub: userId }`
 * o, si `ADMIN_API_SECRET` está definido, cabecera `x-admin-secret` con el mismo valor.
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (env.adminApiSecret) {
    const h = req.headers["x-admin-secret"];
    if (typeof h === "string" && h.trim() === env.adminApiSecret) {
      next();
      return;
    }
  }

  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: "No autenticado.", code: "UNAUTHORIZED" });
    return;
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret, { algorithms: ["HS256"] }) as jwt.JwtPayload;
    const typ = decoded.typ === "admin" ? "admin" : (decoded as { userType?: string }).userType === "admin" ? "admin" : null;
    const sub = typeof decoded.sub === "string" ? decoded.sub : "";
    if (typ !== "admin" || !sub) {
      res.status(403).json({ error: "Solo administradores.", code: "FORBIDDEN_NOT_ADMIN" });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: sub },
      select: { id: true, type: true },
    });
    if (!user || user.type !== "admin") {
      res.status(403).json({ error: "Solo administradores.", code: "FORBIDDEN_NOT_ADMIN" });
      return;
    }

    req.adminUserId = user.id;
    next();
  } catch (e) {
    if (e instanceof jwt.JsonWebTokenError || e instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: "Token inválido o expirado.", code: "INVALID_TOKEN" });
      return;
    }
    logError("role.requireAdmin", e);
    res.status(500).json({ error: "Error al verificar permisos de administración." });
  }
}

/** Verifica que el tutor autenticado sea el responsable del menor indicado en `req.params[paramName]`. */
export function requireParentOf(minorIdParam = "minorId") {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const auth = req.auth;
    if (!auth || auth.kind !== "parent") {
      res.status(403).json({ error: "Solo un tutor puede acceder a este recurso.", code: "FORBIDDEN_NOT_PARENT" });
      return;
    }

    const minorId = typeof req.params[minorIdParam] === "string" ? req.params[minorIdParam].trim() : "";
    if (!minorId) {
      res.status(400).json({ error: `Parámetro ${minorIdParam} inválido.`, code: "INVALID_PARAM" });
      return;
    }

    try {
      const minor = await prisma.user.findUnique({
        where: { id: minorId },
        select: { id: true, parentId: true, type: true },
      });
      if (!minor || minor.type !== "minor") {
        res.status(404).json({ error: "Menor no encontrado.", code: "MINOR_NOT_FOUND" });
        return;
      }
      if (minor.parentId !== auth.parentId) {
        res.status(403).json({ error: "No autorizado para este menor.", code: "FORBIDDEN_NOT_PARENT_OF_MINOR" });
        return;
      }
      next();
    } catch (e) {
      logError("role.requireParentOf", e);
      res.status(500).json({ error: "Error al verificar la relación tutor–menor." });
    }
  };
}

/**
 * El `userId` del path debe ser el propio menor autenticado o un hijo del tutor autenticado.
 */
export function requireSelfOrParent(userIdParam = "userId") {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const auth = req.auth;
    if (!auth) {
      res.status(401).json({ error: "No autenticado.", code: "UNAUTHORIZED" });
      return;
    }

    const targetId = typeof req.params[userIdParam] === "string" ? req.params[userIdParam].trim() : "";
    if (!targetId) {
      res.status(400).json({ error: `Parámetro ${userIdParam} inválido.`, code: "INVALID_PARAM" });
      return;
    }

    if (auth.kind === "child") {
      if (auth.userId !== targetId) {
        res.status(403).json({ error: "Solo podés acceder a tu propio perfil.", code: "FORBIDDEN_NOT_SELF" });
        return;
      }
      next();
      return;
    }

    if (auth.kind === "parent") {
      try {
        const user = await prisma.user.findUnique({
          where: { id: targetId },
          select: { id: true, parentId: true, type: true },
        });
        if (!user) {
          res.status(404).json({ error: "Usuario no encontrado.", code: "USER_NOT_FOUND" });
          return;
        }
        if (user.type === "minor" && user.parentId === auth.parentId) {
          next();
          return;
        }
        if (user.type === "parent") {
          const parentUser = await prisma.user.findFirst({
            where: { parentId: auth.parentId, type: "parent" },
            select: { id: true },
            orderBy: { createdAt: "asc" },
          });
          if (parentUser && parentUser.id === targetId) {
            next();
            return;
          }
        }
        res.status(403).json({ error: "No autorizado para este usuario.", code: "FORBIDDEN" });
      } catch (e) {
        logError("role.requireSelfOrParent", e);
        res.status(500).json({ error: "Error al verificar permisos." });
      }
      return;
    }

    res.status(403).json({ error: "No autorizado.", code: "FORBIDDEN" });
  };
}

/** Compat: menor sobre sí mismo o tutor del menor. */
export const requireParentOrSelf = requireSelfOrParent("minorId");

/** Compat: usa `minAge`/`category` de body/query para validar acceso de menores. */
export async function checkContentAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = req.auth;
  if (!auth || auth.kind !== "child") {
    next();
    return;
  }

  const rawMinAge = req.body?.minAge ?? req.query?.minAge;
  const minAge =
    typeof rawMinAge === "number"
      ? rawMinAge
      : typeof rawMinAge === "string" && rawMinAge.trim() !== ""
        ? Number(rawMinAge)
        : null;
  const categoryRaw = req.body?.category ?? req.query?.category;
  const category = typeof categoryRaw === "string" ? categoryRaw.trim().toLowerCase() : "";

  try {
    const row = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { age: true, minorProfile: true },
    });
    if (!row) {
      res.status(403).json({ error: "Perfil de menor no encontrado.", code: "FORBIDDEN" });
      return;
    }

    if (minAge != null && Number.isFinite(minAge) && row.age < minAge) {
      res.status(403).json({ error: "Este contenido no está recomendado para tu edad.", code: "CONTENT_AGE_RESTRICTED" });
      return;
    }

    const blocked =
      row.minorProfile &&
      typeof row.minorProfile === "object" &&
      "contentRestrictions" in row.minorProfile &&
      row.minorProfile.contentRestrictions &&
      typeof row.minorProfile.contentRestrictions === "object" &&
      "blockedCategories" in row.minorProfile.contentRestrictions
        ? (row.minorProfile.contentRestrictions as { blockedCategories?: unknown }).blockedCategories
        : null;
    const blockedCategories = Array.isArray(blocked)
      ? blocked.map((v) => String(v).trim().toLowerCase()).filter(Boolean)
      : [];
    if (category && blockedCategories.includes(category)) {
      res.status(403).json({ error: "Categoría bloqueada por controles parentales.", code: "CONTENT_CATEGORY_BLOCKED" });
      return;
    }

    next();
  } catch (e) {
    logError("role.checkContentAccess", e);
    res.status(500).json({ error: "Error al validar acceso al contenido." });
  }
}

function mapLegacyActivityType(action: "make_purchase" | "post_content" | "add_friend"): ActivityType {
  switch (action) {
    case "make_purchase":
      return ActivityType.purchase;
    case "add_friend":
      return ActivityType.friend_request;
    default:
      return ActivityType.post;
  }
}

/** Compat: bloquea por flags de perfil y luego exige aprobación parental según configuración. */
export function requireApprovalFor(action: "make_purchase" | "post_content" | "add_friend") {
  const mappedAction = mapLegacyActivityType(action);
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const auth = req.auth;
    if (!auth || auth.kind !== "child") {
      next();
      return;
    }
    try {
      const row = await prisma.user.findUnique({
        where: { id: auth.userId },
        select: { minorProfile: true },
      });
      const profile =
        row && row.minorProfile && typeof row.minorProfile === "object" ? (row.minorProfile as Record<string, unknown>) : null;
      if (action === "make_purchase" && profile?.canMakePurchases === false) {
        res.status(403).json({ error: "Tu perfil no permite compras.", code: "PURCHASES_DISABLED" });
        return;
      }
      if (action === "post_content" && profile?.canPostContent === false) {
        res.status(403).json({ error: "Tu perfil no permite publicar.", code: "POSTING_DISABLED" });
        return;
      }
      if (action === "add_friend" && profile?.canAddFriends === false) {
        res.status(403).json({ error: "Tu perfil no permite agregar amistades.", code: "FRIENDS_DISABLED" });
        return;
      }
    } catch (e) {
      logError("role.requireApprovalFor.profile", e);
      res.status(500).json({ error: "Error al verificar permisos del perfil." });
      return;
    }

    try {
      const relation = await prisma.parentChildRelation.findFirst({
        where: { childId: auth.userId, status: "active" },
        select: { approvalRequiredFor: true },
      });
      const requiredFor = Array.isArray(relation?.approvalRequiredFor)
        ? relation.approvalRequiredFor.map((v) => String(v))
        : [];
      if (!requiredFor.includes(mappedAction)) {
        next();
        return;
      }

      const approved = await prisma.activityApproval.findFirst({
        where: {
          minorId: auth.userId,
          activityType: mappedAction,
          status: "approved",
        },
        orderBy: { requestedAt: "desc" },
        select: { id: true },
      });
      if (!approved) {
        res.status(403).json({
          error: "Esta acción requiere aprobación parental.",
          code: "PARENTAL_APPROVAL_REQUIRED",
          action: mappedAction,
        });
        return;
      }
      next();
    } catch (e) {
      logError("role.requireApprovalFor.approval", e);
      res.status(500).json({ error: "Error al verificar aprobación parental." });
    }
  };
}

export { requireChild };
