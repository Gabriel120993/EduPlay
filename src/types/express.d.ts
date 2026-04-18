import type { OwnedPostRef } from "../middlewares/resourceOwnership.middleware";

/** Claims de sesión establecidos tras `requireAuth` (JWT). */
export type RequestAuth =
  | { kind: "parent"; parentId: string; email: string }
  | { kind: "child"; userId: string; username: string };

declare global {
  namespace Express {
    interface Request {
      /** Relleno por `auth.middleware` tras JWT válido. */
      auth?: RequestAuth;
      /** `parent` \| `child`; alineado con `req.auth`. */
      role?: "parent" | "child";
      /** Usuario admin verificado por `role.middleware` / `requireAdmin`. */
      adminUserId?: string;
      /** Identificador de correlación (p. ej. request logger). */
      requestId?: string;
      /** Publicación propia tras `requirePostOwner`. */
      ownedPost?: OwnedPostRef;
    }
    interface Locals {
      startTimeNs?: bigint;
      /** Cache hit en `cacheResponse` (solo informativo). */
      cacheHit?: boolean;
    }
  }
}

export {};
