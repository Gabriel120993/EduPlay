import { ContentCategory, MissionType, Prisma } from '@prisma/client';

import { DAILY_CHALLENGE_MISSION_IDS, DAILY_CHALLENGE_ORDER } from './dailyChallengeConstants';
import { utcMissionDate } from './missionProgress';
import { prisma } from './prisma';

/** IDs fijos para upsert idempotente del catálogo base (recomendaciones / variedad). */
const SEED = {
  earnXp: 'a0000001-0000-4000-8000-000000000001',
  playEducation: 'a0000001-0000-4000-8000-000000000003',
  playPuzzle: 'a0000001-0000-4000-8000-000000000004',
  achievementAny: 'a0000001-0000-4000-8000-000000000005',
  playSports: 'a0000001-0000-4000-8000-000000000006',
} as const;

async function ensureMissionCatalog(tx: Prisma.TransactionClient): Promise<void> {
  const seeds: Prisma.MissionCreateInput[] = [
    {
      id: SEED.earnXp,
      title: 'Gana experiencia',
      description: 'Acumula XP hoy (partidas o logros).',
      category: null,
      targetValue: 50,
      type: MissionType.EARN_XP,
    },
    {
      id: SEED.playEducation,
      title: 'Juegos educativos',
      description: 'Juega en la categoría educación.',
      category: ContentCategory.education,
      targetValue: 1,
      type: MissionType.PLAY_GAMES,
    },
    {
      id: SEED.playPuzzle,
      title: 'Rompecabezas',
      description: 'Juega en la categoría puzzle.',
      category: ContentCategory.puzzle,
      targetValue: 1,
      type: MissionType.PLAY_GAMES,
    },
    {
      id: SEED.playSports,
      title: 'Deportes',
      description: 'Juega en la categoría deportes.',
      category: ContentCategory.sports,
      targetValue: 1,
      type: MissionType.PLAY_GAMES,
    },
    {
      id: SEED.achievementAny,
      title: 'Nuevo logro',
      description: 'Desbloquea un logro hoy.',
      category: null,
      targetValue: 1,
      type: MissionType.COMPLETE_ACHIEVEMENT,
    },
    {
      id: DAILY_CHALLENGE_MISSION_IDS.play,
      title: 'Jugar una partida',
      description: 'Reto diario: completá al menos una partida (quiz o juego visual).',
      category: null,
      targetValue: 1,
      type: MissionType.PLAY_GAMES,
    },
    {
      id: DAILY_CHALLENGE_MISSION_IDS.read,
      title: 'Leer un contenido',
      description: 'Reto diario: marcá como aprendido un artículo en Aprender.',
      category: null,
      targetValue: 1,
      type: MissionType.READ_CONTENT,
    },
    {
      id: DAILY_CHALLENGE_MISSION_IDS.correct,
      title: 'Acertar respuestas',
      description: 'Reto diario: sumá 3 respuestas correctas en quizzes o juegos visuales.',
      category: null,
      targetValue: 3,
      type: MissionType.CORRECT_ANSWERS,
    },
  ];

  for (const m of seeds) {
    await tx.mission.upsert({
      where: { id: m.id as string },
      create: {
        id: m.id as string,
        title: m.title,
        description: m.description,
        category: m.category ?? null,
        targetValue: m.targetValue,
        type: m.type,
      },
      update: {
        title: m.title,
        description: m.description,
        category: m.category ?? null,
        targetValue: m.targetValue,
        type: m.type,
      },
    });
  }
}

function expectedDailyMissionIdsSorted(): string {
  return [...DAILY_CHALLENGE_ORDER].sort().join(',');
}

export type GenerateDailyMissionsResult = {
  date: string;
  created: boolean;
  userMissionIds: string[];
  missionIds: string[];
};

/**
 * Genera exactamente 3 UserMission (reto diario fijo) para el usuario y el día UTC indicado.
 * Si ya hay 3 pero no coinciden con el reto actual, se regeneran.
 */
export async function generateDailyMissionsForUser(
  userId: string,
  at: Date = new Date(),
): Promise<GenerateDailyMissionsResult> {
  const date = utcMissionDate(at);
  const dateIso = date.toISOString().slice(0, 10);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    await ensureMissionCatalog(tx);

    const existing = await tx.userMission.findMany({
      where: { userId, date },
      select: { id: true, missionId: true },
    });

    const expected = expectedDailyMissionIdsSorted();
    const actual = existing
      .map((e) => e.missionId)
      .sort()
      .join(',');

    if (existing.length >= 3 && actual === expected) {
      return {
        date: dateIso,
        created: false,
        userMissionIds: existing.map((e) => e.id),
        missionIds: existing.map((e) => e.missionId),
      };
    }

    if (existing.length > 0) {
      await tx.userMission.deleteMany({ where: { userId, date } });
    }

    const missionIds = [...DAILY_CHALLENGE_ORDER];

    const rows = await Promise.all(
      missionIds.map((missionId) =>
        tx.userMission.create({
          data: {
            userId,
            missionId,
            date,
            progress: 0,
            completed: false,
          },
          select: { id: true },
        }),
      ),
    );

    return {
      date: dateIso,
      created: true,
      userMissionIds: rows.map((r) => r.id),
      missionIds,
    };
  });
}
