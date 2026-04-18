import type { Request, Response } from "express";
import { z } from "zod";
import { logError } from "../lib/logger";
import { prisma } from "../lib/prisma";
import { formatZodError, uuidSchema } from "../lib/validation/schemas";

function requireChild(req: Request, res: Response): string | null {
  const auth = req.auth;
  if (!auth || auth.kind !== "child") {
    res.status(403).json({ error: "Solo menores autenticados." });
    return null;
  }
  return auth.userId;
}

function stripQuestion<T extends { correct: number }>(q: T): Omit<T, "correct"> {
  const { correct: _c, ...rest } = q;
  return rest;
}

const listQuerySchema = z.object({
  topicId: uuidSchema.optional(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional(),
});

/** GET /api/quizzes */
export async function listQuizzes(req: Request, res: Response): Promise<void> {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }
  try {
    const rows = await prisma.quiz.findMany({
      where: {
        published: true,
        ...(parsed.data.topicId ? { topicId: parsed.data.topicId } : {}),
        ...(parsed.data.difficulty ? { difficulty: parsed.data.difficulty as never } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 80,
      select: {
        id: true,
        title: true,
        description: true,
        topicId: true,
        difficulty: true,
        questionCount: true,
        published: true,
      },
    });
    res.json({ quizzes: rows });
  } catch (e) {
    logError("quizzesApi.list", e);
    res.status(500).json({ error: "Error al listar quizzes." });
  }
}

/** GET /api/quizzes/:quizId */
export async function getQuizDetail(req: Request, res: Response): Promise<void> {
  const quizId = req.params.quizId?.trim();
  if (!quizId) {
    res.status(400).json({ error: "quizId inválido." });
    return;
  }
  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: {
        id: true,
        title: true,
        description: true,
        topicId: true,
        difficulty: true,
        questionCount: true,
        published: true,
        createdAt: true,
      },
    });
    if (!quiz || !quiz.published) {
      res.status(404).json({ error: "Quiz no encontrado." });
      return;
    }
    res.json({ quiz });
  } catch (e) {
    logError("quizzesApi.detail", e);
    res.status(500).json({ error: "Error al obtener quiz." });
  }
}

/** GET /api/quizzes/:quizId/questions */
export async function getQuizQuestions(req: Request, res: Response): Promise<void> {
  const quizId = req.params.quizId?.trim();
  if (!quizId) {
    res.status(400).json({ error: "quizId inválido." });
    return;
  }
  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: { orderBy: { createdAt: "asc" } } },
    });
    if (!quiz || !quiz.published) {
      res.status(404).json({ error: "Quiz no encontrado." });
      return;
    }
    res.json({
      questions: quiz.questions.map((q) => stripQuestion(q)),
    });
  } catch (e) {
    logError("quizzesApi.questions", e);
    res.status(500).json({ error: "Error al cargar preguntas." });
  }
}

/** POST /api/quizzes/:quizId/attempt */
export async function postStartQuizAttempt(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;

  const quizId = req.params.quizId?.trim();
  if (!quizId) {
    res.status(400).json({ error: "quizId inválido." });
    return;
  }

  try {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: true },
    });
    if (!quiz || !quiz.published) {
      res.status(404).json({ error: "Quiz no encontrado." });
      return;
    }
    const maxScore = Math.max(1, quiz.questions.length);
    const session = await prisma.quizSession.create({
      data: {
        userId,
        quizId,
        maxScore,
        answers: [],
      },
    });
    res.status(201).json({
      attemptId: session.id,
      quizId: quiz.id,
      maxScore,
      startedAt: session.startedAt.toISOString(),
    });
  } catch (e) {
    logError("quizzesApi.startAttempt", e);
    res.status(500).json({ error: "Error al iniciar intento." });
  }
}

const answerBodySchema = z.object({
  questionId: uuidSchema,
  selectedIndex: z.coerce.number().int().min(0).max(20),
});

/** POST /api/quizzes/attempts/:attemptId/answer */
export async function postQuizAttemptAnswer(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;

  const attemptId = req.params.attemptId?.trim();
  if (!attemptId) {
    res.status(400).json({ error: "attemptId inválido." });
    return;
  }

  const parsed = answerBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }

  try {
    const session = await prisma.quizSession.findFirst({
      where: { id: attemptId, userId, finished: false },
    });
    if (!session) {
      res.status(404).json({ error: "Intento no encontrado o ya finalizado." });
      return;
    }

    const prev = Array.isArray(session.answers) ? (session.answers as { questionId: string; selectedIndex: number }[]) : [];
    const next = [...prev.filter((a) => a.questionId !== parsed.data.questionId), parsed.data];

    await prisma.quizSession.update({
      where: { id: session.id },
      data: { answers: next as never },
    });

    res.json({ ok: true, answersRecorded: next.length });
  } catch (e) {
    logError("quizzesApi.answer", e);
    res.status(500).json({ error: "Error al registrar respuesta." });
  }
}

/** POST /api/quizzes/attempts/:attemptId/finish */
export async function postFinishQuizAttempt(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;

  const attemptId = req.params.attemptId?.trim();
  if (!attemptId) {
    res.status(400).json({ error: "attemptId inválido." });
    return;
  }

  try {
    const session = await prisma.quizSession.findFirst({
      where: { id: attemptId, userId },
      include: { quiz: { include: { questions: true } } },
    });
    if (!session) {
      res.status(404).json({ error: "Intento no encontrado." });
      return;
    }
    if (session.finished) {
      res.status(409).json({ error: "El intento ya fue finalizado." });
      return;
    }

    const answers = Array.isArray(session.answers)
      ? (session.answers as { questionId: string; selectedIndex: number }[])
      : [];
    const qById = new Map(session.quiz.questions.map((q) => [q.id, q]));
    let correct = 0;
    for (const a of answers) {
      const q = qById.get(a.questionId);
      if (q && q.correct === a.selectedIndex) correct += 1;
    }
    const maxScore = session.quiz.questions.length;
    const score = maxScore > 0 ? Math.round((correct / maxScore) * 100) : 0;

    await prisma.$transaction(async (tx) => {
      await tx.quizAttempt.create({
        data: {
          userId,
          quizId: session.quizId,
          score,
          maxScore: 100,
          correctCount: correct,
          durationMs: null,
        },
      });
      await tx.quizSession.update({
        where: { id: session.id },
        data: {
          finished: true,
          score,
          maxScore: 100,
          finishedAt: new Date(),
        },
      });
    });

    res.json({
      finished: true,
      correctCount: correct,
      totalQuestions: maxScore,
      scorePercent: score,
    });
  } catch (e) {
    logError("quizzesApi.finish", e);
    res.status(500).json({ error: "Error al finalizar intento." });
  }
}

/** GET /api/quizzes/attempts/:attemptId/results */
export async function getQuizAttemptResults(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;

  const attemptId = req.params.attemptId?.trim();
  if (!attemptId) {
    res.status(400).json({ error: "attemptId inválido." });
    return;
  }

  try {
    const session = await prisma.quizSession.findFirst({
      where: { id: attemptId, userId },
      include: { quiz: { select: { id: true, title: true } } },
    });
    if (!session) {
      res.status(404).json({ error: "Intento no encontrado." });
      return;
    }
    const attempt = await prisma.quizAttempt.findFirst({
      where: { userId, quizId: session.quizId },
      orderBy: { finishedAt: "desc" },
    });
    res.json({
      session: {
        id: session.id,
        quiz: session.quiz,
        finished: session.finished,
        score: session.score,
        maxScore: session.maxScore,
        finishedAt: session.finishedAt?.toISOString() ?? null,
      },
      lastAttempt: attempt,
    });
  } catch (e) {
    logError("quizzesApi.results", e);
    res.status(500).json({ error: "Error al obtener resultados." });
  }
}

/** GET /api/quizzes/my-attempts */
export async function getMyQuizAttempts(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;

  try {
    const rows = await prisma.quizAttempt.findMany({
      where: { userId },
      orderBy: { finishedAt: "desc" },
      take: 30,
      include: { quiz: { select: { id: true, title: true, difficulty: true } } },
    });
    res.json({ attempts: rows });
  } catch (e) {
    logError("quizzesApi.myAttempts", e);
    res.status(500).json({ error: "Error al listar intentos." });
  }
}

/** GET /api/quizzes/recommended */
export async function getRecommendedQuizzes(req: Request, res: Response): Promise<void> {
  const userId = requireChild(req, res);
  if (!userId) return;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { level: true },
    });
    const rows = await prisma.quiz.findMany({
      where: { published: true },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: { id: true, title: true, difficulty: true, questionCount: true },
    });
    res.json({ level: user?.level ?? 1, quizzes: rows });
  } catch (e) {
    logError("quizzesApi.recommended", e);
    res.status(500).json({ error: "Error al recomendar quizzes." });
  }
}
