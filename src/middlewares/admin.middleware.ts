import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";

/**
 * Protege `/api/admin/*` con `x-admin-secret` (valor de `ADMIN_API_SECRET`).
 */
export function requireAdminSecret(req: Request, res: Response, next: NextFunction): void {
  if (!env.adminApiSecret) {
    res.status(503).json({ error: "Administración no configurada en el servidor.", code: "ADMIN_DISABLED" });
    return;
  }
  const header = req.headers["x-admin-secret"];
  const provided = typeof header === "string" ? header.trim() : "";
  if (!provided || provided !== env.adminApiSecret) {
    res.status(403).json({ error: "Acceso denegado.", code: "ADMIN_FORBIDDEN" });
    return;
  }
  next();
}
