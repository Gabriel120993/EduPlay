import type { Request, Response } from "express";
import { z } from "zod";

import {
  buildMissionMapNodes,
  computeProgressRatio,
  currentSeasonMonthUtc,
  getThematicMissionBySlug,
  isThematicMissionAvailableNow,
  thematicMissionStepCount,
  THEMATIC_MISSIONS,
  type ThematicMissionDef,
} from "../lib/thematicMissionsCatalog";
import { logError } from "../lib/logger";
import { prisma } from "../lib/prisma";

function childUserId(req: Request, res: Response): string | null {
  const auth = req.auth;
  if (!auth || auth.kind !== "child") {
    res.status(403).json({ error: "Esta operación es solo para menores." });
    return null;
  }
  return auth.userId;
}

/** Misiones disponibles desde BD para feed/recomendaciones. */
export async function getAvailableMissions(req: Request, res: Response): Promise<void> {
  const auth = req.auth;
  if (!auth || auth.kind !== "child") {
    res.status(403).json({ error: "Esta operación es solo para menores." });
    return;
  }

  try {
    const [missions, progressRows] = await Promise.all([
      prisma.thematicMission.findMany({
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.userThematicMissionProgress.findMany({ where: { userId: auth.userId } }),
    ]);
    const progressBySlug = new Map(progressRows.map((row) => [row.missionSlug, row]));
    res.json({
      missions: missions.map((mission) => {
        const progress = progressBySlug.get(mission.slug);
        return {
          id: mission.id,
          slug: mission.slug,
          title: mission.title,
          theme: mission.theme,
          narrative: mission.narrative,
          reward: mission.reward,
          stepCount: mission.stepCount,
          progress: progress
            ? {
                percentage: Math.round((progress.currentStepIndex / Math.max(1, mission.stepCount)) * 100),
                completed: progress.completed,
                currentStepIndex: progress.currentStepIndex,
                lastSeenAt: progress.updatedAt.toISOString(),
              }
            : null,
        };
      }),
    });
  } catch (err) {
    logError("missions.available", err);
    res.status(500).json({ error: "Error al cargar misiones disponibles." });
  }
}

function serializeMissionBase(def: ThematicMissionDef, now: Date) {
  const totalSteps = thematicMissionStepCount(def);
  return {
    slug: def.slug,
    title: def.title,
    theme: def.theme,
    narrative: def.narrative,
    reward: def.reward,
    rewardAvatarKey: def.rewardAvatarKey ?? null,
    seasonMonth: def.seasonMonth,
    festivity: def.festivity,
    availableFrom: def.availableFrom,
    availableUntil: def.availableUntil,
    urgentUntil: def.urgentUntil,
    source: def.source,
    sortOrder: def.sortOrder,
    stepCount: totalSteps,
    steps: def.steps.map((s) => ({
      order: s.order,
      kind: s.kind,
      title: s.title,
      summary: s.summary,
      storyBeat: s.storyBeat ?? null,
    })),
    mapNodes: buildMissionMapNodes(def),
    availableNow: isThematicMissionAvailableNow(def, now),
  };
}

const catalogQuerySchema = z.object({
  festivity: z.enum(["none", "christmas", "halloween", "earth_day", "carnival"]).optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  onlyAvailable: z.enum(["true", "false"]).optional(),
});

/** Catálogo de misiones temáticas (filtrado opcional). */
export async function getThematicMissionsCatalog(req: Request, res: Response): Promise<void> {
  const parsed = catalogQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Parámetros inválidos." });
    return;
  }
  const { festivity, month, onlyAvailable } = parsed.data;
  const now = new Date();
  const restrictAvailability = onlyAvailable !== "false";

  let list = [...THEMATIC_MISSIONS];
  if (festivity) {
    list = list.filter((m) => m.festivity === festivity);
  }
  if (month) {
    list = list.filter((m) => m.seasonMonth === month || m.seasonMonth === null);
  }
  if (restrictAvailability) {
    list = list.filter((m) => isThematicMissionAvailableNow(m, now));
  }

  list.sort((a, b) => a.sortOrder - b.sortOrder);
  res.json({
    generatedAt: now.toISOString(),
    missions: list.map((m) => serializeMissionBase(m, now)),
  });
}

/** Temporadas: mes actual, sugerencias y misiones con urgencia. */
export async function getThematicMissionsSeasons(_req: Request, res: Response): Promise<void> {
  const now = new Date();
  const currentMonth = currentSeasonMonthUtc(now);
  const monthlySpotlight = THEMATIC_MISSIONS.filter((m) => m.seasonMonth === currentMonth).map((m) => m.slug);
  const festive = THEMATIC_MISSIONS.filter((m) => m.festivity !== "none").map((m) => ({
    slug: m.slug,
    festivity: m.festivity,
    availableFrom: m.availableFrom,
    availableUntil: m.availableUntil,
  }));
  const limited = THEMATIC_MISSIONS.filter((m) => m.urgentUntil).map((m) => ({
    slug: m.slug,
    urgentUntil: m.urgentUntil,
    availableFrom: m.availableFrom,
    availableUntil: m.availableUntil,
  }));
  const community = THEMATIC_MISSIONS.filter((m) => m.source === "community").map((m) => m.slug);

  res.json({
    now: now.toISOString(),
    currentMonthUtc: currentMonth,
    monthlySpotlightSlugs: monthlySpotlight,
    festivityMissions: festive,
    timeLimitedMissions: limited,
    communityMissionSlugs: community,
    newMissionsEachMonthNote:
      "Las rotaciones mensuales se marcan con `seasonMonth`; la app puede destacar el mes UTC actual.",
  });
}

async function loadVoteStats(): Promise<Map<string, number>> {
  const rows = await prisma.thematicMissionVote.groupBy({
    by: ["missionSlug"],
    _count: { _all: true },
  });
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(r.missionSlug, r._count._all);
  }
  return map;
}

/** Catálogo + progreso del menor autenticado + votos (comunidad). */
export async function getThematicMissionsState(req: Request, res: Response): Promise<void> {
  const userId = childUserId(req, res);
  if (!userId) return;

  try {
    const now = new Date();
    const [progressRows, userVotes, voteStats] = await Promise.all([
      prisma.userThematicMissionProgress.findMany({ where: { userId } }),
      prisma.thematicMissionVote.findMany({ where: { userId }, select: { missionSlug: true } }),
      loadVoteStats(),
    ]);
    const progressBySlug = new Map(progressRows.map((p) => [p.missionSlug, p]));
    const voted = new Set(userVotes.map((v) => v.missionSlug));

    const missions = THEMATIC_MISSIONS.sort((a, b) => a.sortOrder - b.sortOrder).map((def) => {
      const base = serializeMissionBase(def, now);
      const total = thematicMissionStepCount(def);
      const row = progressBySlug.get(def.slug);
      const progressPercent = row
        ? computeProgressRatio(row.currentStepIndex, total)
        : 0;
      const progress =
        row == null
          ? null
          : {
              currentStepIndex: row.currentStepIndex,
              completed: row.completed,
              bestScore: row.bestScore,
              attemptCount: row.attemptCount,
              completedAt: row.completedAt?.toISOString() ?? null,
              progressPercent,
              checkpointSaved: true,
              canRepeat: row.completed,
            };
      const voteCount = def.source === "community" ? voteStats.get(def.slug) ?? 0 : undefined;
      const userVoted = def.source === "community" ? voted.has(def.slug) : undefined;
      return { ...base, progress, voteCount, userVoted };
    });

    res.json({
      now: now.toISOString(),
      currentMonthUtc: currentSeasonMonthUtc(now),
      missions,
    });
  } catch (err) {
    logError("missions.state", err);
    res.status(500).json({ error: "Error al cargar misiones temáticas." });
  }
}

const patchProgressSchema = z.object({
  action: z.literal("advance"),
  /** Puntuación opcional al cerrar la misión (mejor marca). */
  score: z.number().int().min(0).max(10_000).optional(),
});

/** Avanza un paso (checkpoint) o completa la misión en el último paso. */
export async function patchThematicMissionProgress(req: Request, res: Response): Promise<void> {
  const userId = childUserId(req, res);
  if (!userId) return;

  const slug = req.params.slug;
  if (!slug || typeof slug !== "string") {
    res.status(400).json({ error: "slug inválido." });
    return;
  }

  const parsed = patchProgressSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Cuerpo inválido." });
    return;
  }

  const def = getThematicMissionBySlug(slug);
  if (!def) {
    res.status(404).json({ error: "Misión no encontrada." });
    return;
  }

  const now = new Date();
  if (!isThematicMissionAvailableNow(def, now)) {
    res.status(403).json({ error: "Esta misión no está disponible en este momento." });
    return;
  }

  const total = thematicMissionStepCount(def);

  try {
    let row = await prisma.userThematicMissionProgress.findUnique({
      where: { userId_missionSlug: { userId, missionSlug: slug } },
    });
    if (!row) {
      row = await prisma.userThematicMissionProgress.create({
        data: {
          userId,
          missionSlug: slug,
          currentStepIndex: 0,
          completed: false,
          attemptCount: 1,
        },
      });
    }

    if (row.completed) {
      res.status(409).json({ error: "Misión ya completada. Usá repetir para volver a intentar." });
      return;
    }

    if (row.currentStepIndex >= total) {
      res.status(409).json({ error: "Estado de progreso inconsistente." });
      return;
    }

    const nextIndex = row.currentStepIndex + 1;
    const justFinished = nextIndex >= total;
    const bestScore =
      justFinished && parsed.data.score != null
        ? row.bestScore == null
          ? parsed.data.score
          : Math.max(row.bestScore, parsed.data.score)
        : row.bestScore;

    const updated = await prisma.userThematicMissionProgress.update({
      where: { id: row.id },
      data: {
        currentStepIndex: justFinished ? total : nextIndex,
        completed: justFinished,
        completedAt: justFinished ? new Date() : null,
        bestScore: bestScore ?? undefined,
      },
    });

    res.json({
      missionSlug: slug,
      progress: {
        currentStepIndex: updated.currentStepIndex,
        completed: updated.completed,
        bestScore: updated.bestScore,
        attemptCount: updated.attemptCount,
        completedAt: updated.completedAt?.toISOString() ?? null,
        progressPercent: computeProgressRatio(updated.currentStepIndex, total),
      },
    });
  } catch (err) {
    logError("missions.progress", err);
    res.status(500).json({ error: "Error al actualizar progreso." });
  }
}

/** Repetir misión completada para mejorar puntuación (reinicia checkpoints). */
export async function postThematicMissionRestart(req: Request, res: Response): Promise<void> {
  const userId = childUserId(req, res);
  if (!userId) return;

  const slug = req.params.slug;
  if (!slug || typeof slug !== "string") {
    res.status(400).json({ error: "slug inválido." });
    return;
  }

  const def = getThematicMissionBySlug(slug);
  if (!def) {
    res.status(404).json({ error: "Misión no encontrada." });
    return;
  }

  const now = new Date();
  if (!isThematicMissionAvailableNow(def, now)) {
    res.status(403).json({ error: "Esta misión no está disponible en este momento." });
    return;
  }

  const total = thematicMissionStepCount(def);

  try {
    const row = await prisma.userThematicMissionProgress.findUnique({
      where: { userId_missionSlug: { userId, missionSlug: slug } },
    });
    if (!row || !row.completed) {
      res.status(409).json({ error: "Solo podés repetir una misión ya completada." });
      return;
    }

    const updated = await prisma.userThematicMissionProgress.update({
      where: { id: row.id },
      data: {
        currentStepIndex: 0,
        completed: false,
        completedAt: null,
        attemptCount: { increment: 1 },
      },
    });

    res.json({
      missionSlug: slug,
      progress: {
        currentStepIndex: updated.currentStepIndex,
        completed: updated.completed,
        bestScore: updated.bestScore,
        attemptCount: updated.attemptCount,
        completedAt: null,
        progressPercent: computeProgressRatio(updated.currentStepIndex, total),
      },
    });
  } catch (err) {
    logError("missions.restart", err);
    res.status(500).json({ error: "Error al reiniciar la misión." });
  }
}

/** Un voto por misión comunitaria y usuario. */
export async function postThematicMissionVote(req: Request, res: Response): Promise<void> {
  const userId = childUserId(req, res);
  if (!userId) return;

  const slug = req.params.slug;
  if (!slug || typeof slug !== "string") {
    res.status(400).json({ error: "slug inválido." });
    return;
  }

  const def = getThematicMissionBySlug(slug);
  if (!def || def.source !== "community") {
    res.status(400).json({ error: "Solo se puede votar misiones de la comunidad." });
    return;
  }

  try {
    await prisma.thematicMissionVote.create({
      data: { userId, missionSlug: slug },
    });
    const count = await prisma.thematicMissionVote.count({ where: { missionSlug: slug } });
    res.status(201).json({ missionSlug: slug, voteCount: count });
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "P2002"
    ) {
      res.status(409).json({ error: "Ya votaste esta misión." });
      return;
    }
    logError("missions.vote", err);
    res.status(500).json({ error: "Error al registrar el voto." });
  }
}
