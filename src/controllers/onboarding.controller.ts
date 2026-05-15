import type { Request, Response } from 'express';
import { ContentCategory } from '@prisma/client';
import { CONTENT_CATEGORY_VALUES, parseContentCategory } from '../lib/contentCategory';
import { userBelongsToParent } from '../lib/parentChildAccess';
import { logError } from '../lib/logger';
import { prisma } from '../lib/prisma';

/** Todas las categorías de contenido pueden elegirse en onboarding. */
const ONBOARDING_INTERESTS = new Set<ContentCategory>(CONTENT_CATEGORY_VALUES);
const MIN_ONBOARDING_INTERESTS = 3;
/** Puntuación inicial al completar el onboarding por cada categoría elegida (create o update). */
const ONBOARDING_INITIAL_SCORE = 20;
const FIRST_ACTIONS_MINOR = new Set(['PLAY_GAME', 'FOLLOW_USERS']);
const FIRST_ACTION_PARENT_ONBOARDING = 'ADD_MINOR';

/** Menor: solo su propio `userId`. Padre: hijo de su cuenta. */
async function assertCanAccessOnboardingUser(req: Request, userId: string): Promise<boolean> {
  const auth = req.auth;
  if (!auth) return false;
  if (auth.kind === 'child') {
    return auth.userId === userId;
  }
  return userBelongsToParent(userId, auth.parentId);
}

export async function getUserOnboardingStatus(req: Request, res: Response): Promise<void> {
  const userId = req.params.id?.trim();
  if (!req.auth) {
    res.status(401).json({ error: 'No autenticado.' });
    return;
  }
  if (!userId) {
    res.status(400).json({ error: 'id de usuario es obligatorio.' });
    return;
  }

  const ok = await assertCanAccessOnboardingUser(req, userId);
  if (!ok) {
    res.status(404).json({ error: 'Usuario no encontrado.' });
    return;
  }

  try {
    const row = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        type: true,
        onboardingCompletedAt: true,
        onboardingFirstAction: true,
        interests: { select: { id: true } },
        parent: {
          select: {
            children: {
              where: { type: 'minor' },
              select: { id: true },
            },
          },
        },
      },
    });
    const minorsAsParent = row?.parent.children ?? [];
    const hasMinors = minorsAsParent.length > 0;
    const interestCount = row?.interests?.length ?? 0;
    res.json({
      completed: row?.onboardingCompletedAt != null,
      firstAction: row?.onboardingFirstAction ?? null,
      userType: row?.type ?? null,
      interestCount,
      hasMinors,
    });
  } catch (err) {
    logError('onboarding', err);
    res.status(500).json({ error: 'Error al leer el onboarding.' });
  }
}

type OnboardingBody = {
  interests?: string[];
  firstAction: string;
};

export async function postUserOnboarding(req: Request, res: Response): Promise<void> {
  const userId = req.params.id?.trim();
  if (!req.auth) {
    res.status(401).json({ error: 'No autenticado.' });
    return;
  }
  if (!userId) {
    res.status(400).json({ error: 'id de usuario es obligatorio.' });
    return;
  }

  const body = req.body as OnboardingBody;
  const interests = Array.isArray(body?.interests)
    ? body.interests.map((x) => String(x).trim())
    : [];
  const firstAction = typeof body?.firstAction === 'string' ? body.firstAction.trim() : '';

  const ok = await assertCanAccessOnboardingUser(req, userId);
  if (!ok) {
    res.status(404).json({ error: 'Usuario no encontrado.' });
    return;
  }

  const subject = await prisma.user.findUnique({
    where: { id: userId },
    select: { type: true, parentId: true, onboardingCompletedAt: true },
  });
  if (!subject) {
    res.status(404).json({ error: 'Usuario no encontrado.' });
    return;
  }
  if (subject.onboardingCompletedAt) {
    res.json({ ok: true, alreadyCompleted: true });
    return;
  }

  /** Tutor (`User.type === parent`): completar sin intereses; requiere al menos un menor. */
  if (subject.type === 'parent') {
    if (firstAction !== FIRST_ACTION_PARENT_ONBOARDING) {
      res
        .status(400)
        .json({ error: `firstAction del tutor debe ser ${FIRST_ACTION_PARENT_ONBOARDING}.` });
      return;
    }
    const minorCount = await prisma.user.count({
      where: { parentId: subject.parentId, type: 'minor' },
    });
    if (minorCount < 1) {
      res.status(400).json({ error: 'Agregá al menos un perfil de hijo antes de continuar.' });
      return;
    }
    try {
      await prisma.user.update({
        where: { id: userId },
        data: {
          onboardingCompletedAt: new Date(),
          onboardingFirstAction: FIRST_ACTION_PARENT_ONBOARDING,
        },
      });
      res.status(201).json({ ok: true });
    } catch (err) {
      logError('onboarding', err);
      res.status(500).json({ error: 'Error al guardar onboarding del tutor.' });
    }
    return;
  }

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
  if (!FIRST_ACTIONS_MINOR.has(firstAction)) {
    res.status(400).json({ error: 'firstAction debe ser PLAY_GAME o FOLLOW_USERS.' });
    return;
  }

  try {
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

      /** `MinorProfile.interests` (Json): espejo de las categorías elegidas para perfil del menor. */
      const mp = await tx.minorProfile.findUnique({ where: { userId }, select: { id: true } });
      if (mp) {
        await tx.minorProfile.update({
          where: { userId },
          data: { interests: uniqueCategories },
        });
      }
    });

    res.status(201).json({ ok: true });
  } catch (err) {
    logError('onboarding', err);
    res.status(500).json({ error: 'Error al guardar preferencias.' });
  }
}
