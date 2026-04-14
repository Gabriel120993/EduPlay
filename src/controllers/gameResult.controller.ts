import type { Request, Response } from "express";
import { PostType, Prisma, Visibility, XpGainSource } from "@prisma/client";
import {
  applyEarnXpMissionProgress,
  applyPlayGamesMissionProgress,
  maybeGrantDailyChallengeBonus,
} from "../lib/missionProgress";
import { bumpUserInterestScore, interestDeltaForGameScore } from "../lib/userInterest";
import { recordXpGain } from "../lib/xpLedger";
import { addExperience, xpFromGameScore } from "../lib/xpLevel";
import { logError } from "../lib/logger";
import { prisma } from "../lib/prisma";

function validateCreateGameResult(body: unknown):
  | { ok: true; data: { userId: string; gameId: string; score: number } }
  | { ok: false; error: string } {
  if (body === null || typeof body !== "object") {
    return { ok: false, error: "El cuerpo debe ser un objeto JSON." };
  }
  const b = body as Record<string, unknown>;
  if (b.userId === undefined || b.userId === null || String(b.userId).trim() === "") {
    return { ok: false, error: "userId es obligatorio." };
  }
  if (b.gameId === undefined || b.gameId === null || String(b.gameId).trim() === "") {
    return { ok: false, error: "gameId es obligatorio." };
  }
  if (b.score === undefined || b.score === null) {
    return { ok: false, error: "score es obligatorio." };
  }
  const score = typeof b.score === "number" ? b.score : Number(b.score);
  if (!Number.isFinite(score) || !Number.isInteger(score)) {
    return { ok: false, error: "score debe ser un número entero." };
  }
  if (score < 0) {
    return { ok: false, error: "score no puede ser negativo." };
  }
  return {
    ok: true,
    data: {
      userId: String(b.userId).trim(),
      gameId: String(b.gameId).trim(),
      score,
    },
  };
}

export async function createGameResult(req: Request, res: Response): Promise<void> {
  const validation = validateCreateGameResult(req.body);
  if (!validation.ok) {
    res.status(400).json({ error: validation.error });
    return;
  }
  const { userId, gameId, score } = validation.data;

  try {
    const [user, game] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
      prisma.game.findUnique({ where: { id: gameId }, select: { id: true, category: true } }),
    ]);
    if (!user) {
      res.status(400).json({ error: "userId no corresponde a un usuario existente." });
      return;
    }
    if (!game) {
      res.status(400).json({ error: "gameId no corresponde a un juego existente." });
      return;
    }

    const xpGained = xpFromGameScore(score);

    const interestDelta = interestDeltaForGameScore(score);

    const result = await prisma.$transaction(async (tx) => {
      const gameResult = await tx.gameResult.create({
        data: { userId, gameId, score },
      });

      await bumpUserInterestScore(tx, userId, game.category, interestDelta);

      const post = await tx.post.create({
        data: {
          userId,
          category: game.category,
          type: PostType.GAME_RESULT,
          visibility: Visibility.PUBLIC,
          content: `Completed a game with score ${score} 🎮`,
          gameResultId: gameResult.id,
        },
      });

      const before = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { level: true, experience: true },
      });
      const next = addExperience(before.level, before.experience, xpGained);
      let userProgress = await tx.user.update({
        where: { id: userId },
        data: { level: next.level, experience: next.experience },
        select: { id: true, level: true, experience: true },
      });
      await recordXpGain(tx, userId, xpGained, XpGainSource.GAME_RESULT);

      const missionRewards = [
        ...(await applyPlayGamesMissionProgress(tx, userId, game.category)),
        ...(await applyEarnXpMissionProgress(tx, userId, xpGained)),
      ];
      const dailyChallengeBonus = await maybeGrantDailyChallengeBonus(tx, userId);

      if (missionRewards.length > 0 || dailyChallengeBonus) {
        userProgress = await tx.user.findUniqueOrThrow({
          where: { id: userId },
          select: { id: true, level: true, experience: true },
        });
      }

      return {
        gameResult,
        post,
        userProgress: { ...userProgress, xpGained },
        missionRewards,
        dailyChallengeBonus,
      };
    });

    res.status(201).json(result);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        res.status(409).json({
          error:
            "Violación de unicidad: ya existe un post para este resultado de juego (Post.gameResultId único) o conflicto de clave duplicada.",
        });
        return;
      }
      if (err.code === "P2003") {
        res.status(400).json({ error: "Referencia inválida." });
        return;
      }
    }
    logError("gameResult", err);
    res.status(500).json({ error: "Error al registrar el resultado del juego." });
  }
}
