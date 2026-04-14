import type { Request, Response } from "express";
import { ContentCategory, Difficulty, PostType, Visibility, XpGainSource } from "@prisma/client";
import { educationalCategoryToContentCategory } from "../lib/contentCategory";
import { applyReadContentMissionProgress, maybeGrantDailyChallengeBonus } from "../lib/missionProgress";
import { assertAllowPosting } from "../lib/parentalRestrictions";
import { bumpUserInterestScore } from "../lib/userInterest";
import { addExperience } from "../lib/xpLevel";
import { recordXpGain } from "../lib/xpLedger";
import { logError } from "../lib/logger";
import { prisma } from "../lib/prisma";

function parseStringQuery(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim() !== "") return value.trim();
  if (Array.isArray(value) && value[0] != null) {
    const first = String(value[0]).trim();
    if (first !== "") return first;
  }
  return undefined;
}

function parseDifficultyQuery(value: unknown): Difficulty | undefined {
  const raw = parseStringQuery(value);
  if (!raw) return undefined;
  if (raw === Difficulty.EASY || raw === Difficulty.MEDIUM || raw === Difficulty.HARD) {
    return raw;
  }
  return undefined;
}

function mapEducationalCategoryToContentCategory(value: string): ContentCategory | null {
  return educationalCategoryToContentCategory(value);
}

/**
 * GET /api/content?category=...&difficulty=EASY
 */
export async function listEducationalContent(req: Request, res: Response): Promise<void> {
  const category = parseStringQuery(req.query.category);
  const difficulty = parseDifficultyQuery(req.query.difficulty);

  if (req.query.difficulty != null && !difficulty) {
    res.status(400).json({ error: "difficulty debe ser EASY, MEDIUM o HARD." });
    return;
  }

  try {
    const content = await prisma.educationalContent.findMany({
      where: {
        ...(category ? { category } : {}),
        ...(difficulty ? { difficulty } : {}),
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ content });
  } catch (err) {
    logError("content.listEducationalContent", err);
    res.status(500).json({ error: "Error al listar contenido educativo." });
  }
}

/**
 * GET /api/content/:id
 */
export async function getEducationalContentById(req: Request, res: Response): Promise<void> {
  const id = req.params.id?.trim();
  if (!id) {
    res.status(400).json({ error: "ID de contenido inválido." });
    return;
  }

  try {
    const item = await prisma.educationalContent.findUnique({ where: { id } });
    if (!item) {
      res.status(404).json({ error: "Contenido no encontrado." });
      return;
    }
    res.json({ content: item });
  } catch (err) {
    logError("content.getEducationalContentById", err);
    res.status(500).json({ error: "Error al obtener contenido educativo." });
  }
}

/**
 * POST /api/content/:id/complete
 * body: { userId: string, createPost?: boolean }
 */
export async function completeEducationalContent(req: Request, res: Response): Promise<void> {
  const contentId = req.params.id?.trim();
  const userId = typeof req.body?.userId === "string" ? req.body.userId.trim() : "";
  const createPost = req.body?.createPost === true;

  if (!contentId) {
    res.status(400).json({ error: "ID de contenido inválido." });
    return;
  }
  if (!userId) {
    res.status(400).json({ error: "userId es obligatorio." });
    return;
  }
  if (req.role !== "child" || req.auth?.kind !== "child" || req.auth.userId !== userId) {
    res.status(403).json({ error: "No autorizado para completar contenido con este userId." });
    return;
  }

  const XP_REWARD = 10;
  const INTEREST_DELTA = 4;

  try {
    const [user, content] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { id: true, level: true, experience: true } }),
      prisma.educationalContent.findUnique({ where: { id: contentId } }),
    ]);
    if (!user) {
      res.status(404).json({ error: "Usuario no encontrado." });
      return;
    }
    if (!content) {
      res.status(404).json({ error: "Contenido no encontrado." });
      return;
    }

    const mappedCategory = mapEducationalCategoryToContentCategory(content.category);
    const next = addExperience(user.level, user.experience, XP_REWARD);

    const result = await prisma.$transaction(async (tx) => {
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: { level: next.level, experience: next.experience },
        select: { id: true, level: true, experience: true },
      });

      await recordXpGain(tx, userId, XP_REWARD, XpGainSource.MISSION);

      if (mappedCategory) {
        await bumpUserInterestScore(tx, userId, mappedCategory, INTEREST_DELTA);
      }

      let postId: string | null = null;
      if (createPost && mappedCategory) {
        const parental = await assertAllowPosting(userId);
        if (parental.ok) {
          const post = await tx.post.create({
            data: {
              userId,
              type: PostType.POST,
              visibility: Visibility.PUBLIC,
              category: mappedCategory,
              content: `Aprendí sobre ${content.title.toLowerCase()} 🌌`,
            },
            select: { id: true },
          });
          postId = post.id;
        }
      }

      const missionRewards = await applyReadContentMissionProgress(tx, userId);
      const dailyChallengeBonus = await maybeGrantDailyChallengeBonus(tx, userId);

      return { updatedUser, postId, mappedCategory, missionRewards, dailyChallengeBonus };
    });

    res.status(200).json({
      ok: true,
      xpGained: XP_REWARD,
      interestIncreased: Boolean(result.mappedCategory),
      createdPost: Boolean(result.postId),
      postId: result.postId,
      user: result.updatedUser,
      levelUp: result.updatedUser.level > user.level,
      newLevel: result.updatedUser.level,
      missionRewards: result.missionRewards,
      dailyChallengeBonus: result.dailyChallengeBonus,
    });
  } catch (err) {
    logError("content.completeEducationalContent", err);
    res.status(500).json({ error: "Error al completar contenido educativo." });
  }
}
