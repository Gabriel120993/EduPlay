import { ContentFilterLevel } from "@prisma/client";
import {
  BLOCK_MEDIUM,
  containsBlockedWord,
  messageLooksLikeEmail,
  messageLooksLikePhone,
  moderatePlainTextForLevel,
} from "./contentModerationText";
import { sanitizeUserPlainText } from "./sanitizeUserInput";

const URL_LIKE = /\bhttps?:\/\/\S+/i;

export type ChatFilterResult = {
  allowed: boolean;
  deliveredBody: string;
  blockReason: string | null;
  auditPlain: string | null;
  /** Mensaje entregado pero señalado para supervisión (p. ej. URL con filtro parental medio/bajo). */
  moderationFlagged: boolean;
};

const MAX_CHAT_SANITIZE = 50_000;

/**
 * Filtro de chat: datos personales e insultos siempre revisados; el nivel parental ajusta enlaces y el resto.
 * - Bloqueo: email, teléfono, palabras inapropiadas, reglas estrictas del tutor (nivel HIGH, etc.).
 * - Marca (`moderationFlagged`): enlace http(s) si el nivel no es HIGH (se entrega el texto, el tutor puede revisar).
 */
export function filterOutgoingChatMessage(plain: string, level: ContentFilterLevel): ChatFilterResult {
  const sanitized = sanitizeUserPlainText(plain, MAX_CHAT_SANITIZE);
  const trimmed = sanitized.trim();
  if (!trimmed) {
    return {
      allowed: false,
      deliveredBody: "",
      blockReason: "EMPTY",
      auditPlain: sanitized.length > 0 ? sanitized : null,
      moderationFlagged: false,
    };
  }

  if (messageLooksLikeEmail(trimmed)) {
    return {
      allowed: false,
      deliveredBody: "",
      blockReason: "PERSONAL_DATA",
      auditPlain: trimmed,
      moderationFlagged: false,
    };
  }

  if (messageLooksLikePhone(trimmed)) {
    return {
      allowed: false,
      deliveredBody: "",
      blockReason: "PERSONAL_DATA",
      auditPlain: trimmed,
      moderationFlagged: false,
    };
  }

  if (containsBlockedWord(trimmed, BLOCK_MEDIUM)) {
    return {
      allowed: false,
      deliveredBody: "",
      blockReason: "BAD_WORDS",
      auditPlain: trimmed,
      moderationFlagged: false,
    };
  }

  if (level !== ContentFilterLevel.HIGH && URL_LIKE.test(trimmed)) {
    return {
      allowed: true,
      deliveredBody: trimmed,
      blockReason: null,
      auditPlain: null,
      moderationFlagged: true,
    };
  }

  const r = moderatePlainTextForLevel(trimmed, level);
  return {
    allowed: r.allowed,
    deliveredBody: r.deliveredText,
    blockReason: r.blockReason,
    auditPlain: r.auditPlain,
    moderationFlagged: false,
  };
}
