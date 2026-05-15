export function validateCreateGameResult(
  body: unknown,
):
  | { ok: true; data: { userId: string; gameId: string; score: number } }
  | { ok: false; error: string } {
  if (body === null || typeof body !== 'object') {
    return { ok: false, error: 'El cuerpo debe ser un objeto JSON.' };
  }
  const b = body as Record<string, unknown>;
  if (b.userId === undefined || b.userId === null || String(b.userId).trim() === '') {
    return { ok: false, error: 'userId es obligatorio.' };
  }
  if (b.gameId === undefined || b.gameId === null || String(b.gameId).trim() === '') {
    return { ok: false, error: 'gameId es obligatorio.' };
  }
  if (b.score === undefined || b.score === null) {
    return { ok: false, error: 'score es obligatorio.' };
  }
  const score = typeof b.score === 'number' ? b.score : Number(b.score);
  if (!Number.isFinite(score) || !Number.isInteger(score)) {
    return { ok: false, error: 'score debe ser un número entero.' };
  }
  if (score < 0) {
    return { ok: false, error: 'score no puede ser negativo.' };
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
