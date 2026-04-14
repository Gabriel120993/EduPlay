import type { Request, Response } from "express";
import { ContentCategory } from "@prisma/client";
import { CONTENT_CATEGORY_VALUES, parseContentCategory } from "../lib/contentCategory";
import { userBelongsToParent } from "../lib/parentChildAccess";
import { logError } from "../lib/logger";
import { prisma } from "../lib/prisma";

/** Todas las categorías de contenido pueden elegirse en onboarding. */
const ONBOARDING_INTERESTS = new Set<ContentCategory>(CONTENT_CATEGORY_VALUES);
const MIN_ONBOARDING_INTERESTS = 3;
/** Puntuación inicial al completar el onboarding por cada categoría elegida (create o update). */
const ONBOARDING_INITIAL_SCORE = 20;
const FIRST_ACTIONS = new Set(["PLAY_GAME", "FOLLOW_USERS"]);

/** Menor: solo su propio `userId`. Padre: hijo de su cuenta. */
async function assertCanAccessOnboardingUser(req: Request, userId: string): Promise<boolean> {
  const auth = req.auth;
  if (!auth) return false;
  if (auth.kind === "child") {
    return auth.userId === userId;
  }
  return userBelongsToParent(userId, auth.parentId);
}

export async function getUserOnboardingStatus(req: Request, res: Response): Promise<void> {
  const userId = req.params.id?.trim();
  if (!req.auth) {
    res.status(401).json({ error: "No autenticado." });
    return;
  }
  if (!userId) {
    res.status(400).json({ error: "id de usuario es obligatorio." });
    return;
  }

  const ok = await assertCanAccessOnboardingUser(req, userId);
  if (!ok) {
    res.status(404).json({ error: "Usuario no encontrado." });
    return;
  }

  try {
    const row = await prisma.user.findUnique({
      where: { id: userId },
      select: { onboardingCompletedAt: true, onboardingFirstAction: true },
    });
    res.json({
      completed: row?.onboardingCompletedAt != null,
      firstAction: row?.onboardingFirstAction ?? null,
    });
  } catch (err) {
    logError("onboarding", err);
    res.status(500).json({ error: "Error al leer el onboarding." });
  }
}

type OnboardingBody = {
  interests: string[];
  firstAction: string;
};

export async function postUserOnboarding(req: Request, res: Response): Promise<void> {
  const userId = req.params.id?.trim();
  if (!req.auth) {
    res.status(401).json({ error: "No autenticado." });
    return;
  }
  if (!userId) {
    res.status(400).json({ error: "id de usuario es obligatorio." });
    return;
  }

  const body = req.body as OnboardingBody;
  const interests = Array.isArray(body?.interests) ? body.interests.map((x) => String(x).trim()) : [];
  const firstAction = typeof body?.firstAction === "string" ? body.firstAction.trim() : "";

  /** Categorías válidas sin duplicados (orden = primera aparición en el body). */
  const seen = new Set<ContentCategory>();
  const uniqueCategories: ContentCategory[] = [];
  for (const raw of interests) {
    const c = parseContentCategory(raw);
    if (!c || !ONBOARDING_INTERESTS.has(c)) {
      res.status(400).json({ error: `Interés no permitido: ${raw}` });
      return;
    }
    if (seen.has(c)) continue;
    seen.add(c);
    uniqueCategories.push(c);
  }
  if (uniqueCategories.length < MIN_ONBOARDING_INTERESTS) {
    res.status(400).json({
      error: `Elegí al menos ${MIN_ONBOARDING_INTERESTS} categorías distintas.`,
    });
    return;
  }
  if (!FIRST_ACTIONS.has(firstAction)) {
    res.status(400).json({ error: "firstAction debe ser PLAY_GAME o FOLLOW_USERS." });
    return;
  }

  const ok = await assertCanAccessOnboardingUser(req, userId);
  if (!ok) {
    res.status(404).json({ error: "Usuario no encontrado." });
    return;
  }

  try {
    const already = await prisma.user.findUnique({
      where: { id: userId },
      select: { onboardingCompletedAt: true },
    });
    if (already?.onboardingCompletedAt) {
      res.json({ ok: true, alreadyCompleted: true });
      return;
    }

    await prisma.$transaction(async (tx) => {
      for (const category of uniqueCategories) {
        const existing = await tx.userInterest.findUnique({
          where: { userId_category: { userId, category } },
        });
        const score = Math.max(existing?.score ?? 0, ONBOARDING_INITIAL_SCORE);
        await tx.userInterest.upsert({
          where: { userId_category: { userId, category } },
          create: { userId, category, score: ONBOARDING_INITIAL_SCORE },
          update: { score },
        });
      }
      await tx.user.update({
        where: { id: userId },
        data: {
          onboardingCompletedAt: new Date(),
          onboardingFirstAction: firstAction,
        },
      });
    });

    res.status(201).json({ ok: true });
  } catch (err) {
    logError("onboarding", err);
    res.status(500).json({ error: "Error al guardar preferencias." });
  }
}
