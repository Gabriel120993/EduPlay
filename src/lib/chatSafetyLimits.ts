/**
 * Límites in-memory por proceso: mensajes por minuto y anti-spam por texto repetido.
 * (En varias instancias detrás de balanceador cada una tiene su contador.)
 */

const WINDOW_MS = 60_000;
/** Máximo de envíos por menor en una ventana de 1 minuto. */
export const CHAT_MAX_MESSAGES_PER_MINUTE = 12;

const SPAM_WINDOW_MS = 90_000;
/** Mismo texto normalizado tantas veces en la ventana → bloqueo. */
const SPAM_MAX_IDENTICAL_IN_WINDOW = 4;

const MIN_INTERVAL_MS = 350;

type UserChatSafetyState = {
  sendAt: number[];
  identical: { at: number; key: string }[];
  lastSendAt: number;
};

const stateByUser = new Map<string, UserChatSafetyState>();

function getState(userId: string): UserChatSafetyState {
  let s = stateByUser.get(userId);
  if (!s) {
    s = { sendAt: [], identical: [], lastSendAt: 0 };
    stateByUser.set(userId, s);
  }
  return s;
}

function pruneTimestamps(ts: number[], now: number, windowMs: number): number[] {
  return ts.filter((t) => now - t < windowMs);
}

/** Texto comparable para spam (minúsculas, espacios colapsados). */
export function normalizeChatTextForSpam(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

export type ChatSafetyFailureCode = 'CHAT_COOLDOWN' | 'CHAT_RATE_LIMIT' | 'CHAT_SPAM';

export type ChatSafetyResult =
  | { ok: true }
  | { ok: false; error: string; code: ChatSafetyFailureCode };

/**
 * Debe llamarse antes de persistir el mensaje. Si falla, no incrementar contadores en el cliente.
 */
export function assertChatSendSafety(userId: string, rawText: string): ChatSafetyResult {
  const now = Date.now();
  const s = getState(userId);

  if (s.lastSendAt > 0 && now - s.lastSendAt < MIN_INTERVAL_MS) {
    return {
      ok: false,
      code: 'CHAT_COOLDOWN',
      error: 'Esperá un instante antes de enviar otro mensaje.',
    };
  }

  s.sendAt = pruneTimestamps(s.sendAt, now, WINDOW_MS);
  if (s.sendAt.length >= CHAT_MAX_MESSAGES_PER_MINUTE) {
    return {
      ok: false,
      code: 'CHAT_RATE_LIMIT',
      error: 'Enviaste demasiados mensajes. Probá de nuevo en un minuto.',
    };
  }

  const key = normalizeChatTextForSpam(rawText);
  if (key.length > 0) {
    s.identical = s.identical.filter((x) => now - x.at < SPAM_WINDOW_MS);
    const sameCount = s.identical.filter((x) => x.key === key).length;
    if (sameCount >= SPAM_MAX_IDENTICAL_IN_WINDOW) {
      return {
        ok: false,
        code: 'CHAT_SPAM',
        error: 'Detectamos muchos mensajes iguales. Cambiá el texto o esperá un poco.',
      };
    }
  }

  s.sendAt.push(now);
  s.lastSendAt = now;
  if (key.length > 0) {
    s.identical.push({ at: now, key });
  }

  return { ok: true };
}
