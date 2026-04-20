import type { NextFunction, Request, Response } from "express";

/** Roles JWT soportados (tutor / menor). */
export const AUTH_ROLES = ["parent", "child"] as const;
export type AuthRole = (typeof AUTH_ROLES)[number];

function forbiddenMessage(allowed: AuthRole[]): string {
  if (allowed.length === 1) {
    return allowed[0] === "parent"
      ? "Esta operación es solo para tutores."
      : "Esta operación es solo para menores.";
  }
  return "No tenés permiso para esta operación.";
}

/**
 * JWT válido con rol `parent` o `child` (cualquiera). Útil cuando el controlador decide el acceso
 * (p. ej. onboarding: el menor a sí mismo o el tutor a sus hijos).
 * Requiere `requireAuth` antes en la cadena.
 */
export function requireAuthenticated(req: Request, res: Response, next: NextFunction): void {
  if (!req.auth || !req.role) {
    res.status(401).json({ error: "No autenticado." });
    return;
  }
  next();
}

/**
 * Restringe el handler a uno o más roles. Requiere `requireAuth` antes en la cadena.
 * Responde 401 sin sesión y 403 si el rol no está permitido.
 */
export function requireRoles(...allowed: AuthRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const resolvedRole: AuthRole | null = req.role ?? (req.auth ? req.auth.kind : null);
    if (!req.auth || !resolvedRole) {
      res.status(401).json({ error: "No autenticado." });
      return;
    }
    if (!allowed.includes(resolvedRole)) {
      res.status(403).json({ error: forbiddenMessage(allowed) });
      return;
    }
    next();
  };
}

export const requireParent = requireRoles("parent");
export const requireChild = requireRoles("child");
