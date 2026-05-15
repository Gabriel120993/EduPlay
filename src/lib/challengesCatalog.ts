export type GamifiedChallengeDef = {
  slug: string;
  title: string;
  description: string;
  target: number;
  /** Monedas virtuales (se acreditan en `User.quizCoins`). */
  rewardCoins: number;
  rewardXp: number;
  /** Horas de “premium temporal” informativas (la app/tutor aplica la política comercial). */
  premiumTempHours: number;
  /** Si se emite URL de certificado placeholder al completar. */
  grantCertificate: boolean;
  /** ID fijo de logro para insignia de perfil (si existe en catálogo). */
  badgeAchievementId: string | null;
};

export const DAILY_CHALLENGE_POOL: GamifiedChallengeDef[] = [
  {
    slug: 'wise_streak',
    title: 'Racha de Sabios',
    description: 'Responder 5 preguntas correctas seguidas (quiz o juego visual).',
    target: 5,
    rewardCoins: 25,
    rewardXp: 45,
    premiumTempHours: 0,
    grantCertificate: false,
    badgeAchievementId: 'c0000001-0000-4000-8000-00000000e101',
  },
  {
    slug: 'explorer_new_subject',
    title: 'Explorador',
    description:
      'Completar 1 actividad en una materia que no hayas practicado esta semana (registrado por la app).',
    target: 1,
    rewardCoins: 20,
    rewardXp: 40,
    premiumTempHours: 0,
    grantCertificate: false,
    badgeAchievementId: 'c0000001-0000-4000-8000-00000000e102',
  },
  {
    slug: 'helper_support_message',
    title: 'Ayudante',
    description: 'Enviar 1 mensaje de apoyo a un amigo (chat aprobado).',
    target: 1,
    rewardCoins: 15,
    rewardXp: 35,
    premiumTempHours: 0,
    grantCertificate: false,
    badgeAchievementId: 'c0000001-0000-4000-8000-00000000e103',
  },
  {
    slug: 'speedster_30s',
    title: 'Velocista',
    description:
      'Responder 3 preguntas correctas en menos de 30 segundos en total (sumatorio de tiempos entre respuestas).',
    target: 3,
    rewardCoins: 30,
    rewardXp: 50,
    premiumTempHours: 0,
    grantCertificate: false,
    badgeAchievementId: 'c0000001-0000-4000-8000-00000000e104',
  },
  {
    slug: 'perfectionist_stars',
    title: 'Perfeccionista',
    description:
      'Obtener 3 estrellas en cualquier minijuego o actividad con calificación por estrellas.',
    target: 1,
    rewardCoins: 25,
    rewardXp: 45,
    premiumTempHours: 0,
    grantCertificate: false,
    badgeAchievementId: 'c0000001-0000-4000-8000-00000000e105',
  },
];

export const WEEKLY_CHALLENGE_POOL: GamifiedChallengeDef[] = [
  {
    slug: 'math_master_10',
    title: 'Maestro de Matemáticas',
    description: 'Completar 10 quizzes de matemáticas en la semana.',
    target: 10,
    rewardCoins: 120,
    rewardXp: 180,
    premiumTempHours: 6,
    grantCertificate: true,
    badgeAchievementId: 'c0000001-0000-4000-8000-00000000e201',
  },
  {
    slug: 'junior_scientist_3',
    title: 'Científico Junior',
    description: 'Terminar 3 experimentos virtuales (ciencia: quiz visual o actividad guiada).',
    target: 3,
    rewardCoins: 100,
    rewardXp: 160,
    premiumTempHours: 6,
    grantCertificate: true,
    badgeAchievementId: 'c0000001-0000-4000-8000-00000000e202',
  },
  {
    slug: 'avid_reader_5',
    title: 'Lector Ávido',
    description:
      'Leer 5 textos de comprensión lectora (contenido educativo marcado como aprendido).',
    target: 5,
    rewardCoins: 90,
    rewardXp: 150,
    premiumTempHours: 4,
    grantCertificate: true,
    badgeAchievementId: 'c0000001-0000-4000-8000-00000000e203',
  },
  {
    slug: 'solidary_friend_3',
    title: 'Amigo Solidario',
    description: 'Ayudar a 3 amigos con sus dudas (mensajes de apoyo contabilizados por la app).',
    target: 3,
    rewardCoins: 110,
    rewardXp: 170,
    premiumTempHours: 6,
    grantCertificate: true,
    badgeAchievementId: 'c0000001-0000-4000-8000-00000000e204',
  },
  {
    slug: 'global_explorer_5',
    title: 'Explorador Global',
    description: 'Aprender sobre 5 países nuevos (geografía: quizzes, mapas o contenidos).',
    target: 5,
    rewardCoins: 95,
    rewardXp: 155,
    premiumTempHours: 4,
    grantCertificate: true,
    badgeAchievementId: 'c0000001-0000-4000-8000-00000000e205',
  },
];

export type SpecialChallengeWindow = {
  slug: string;
  title: string;
  description: string;
  target: number;
  rewardCoins: number;
  rewardXp: number;
  premiumTempHours: number;
  grantCertificate: boolean;
  badgeAchievementId: string | null;
  /** Inicio inclusive (UTC). */
  startsAt: Date;
  /** Fin exclusive (UTC). */
  endsAt: Date;
};

/** Ventanas de ejemplo; ajustables según calendario editorial. */
export function listSpecialChallengeWindows(now: Date = new Date()): SpecialChallengeWindow[] {
  const y = now.getUTCFullYear();
  return [
    {
      slug: 'summer_marathon',
      title: 'Maratón de Verano',
      description:
        '30 días de actividad consecutiva en EduPlay (la app envía incrementos diarios).',
      target: 30,
      rewardCoins: 500,
      rewardXp: 600,
      premiumTempHours: 48,
      grantCertificate: true,
      badgeAchievementId: 'c0000001-0000-4000-8000-00000000e301',
      startsAt: new Date(Date.UTC(y, 5, 1)),
      endsAt: new Date(Date.UTC(y, 8, 1)),
    },
    {
      slug: 'world_cup_knowledge',
      title: 'Copa Mundial de Conocimientos',
      description:
        'Competencia entre países: sumá puntos representando a tu país en quizzes globales.',
      target: 50,
      rewardCoins: 400,
      rewardXp: 500,
      premiumTempHours: 24,
      grantCertificate: true,
      badgeAchievementId: 'c0000001-0000-4000-8000-00000000e302',
      startsAt: new Date(Date.UTC(y, 5, 10)),
      endsAt: new Date(Date.UTC(y, 6, 20)),
    },
    {
      slug: 'science_week',
      title: 'Semana de la Ciencia',
      description: 'Retos exclusivos de ciencias durante una semana dedicada.',
      target: 12,
      rewardCoins: 220,
      rewardXp: 260,
      premiumTempHours: 12,
      grantCertificate: true,
      badgeAchievementId: 'c0000001-0000-4000-8000-00000000e303',
      startsAt: new Date(Date.UTC(y, 10, 7)),
      endsAt: new Date(Date.UTC(y, 10, 14)),
    },
    {
      slug: 'parent_child_challenge',
      title: 'Desafío Padre-Hijo',
      description: 'Actividades para hacer juntos; el tutor confirma en la app familiar.',
      target: 5,
      rewardCoins: 180,
      rewardXp: 220,
      premiumTempHours: 8,
      grantCertificate: true,
      badgeAchievementId: 'c0000001-0000-4000-8000-00000000e304',
      startsAt: new Date(Date.UTC(y, 4, 1)),
      endsAt: new Date(Date.UTC(y, 4, 16)),
    },
  ];
}

export function activeSpecialWindows(now: Date = new Date()): SpecialChallengeWindow[] {
  const t = now.getTime();
  return listSpecialChallengeWindows(now).filter(
    (w) => t >= w.startsAt.getTime() && t < w.endsAt.getTime(),
  );
}
