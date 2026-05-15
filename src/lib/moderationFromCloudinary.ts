import type { UploadApiResponse } from 'cloudinary';

type ModerationEntry = { kind?: string; status?: string };

function asModerationList(raw: unknown): ModerationEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is ModerationEntry => x != null && typeof x === 'object');
}

/**
 * Interpreta `moderation` de la respuesta de Cloudinary (si el add-on está activo).
 * Sin moderación en la subida → no marcado.
 */
export function moderationFromUploadResult(result: UploadApiResponse): {
  flagged: boolean;
  note: string | null;
} {
  const mod = asModerationList((result as { moderation?: unknown }).moderation);
  if (mod.length === 0) {
    return { flagged: false, note: null };
  }

  const parts = mod.map((m) => {
    const kind = typeof m.kind === 'string' ? m.kind : 'mod';
    const status = typeof m.status === 'string' ? m.status : '?';
    return `${kind}:${status}`;
  });
  const note = parts.join('; ');

  const rejected = mod.some((m) => m.status === 'rejected');
  if (rejected) {
    return { flagged: true, note };
  }

  const pending = mod.some((m) => m.status === 'pending' || m.status === 'queued');
  if (pending) {
    return { flagged: true, note: note || 'moderation_pending' };
  }

  return { flagged: false, note: null };
}
