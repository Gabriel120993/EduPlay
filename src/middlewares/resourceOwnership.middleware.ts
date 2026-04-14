import type { NextFunction, Request, Response } from "express";
import { PostType } from "@prisma/client";
import { logError, logSuspicious } from "../lib/logger";
import { prisma } from "../lib/prisma";
import { parseUuidParam } from "../lib/validation/schemas";

export type OwnedPostRef = {
  id: string;
  userId: string;
  type: PostType;
};

/**
 * Comprueba que el menor autenticado sea el autor del post (`req.params[postId]`).
 * Debe ir después de `requireAuth` + `requireChild`. Deja `req.ownedPost` para el handler.
 */
export function requirePostOwner(paramName = "postId") {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const auth = req.auth;
    if (!auth || auth.kind !== "child") {
      res.status(401).json({ error: "No autenticado." });
      return;
    }

    const idParsed = parseUuidParam(req.params[paramName]);
    if (!idParsed.ok) {
      res.status(400).json({ error: idParsed.error });
      return;
    }

    try {
      const post = await prisma.post.findUnique({
        where: { id: idParsed.uuid },
        select: { id: true, userId: true, type: true },
      });

      if (!post) {
        res.status(404).json({ error: "Publicación no encontrada." });
        return;
      }

      if (post.userId !== auth.userId) {
        logSuspicious("post_owner_mismatch", {
          postId: post.id,
          actorUserId: auth.userId,
        });
        res.status(403).json({ error: "No podés modificar publicaciones de otros usuarios." });
        return;
      }

      req.ownedPost = post;
      next();
    } catch (e) {
      logError("requirePostOwner", e);
      res.status(500).json({ error: "Error al verificar la publicación." });
    }
  };
}

/**
 * Tras `requirePostOwner`: solo publicaciones creadas manualmente (`POST`), no actividad automática.
 */
export function requireManualPostOwner(_req: Request, res: Response, next: NextFunction): void {
  const p = _req.ownedPost;
  if (!p) {
    res.status(500).json({ error: "Estado interno inválido." });
    return;
  }
  if (p.type !== PostType.POST) {
    res.status(403).json({
      error: "Solo podés modificar publicaciones creadas manualmente, no actividad automática.",
    });
    return;
  }
  next();
}
