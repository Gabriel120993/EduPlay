import type { PostType } from "@prisma/client";
import "express";

declare global {
  namespace Express {
    interface Request {
      auth?:
        | { kind: "parent"; parentId: string; email: string }
        | { kind: "child"; userId: string; username: string };
      /** Presente cuando hay sesión válida (`requireAuth`). */
      role?: "parent" | "child";
      /** Tras `requirePostOwner`: post verificado como propiedad del menor autenticado. */
      ownedPost?: { id: string; userId: string; type: PostType };
    }
  }
}

export {};
