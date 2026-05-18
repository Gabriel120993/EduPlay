import type { PlayGameType } from '@prisma/client';
import { DetectiveEngine, type DetectiveMystery } from '../games/detective/detective.engine';
import { FactCheckEngine } from '../games/factcheck/factcheck.engine';
import { MathEngine } from '../games/math/math.engine';
import { MemoryEngine } from '../games/memory/memory.engine';
import { PatternsEngine } from '../games/patterns/patterns.engine';
import { PLAY_GAME_MAX_SESSION_MS, type PlayGameSlug } from '../games/types';
import { areAcceptedFriends } from '../lib/chatFriendship';
import { prisma } from '../lib/prisma';
import { recordXpGain } from '../lib/xpLedger';
import { addExperience } from '../lib/xpLevel';
import { generateAutoPost } from './socialFeed.service';
import { recordSocialFriendActivity } from './socialStreak.service';

const SESSION_TTL_MS = PLAY_GAME_MAX_SESSION_MS;

export type PlayGameEngineState = Record<string, unknown>;

export function computePlayGameXp(params: {
  completed: boolean;
  wonVersus: boolean;
  difficulty: number;
  durationMs: number;
  avgDurationMs?: number;
  streakDays?: number;
}): number {
  if (!params.completed) return 0;
  let xp = 10;
  if (params.avgDurationMs && params.durationMs < params.avgDurationMs * 0.5) {
    xp += 5;
  }
  if (params.streakDays && params.streakDays > 0) {
    xp += Math.min(10, params.streakDays * 2);
  }
  if (params.wonVersus) xp += 15;
  xp += params.difficulty * 2;
  return xp;
}

export async function assertFriendsForVersus(userId: string, opponentId: string): Promise<void> {
  if (userId === opponentId) {
    throw new Error('No podés jugar contra vos mismo.');
  }
  const friends = await areAcceptedFriends(userId, opponentId);
  if (!friends) {
    throw new Error('Solo podés jugar en modo versus con amigos aprobados.');
  }
}

export async function isPlayGameUnlocked(
  userId: string,
  game: { slug: string; isPremium: boolean },
  userLevel: number,
  parentPremium: boolean,
): Promise<boolean> {
  if (parentPremium) return true;
  if (!game.isPremium) {
    const freeSlugs = ['memory-arena', 'patrones-rapidos', 'cierto-o-fake'];
    if (freeSlugs.includes(game.slug)) return true;
  }
  if (userLevel >= 7) return true;
  const unlockByLevel: Record<string, number> = {
    'detective-junior': 3,
    'matematica-relampago': 5,
    'memory-arena': 1,
    'patrones-rapidos': 1,
    'cierto-o-fake': 1,
  };
  const need = unlockByLevel[game.slug] ?? 5;
  return userLevel >= need;
}

function sessionExpiresAt(): Date {
  return new Date(Date.now() + SESSION_TTL_MS);
}

function buildInitialState(
  slug: PlayGameSlug,
  userId: string,
  opponentId: string | undefined,
  difficulty: number,
): PlayGameEngineState {
  switch (slug) {
    case 'memory-arena': {
      const players = opponentId ? [userId, opponentId] : [userId];
      const engine = new MemoryEngine({ pairs: Math.min(6 + difficulty, 12), players });
      engine.start();
      return { engine: 'memory', state: engine.getState() };
    }
    case 'patrones-rapidos': {
      const patterns = new PatternsEngine();
      const round = patterns.generate(difficulty);
      return { engine: 'patterns', round, score: 0, index: 0 };
    }
    case 'detective-junior': {
      const detective = new DetectiveEngine();
      const mystery = detective.getRandomMystery();
      return { engine: 'detective', mystery };
    }
    case 'matematica-relampago': {
      const math = new MathEngine();
      const problems = math.generateProblems(10, difficulty);
      return {
        engine: 'math',
        problems,
        solved: 0,
        deadlineMs: Date.now() + 60_000,
      };
    }
    case 'cierto-o-fake': {
      const fc = new FactCheckEngine();
      const facts = fc.getRandomFacts(5, difficulty);
      return { engine: 'factcheck', facts, index: 0, score: 0 };
    }
    default:
      return {};
  }
}

export function applyPlayGameAction(
  slug: PlayGameSlug,
  state: PlayGameEngineState,
  action: string,
  data: Record<string, unknown>,
  userId: string,
): { state: PlayGameEngineState; event: string; scoreDelta: number } {
  let scoreDelta = 0;
  let event = 'noop';

  if (slug === 'memory-arena' && state.engine === 'memory') {
    const raw = state.state as ReturnType<MemoryEngine['getState']>;
    const players = Object.keys(raw.scores);
    const engine = MemoryEngine.fromState(raw, {
      pairs: raw.cards.length / 2,
      players: players.length ? players : [userId],
    });
    if (action === 'reveal') {
      const position = Number(data.position);
      const result = engine.revealCard(userId, position);
      state.state = result.state;
      event = result.event;
      if (result.event === 'no_match') {
        state.state = engine.hideUnmatched();
      }
    } else if (action === 'hide_unmatched') {
      state.state = engine.hideUnmatched();
      event = 'hide_unmatched';
    }
    const prev = raw.scores[userId] ?? 0;
    const next = (state.state as { scores: Record<string, number> }).scores[userId] ?? 0;
    scoreDelta = Math.max(0, next - prev);
  }

  if (slug === 'patrones-rapidos' && state.engine === 'patterns') {
    const round = state.round as { correctIndex: number };
    const chosen = Number(data.optionIndex);
    if (chosen === round.correctIndex) {
      scoreDelta = 10;
      state.score = Number(state.score ?? 0) + 10;
      event = 'correct';
    } else {
      event = 'wrong';
    }
    const patterns = new PatternsEngine();
    state.round = patterns.generate(Number(data.difficulty ?? 3));
    state.index = Number(state.index ?? 0) + 1;
  }

  if (slug === 'detective-junior' && state.engine === 'detective') {
    const mystery = state.mystery as DetectiveMystery;
    const detective = new DetectiveEngine();
    if (action === 'reveal_clue') {
      const clueId = String(data.clueId ?? '');
      detective.revealClue(mystery, clueId, userId);
      event = 'clue_revealed';
    } else if (action === 'solve') {
      const result = detective.solve(mystery, String(data.suspectId ?? ''));
      event = result.correct ? 'solved' : 'wrong_suspect';
      scoreDelta = result.correct ? 50 : 0;
      state.solved = result.correct;
      state.explanation = result.explanation;
    }
    state.mystery = mystery;
  }

  if (slug === 'matematica-relampago' && state.engine === 'math') {
    const math = new MathEngine();
    const problemId = String(data.problemId ?? '');
    const answer = Number(data.answer);
    const problems = (state.problems ?? []) as import('../games/math/math.engine').MathProblem[];
    if (math.validateAnswer(problemId, answer, problems)) {
      state.solved = Number(state.solved ?? 0) + 1;
      scoreDelta = 5;
      event = 'correct';
    } else {
      event = 'wrong';
    }
    if (Number(state.solved) < 10) {
      const next = math.generateProblem(Number(data.difficulty ?? 3));
      state.problems = [...problems, next];
    }
  }

  if (slug === 'cierto-o-fake' && state.engine === 'factcheck') {
    const fc = new FactCheckEngine();
    const facts = state.facts as { id: string }[];
    const idx = Number(state.index ?? 0);
    const fact = facts[idx];
    if (fact) {
      const result = fc.check(fact.id, Boolean(data.isTrue));
      if (result?.correct) {
        scoreDelta = 8;
        state.score = Number(state.score ?? 0) + 8;
        event = 'correct';
      } else {
        event = 'wrong';
      }
      state.lastExplanation = result?.explanation;
    }
    state.index = idx + 1;
  }

  return { state, event, scoreDelta };
}

export async function startPlayGameSession(params: {
  userId: string;
  slug: string;
  opponentId?: string;
  difficulty: number;
  mode?: PlayGameType;
}): Promise<{ sessionId: string; state: PlayGameEngineState; expiresAt: string }> {
  const game = await prisma.playGame.findUnique({ where: { slug: params.slug } });
  if (!game || !game.isActive) {
    throw new Error('Juego no encontrado.');
  }

  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: {
      level: true,
      parent: { select: { isPremium: true, premiumUntil: true } },
    },
  });
  if (!user) throw new Error('Usuario no encontrado.');

  const parentPremium =
    user.parent.isPremium ||
    (user.parent.premiumUntil != null && user.parent.premiumUntil > new Date());

  const unlocked = await isPlayGameUnlocked(params.userId, game, user.level, parentPremium);
  if (!unlocked) {
    throw new Error('Juego bloqueado. Subí de nivel o activá premium.');
  }

  if (game.type === 'VERSUS' || params.opponentId) {
    if (!params.opponentId) {
      throw new Error('Este juego requiere un oponente (amigo).');
    }
    await assertFriendsForVersus(params.userId, params.opponentId);
  }

  const state = buildInitialState(
    params.slug as PlayGameSlug,
    params.userId,
    params.opponentId,
    params.difficulty,
  );

  const session = await prisma.playGameSession.create({
    data: {
      gameId: game.id,
      userId: params.userId,
      opponentId: params.opponentId,
      level: params.difficulty,
      data: state as object,
      expiresAt: sessionExpiresAt(),
    },
  });

  return {
    sessionId: session.id,
    state,
    expiresAt: session.expiresAt!.toISOString(),
  };
}

export async function getPlayGameSessionState(
  sessionId: string,
  userId: string,
): Promise<{ state: PlayGameEngineState; isYourTurn: boolean; score: number; slug: string }> {
  const session = await prisma.playGameSession.findFirst({
    where: { id: sessionId },
    include: { game: true },
  });
  if (!session) throw new Error('Sesión no encontrada.');
  if (session.userId !== userId && session.opponentId !== userId) {
    throw new Error('No autorizado.');
  }
  if (session.expiresAt && session.expiresAt < new Date()) {
    throw new Error('La sesión expiró (máximo 15 minutos).');
  }

  const state = session.data as PlayGameEngineState;
  let isYourTurn = true;
  if (session.game.slug === 'memory-arena' && state.engine === 'memory') {
    const mem = state.state as { currentPlayer?: string };
    isYourTurn = mem.currentPlayer === userId;
  }

  return {
    state,
    isYourTurn,
    score: session.score,
    slug: session.game.slug,
  };
}

export async function runPlayGameAction(params: {
  sessionId: string;
  userId: string;
  action: string;
  data: Record<string, unknown>;
}): Promise<{
  state: PlayGameEngineState;
  event: string;
  isYourTurn: boolean;
  score: number;
}> {
  const session = await prisma.playGameSession.findFirst({
    where: { id: params.sessionId },
    include: { game: true },
  });
  if (!session || session.isCompleted) throw new Error('Sesión no válida.');
  if (session.userId !== params.userId && session.opponentId !== params.userId) {
    throw new Error('No autorizado.');
  }

  const slug = session.game.slug as PlayGameSlug;
  const current = session.data as PlayGameEngineState;
  const { state, event, scoreDelta } = applyPlayGameAction(
    slug,
    current,
    params.action,
    params.data,
    params.userId,
  );

  const newScore = session.score + scoreDelta;
  await prisma.playGameSession.update({
    where: { id: session.id },
    data: { data: state as object, score: newScore },
  });

  const view = await getPlayGameSessionState(session.id, params.userId);
  return { state, event, isYourTurn: view.isYourTurn, score: newScore };
}

export async function completePlayGameSession(params: {
  sessionId: string;
  userId: string;
  durationMs: number;
  wonVersus?: boolean;
}): Promise<{ score: number; xpEarned: number; level: number; experience: number }> {
  const session = await prisma.playGameSession.findFirst({
    where: { id: params.sessionId },
    include: { game: true, user: { select: { level: true, experience: true } } },
  });
  if (!session) throw new Error('Sesión no encontrada.');
  if (session.userId !== params.userId) throw new Error('Solo el dueño puede cerrar la sesión.');

  const xpEarned = computePlayGameXp({
    completed: true,
    wonVersus: Boolean(params.wonVersus),
    difficulty: session.level,
    durationMs: params.durationMs,
  });

  const result = await prisma.$transaction(async (tx) => {
    await tx.playGameSession.update({
      where: { id: session.id },
      data: {
        isCompleted: true,
        durationMs: params.durationMs,
        xpEarned,
        score: session.score,
      },
    });

    const progress = await tx.userPlayGameProgress.upsert({
      where: { userId_gameId: { userId: params.userId, gameId: session.gameId } },
      create: {
        userId: params.userId,
        gameId: session.gameId,
        totalScore: session.score,
        gamesPlayed: 1,
        gamesWon: params.wonVersus ? 1 : 0,
        bestScore: session.score,
        xp: xpEarned,
      },
      update: {
        totalScore: { increment: session.score },
        gamesPlayed: { increment: 1 },
        gamesWon: params.wonVersus ? { increment: 1 } : undefined,
        xp: { increment: xpEarned },
      },
    });

    const before = session.user;
    const next = addExperience(before.level, before.experience, xpEarned);
    const userProgress = await tx.user.update({
      where: { id: params.userId },
      data: { level: next.level, experience: next.experience },
      select: { level: true, experience: true },
    });

    await recordXpGain(tx, params.userId, xpEarned, 'MINI_GAME');

    await tx.playGameLeaderboard.upsert({
      where: {
        gameId_userId_period: {
          gameId: session.gameId,
          userId: params.userId,
          period: 'all_time',
        },
      },
      create: {
        gameId: session.gameId,
        userId: params.userId,
        score: session.score,
        period: 'all_time',
        rank: 0,
      },
      update: {
        score: { increment: session.score },
      },
    });

    await generateAutoPost(
      {
        type: 'GAME_RESULT',
        userId: params.userId,
        gameName: session.game.name,
        score: session.score,
        playGameSessionId: session.id,
      },
      tx,
    );

    if (next.level > before.level) {
      await generateAutoPost(
        {
          type: 'LEVEL_UP',
          userId: params.userId,
          level: next.level,
          unlockedContent: 'más juegos y retos',
        },
        tx,
      );
    }

    return { userProgress, progress, xpEarned, levelBefore: before.level };
  });

  if (session.opponentId) {
    await recordSocialFriendActivity(params.userId, session.opponentId);
  }

  return {
    score: session.score,
    xpEarned: result.xpEarned,
    level: result.userProgress.level,
    experience: result.userProgress.experience,
  };
}

export async function listPlayGames(filters?: {
  category?: string;
  type?: string;
  difficulty?: number;
}) {
  const where: {
    isActive: boolean;
    category?: import('@prisma/client').PlayGameCategory;
    type?: PlayGameType;
    difficultyMin?: { lte: number };
    difficultyMax?: { gte: number };
  } = { isActive: true };

  if (filters?.category) {
    where.category = filters.category as import('@prisma/client').PlayGameCategory;
  }
  if (filters?.type) {
    where.type = filters.type as PlayGameType;
  }
  if (filters?.difficulty) {
    where.difficultyMin = { lte: filters.difficulty };
    where.difficultyMax = { gte: filters.difficulty };
  }

  return prisma.playGame.findMany({
    where,
    orderBy: { name: 'asc' },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      category: true,
      type: true,
      thumbnailUrl: true,
      isPremium: true,
      difficultyMin: true,
      difficultyMax: true,
    },
  });
}

export async function getPlayGameBySlug(slug: string) {
  return prisma.playGame.findUnique({ where: { slug } });
}

export async function getPlayGameLeaderboard(
  slug: string,
  period: string,
  userId?: string,
) {
  const game = await prisma.playGame.findUnique({ where: { slug } });
  if (!game) throw new Error('Juego no encontrado.');

  let userIds: string[] | undefined;
  if (period === 'friends' && userId) {
    const friendships = await prisma.friend.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ userId }, { friendId: userId }],
      },
      select: { userId: true, friendId: true },
    });
    userIds = [
      userId,
      ...friendships.map((f) => (f.userId === userId ? f.friendId : f.userId)),
    ];
  }

  const rows = await prisma.playGameLeaderboard.findMany({
    where: {
      gameId: game.id,
      period: period === 'friends' ? 'all_time' : period,
      ...(userIds ? { userId: { in: userIds } } : {}),
    },
    orderBy: { score: 'desc' },
    take: 50,
    include: {
      user: { select: { id: true, username: true, avatarUrl: true } },
    },
  });

  return rows.map((row, index) => ({
    rank: index + 1,
    userId: row.userId,
    name: row.user.username,
    score: row.score,
    streak: row.streak,
  }));
}

export async function getPlayGameHistory(userId: string) {
  const sessions = await prisma.playGameSession.findMany({
    where: { userId, isCompleted: true },
    orderBy: { playedAt: 'desc' },
    take: 30,
    include: {
      game: { select: { slug: true, name: true, category: true } },
    },
  });
  return sessions.map((s) => ({
    sessionId: s.id,
    game: s.game,
    score: s.score,
    xpEarned: s.xpEarned,
    playedAt: s.playedAt,
    result: s.score > 0 ? 'completed' : 'played',
  }));
}

export async function forfeitPlayGameSession(sessionId: string, userId: string) {
  const session = await prisma.playGameSession.findFirst({
    where: { id: sessionId },
    include: { game: true },
  });
  if (!session) throw new Error('Sesión no encontrada.');
  if (session.userId !== userId && session.opponentId !== userId) {
    throw new Error('No autorizado.');
  }
  const winnerId =
    session.userId === userId ? session.opponentId : session.userId;
  await prisma.playGameSession.update({
    where: { id: sessionId },
    data: { isCompleted: true },
  });
  return { winnerId: winnerId ?? null };
}

export async function declinePlayGameChallenge(challengeId: string, opponentId: string) {
  const challenge = await prisma.playGameChallenge.findUnique({
    where: { id: challengeId },
  });
  if (!challenge || challenge.opponentId !== opponentId) {
    throw new Error('Desafío no encontrado.');
  }
  await prisma.playGameChallenge.update({
    where: { id: challengeId },
    data: { status: 'DECLINED' },
  });
  return { status: 'DECLINED' as const };
}

export async function listPlayGameChallenges(userId: string) {
  const pending = await prisma.playGameChallenge.findMany({
    where: { opponentId: userId, status: 'PENDING', expiresAt: { gt: new Date() } },
    include: {
      game: { select: { slug: true, name: true } },
      challenger: { select: { id: true, username: true, avatarUrl: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  const sent = await prisma.playGameChallenge.findMany({
    where: { challengerId: userId },
    include: {
      game: { select: { slug: true, name: true } },
      opponent: { select: { id: true, username: true, avatarUrl: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  return { pending, sent };
}

export async function createPlayGameChallenge(params: {
  challengerId: string;
  gameId: string;
  opponentId: string;
}) {
  await assertFriendsForVersus(params.challengerId, params.opponentId);
  const game = await prisma.playGame.findUnique({ where: { id: params.gameId } });
  if (!game?.isActive || game.type !== 'VERSUS') {
    throw new Error('Juego no disponible para desafíos.');
  }
  const challenge = await prisma.playGameChallenge.create({
    data: {
      gameId: params.gameId,
      challengerId: params.challengerId,
      opponentId: params.opponentId,
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    },
  });
  return challenge;
}

export async function acceptPlayGameChallenge(challengeId: string, opponentId: string) {
  const challenge = await prisma.playGameChallenge.findUnique({
    where: { id: challengeId },
    include: { game: true },
  });
  if (!challenge || challenge.opponentId !== opponentId) {
    throw new Error('Desafío no encontrado.');
  }
  if (challenge.status !== 'PENDING') throw new Error('El desafío ya no está pendiente.');

  const started = await startPlayGameSession({
    userId: challenge.challengerId,
    slug: challenge.game.slug,
    opponentId,
    difficulty: 3,
    mode: 'VERSUS',
  });

  await prisma.playGameChallenge.update({
    where: { id: challengeId },
    data: { status: 'ACCEPTED', sessionId: started.sessionId },
  });

  return started;
}
