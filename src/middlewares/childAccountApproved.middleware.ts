import type { NextFunction, Request, Response } from "express";
import { logError } from "../lib/logger";
import { prisma } from "../lib/prisma";

/**
 * Rutas que un menor puede llamar con JWT aunque la cuenta no esté aprobada por el tutor
 * (p. ej. para leer estado en `/api/auth/me`).
 */
function isExemptPath(path: string): boolean {
  // Montaje en `app.ts`: `/auth` y también `apiRouter` en `/api` → `/api/auth`.
  return path === "/api/auth/me" || path === "/auth/me";
}

/**
 * Tras `requireAuth`: bloquea al menor hasta que el tutor apruebe la cuenta (`parentAccountApprovedAt`).
 */
export async function requireApprovedChildAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = req.auth;
  if (!auth || auth.kind !== "child") {
    next();
    return;
  }
  if (isExemptPath(req.path)) {
    next();
    return;
  }

  try {
    const row = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { parentAccountApprovedAt: true },
    });
    if (!row?.parentAccountApprovedAt) {
      res.status(403).json({
        error:
          "Tu tutor o tutora debe aprobar tu cuenta en el panel familiar antes de que puedas usar la app.",
        code: "CHILD_ACCOUNT_PENDING_APPROVAL",
      });
      return;
    }
    next();
  } catch (e) {
    logError("requireApprovedChildAccount", e);
    res.status(500).json({ error: "Error al verificar el estado de la cuenta." });
  }
}
