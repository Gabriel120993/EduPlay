import type { Request, Response } from "express";
import { Prisma, ReactionType } from "@prisma/client";
import { logError } from "../lib/logger";
import { prisma } from "../lib/prisma";
import { postIdOnlySelect, userIdOnlySelect } from "../lib/prismaPublicSelects";

const REACTION_TYPE_VALUES = Object.values(ReactionType) as string[];

function isReactionType(value: string): value is ReactionType {
  return REACTION_TYPE_VALUES.includes(value);
}

function emptyCountByType(): Record<ReactionType, number> {
  return {
    LIKE: 0,
    CLAP: 0,
    STAR: 0,
  };
}

function validateCreateReaction(body: unknown):
  | { ok: true; data: { userId: string; postId: string; type: ReactionType } }
  | { ok: false; error: string } {
  if (body === null || typeof body !== "object") {
    return { ok: false, error: "El cuerpo debe ser un objeto JSON." };
  }

  const b = body as Record<string, unknown>;

  if (b.userId === undefined || b.userId === null || String(b.userId).trim() === "") {
    return { ok: false, error: "userId es obligatorio." };
  }
  if (b.postId === undefined || b.postId === null || String(b.postId).trim() === "") {
    return { ok: false, error: "postId es obligatorio." };
  }
  if (b.type === undefined || b.type === null || typeof b.type !== "string" || !isReactionType(b.type)) {
    return {
      ok: false,
      error: `type es obligatorio y debe ser uno de: ${REACTION_TYPE_VALUES.join(", ")}.`,
    };
  }

  return {
    ok: true,
    data: {
      userId: String(b.userId).trim(),
      postId: String(b.postId).trim(),
      type: b.type,
    },
  };
}

export async function createReaction(req: Request, res: Response): Promise<void> {
  const validation = validateCreateReaction(req.body);
  if (!validation.ok) {
    res.status(400).json({ error: validation.error });
    return;
  }

  const { userId, postId, type } = validation.data;

  try {
    const [user, post] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: userIdOnlySelect }),
      prisma.post.findUnique({ where: { id: postId }, select: postIdOnlySelect }),
    ]);

    if (!user) {
      res.status(400).json({ error: "userId no corresponde a un usuario existente." });
      return;
    }
    if (!post) {
      res.status(400).json({ error: "postId no corresponde a un post existente." });
      return;
    }

    const reaction = await prisma.reaction.upsert({
      where: {
        userId_postId: { userId, postId },
      },
      create: { userId, postId, type },
      update: { type },
    });

    res.status(200).json(reaction);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      res.status(409).json({
        error: "Conflicto al guardar la reacción. Intentá de nuevo.",
      });
      return;
    }
    logError("reaction", err);
    res.status(500).json({ error: "Error al crear la reacción." });
  }
}

export async function getReactionsByPostId(req: Request, res: Response): Promise<void> {
  const postId = req.params.postId?.trim();
  if (!postId) {
    res.status(400).json({ error: "postId es obligatorio." });
    return;
  }

  try {
    const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
    if (!post) {
      res.status(404).json({ error: "Post no encontrado." });
      return;
    }

    const [reactions, groups] = await Promise.all([
      prisma.reaction.findMany({
        where: { postId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          userId: true,
          postId: true,
          type: true,
          createdAt: true,
        },
      }),
      prisma.reaction.groupBy({
        by: ["type"],
        where: { postId },
        _count: { _all: true },
      }),
    ]);

    const countByType = emptyCountByType();
    for (const g of groups) {
      countByType[g.type] = g._count._all;
    }

    const reactionsOut = reactions.map((r) => ({
      id: r.id,
      userId: r.userId,
      postId: r.postId,
      type: r.type,
      createdAt: r.createdAt.toISOString(),
    }));

    res.json({
      postId,
      reactions: reactionsOut,
      countByType,
      total: reactions.length,
    });
  } catch (err) {
    logError("reaction", err);
    res.status(500).json({ error: "Error al obtener las reacciones." });
  }
}
