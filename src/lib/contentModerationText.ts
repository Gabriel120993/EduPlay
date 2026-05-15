import { ContentFilterLevel } from '@prisma/client';
import { sanitizeUserPlainText } from './sanitizeUserInput';

/** Palabras o frases inapropiadas (ES) — alineado al filtro de chat. */
export const BLOCK_MEDIUM: readonly string[] = [
  'idiota',
  'imbecil',
  'imbécil',
  'estupido',
  'estúpido',
  'tonto',
  'tonta',
  'mierda',
  'puta',
  'puto',
  'cabron',
  'cabrón',
  'hijo de puta',
  'mata',
  'matar',
  'suicid',
  'morite',
  'muerete',
  'putear',
  'forro',
  'boludo',
  'pelotudo',
  'conchudo',
];

const URL_LIKE = /\bhttps?:\/\/\S+/i;
const EMAIL_LIKE = /\b[\w.%+-]+@[\w.-]+\.[a-z]{2,}\b/i;
const PHONE_LIKE = /\b(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{3,4}\b/;

function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ');
}

/** Palabras inapropiadas en texto normalizado (mismo criterio que el filtro de contenido). */
export function containsBlockedWord(text: string, words: readonly string[]): boolean {
  const n = normalizeForMatch(text);
  for (const w of words) {
    const needle = normalizeForMatch(w);
    if (needle.length >= 2 && n.includes(needle)) {
      return true;
    }
  }
  return false;
}

export function messageLooksLikeEmail(plain: string): boolean {
  return EMAIL_LIKE.test(plain.trim());
}

export function messageLooksLikePhone(plain: string): boolean {
  return PHONE_LIKE.test(plain.trim());
}

export type TextModerationOutcome = {
  allowed: boolean;
  deliveredText: string;
  blockReason: string | null;
  auditPlain: string | null;
};

/**
 * Moderación de texto según nivel parental (posts, chat, etc.).
 */
const MAX_MODERATED_PLAIN_LEN = 50_000;

export function moderatePlainTextForLevel(
  plain: string,
  level: ContentFilterLevel,
): TextModerationOutcome {
  const sanitized = sanitizeUserPlainText(plain, MAX_MODERATED_PLAIN_LEN);
  const trimmed = sanitized.trim();
  if (!trimmed) {
    return {
      allowed: false,
      deliveredText: '',
      blockReason: 'EMPTY',
      auditPlain: sanitized.length > 0 ? sanitized : null,
    };
  }

  if (level === ContentFilterLevel.LOW) {
    return { allowed: true, deliveredText: trimmed, blockReason: null, auditPlain: null };
  }

  if (containsBlockedWord(trimmed, BLOCK_MEDIUM)) {
    return {
      allowed: false,
      deliveredText: '',
      blockReason: 'CONTENT_FILTER',
      auditPlain: trimmed,
    };
  }

  if (level === ContentFilterLevel.HIGH) {
    if (URL_LIKE.test(trimmed) || EMAIL_LIKE.test(trimmed) || PHONE_LIKE.test(trimmed)) {
      return {
        allowed: false,
        deliveredText: '',
        blockReason: 'CONTACT_OR_LINK',
        auditPlain: trimmed,
      };
    }
  }

  return { allowed: true, deliveredText: trimmed, blockReason: null, auditPlain: null };
}

/** Mensaje de error HTTP para posts u otras superficies que rechazan el texto. */
export function textModerationErrorMessage(blockReason: string | null): string {
  switch (blockReason) {
    case 'CONTENT_FILTER':
      return 'El texto no cumple el filtro de contenido del tutor.';
    case 'CONTACT_OR_LINK':
      return 'No podés incluir enlaces, emails ni teléfonos.';
    case 'BAD_WORDS':
      return 'El mensaje contiene palabras no permitidas.';
    case 'PERSONAL_DATA':
      return 'No compartas correos ni teléfonos en el chat.';
    case 'EMPTY':
      return 'El contenido no puede estar vacío.';
    default:
      return 'Contenido no permitido.';
  }
}
