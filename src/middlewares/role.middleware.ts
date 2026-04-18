import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { logError } from "../lib/logger";
import { prisma } from "../lib/prisma";
import { extractBearerToken } from "./auth.middleware";
import { requireParent as requireParentRole, requireChild } from "./rbac.middleware";

/**
 * Solo tutores/padres (JWT `typ: parent`).
 * Re-export del RBAC existente con nombre explícito para la capa REST.
 */
export const requireParent = requireParentRole;

/**
 * Solo menores con cuenta aprobada por el tutor (`parentAccountApprovedAt`).
 * Complementa `requireApprovedChildAccount` global cuando usás rutas montadas fuera de esa cadena.
 */
export function requireMinor() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
  };
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

export { requireChild };
