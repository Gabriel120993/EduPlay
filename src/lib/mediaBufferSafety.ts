/**
 * Comprobaciones básicas en servidor: firma de archivo y dimensiones mínimas de imagen.
 */

export type BufferSafetyResult =
  | { ok: true; basicFlag: boolean; basicNote: string | null }
  | { ok: false; error: string };

function readPngDimensions(buf: Buffer): { w: number; h: number } | null {
  if (buf.length < 24) return null;
  if (buf[0] !== 0x89 || buf[1] !== 0x50 || buf[2] !== 0x4e || buf[3] !== 0x47) return null;
  if (buf[12] !== 0x49 || buf[13] !== 0x48 || buf[14] !== 0x44 || buf[15] !== 0x52) return null;
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
  return { w, h };
}

/** Busca marcador SOF en JPEG y lee dimensiones. */
function readJpegDimensions(buf: Buffer): { w: number; h: number } | null {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = buf[i + 1];
    if (marker === undefined) return null;
    if (marker === 0xd9 || marker === 0xda) break;
    const len = buf.readUInt16BE(i + 2);
    if (len < 2 || i + 2 + len > buf.length) return null;
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      const h = buf.readUInt16BE(i + 5);
      const w = buf.readUInt16BE(i + 7);
      if (w > 0 && h > 0) return { w, h };
      return null;
    }
    i += 2 + len;
  }
  return null;
}

export function validateBufferMatchesMime(
  buffer: Buffer,
  mimeType: string,
): { ok: true } | { ok: false; error: string } {
  if (buffer.length < 12) {
    return { ok: false, error: 'Archivo demasiado pequeño.' };
  }

  switch (mimeType) {
    case 'image/jpeg':
      if (buffer[0] !== 0xff || buffer[1] !== 0xd8) {
        return { ok: false, error: 'El archivo no es un JPEG válido.' };
      }
      break;
    case 'image/png':
      if (
        buffer[0] !== 0x89 ||
        buffer[1] !== 0x50 ||
        buffer[2] !== 0x4e ||
        buffer[3] !== 0x47 ||
        buffer[4] !== 0x0d ||
        buffer[5] !== 0x0a ||
        buffer[6] !== 0x1a ||
        buffer[7] !== 0x0a
      ) {
        return { ok: false, error: 'El archivo no es un PNG válido.' };
      }
      break;
    case 'image/gif':
      if (buffer[0] !== 0x47 || buffer[1] !== 0x49 || buffer[2] !== 0x46 || buffer[3] !== 0x38) {
        return { ok: false, error: 'El archivo no es un GIF válido.' };
      }
      break;
    case 'image/webp': {
      if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') {
        return { ok: false, error: 'El archivo no es un WebP válido.' };
      }
      break;
    }
    case 'video/mp4':
    case 'video/quicktime':
    case 'video/webm': {
      const head = buffer.subarray(0, Math.min(32, buffer.length));
      const asAscii = head.toString('ascii', 0, head.length);
      if (mimeType === 'video/webm') {
        if (!asAscii.includes('webm') && !asAscii.includes('EBML')) {
          return { ok: false, error: 'El archivo no parece un WebM válido.' };
        }
        break;
      }
      if (head[4] === 0x66 && head[5] === 0x74 && head[6] === 0x79 && head[7] === 0x70) {
        break;
      }
      if (asAscii.includes('ftyp') || asAscii.includes('moov') || asAscii.includes('mdat')) {
        break;
      }
      return { ok: false, error: 'El archivo no parece un MP4/MOV válido.' };
    }
    default:
      return { ok: false, error: 'Tipo no soportado para validación.' };
  }

  return { ok: true };
}

/**
 * Heurística básica: dimensiones extremas o miniatura sospechosa → marcar para revisión (no rechaza).
 */
export function basicImageSafetyFlag(buffer: Buffer, mimeType: string): string | null {
  if (!mimeType.startsWith('image/')) {
    return null;
  }
  let dim: { w: number; h: number } | null = null;
  if (mimeType === 'image/png') {
    dim = readPngDimensions(buffer);
  } else if (mimeType === 'image/jpeg') {
    dim = readJpegDimensions(buffer);
  }
  if (!dim) {
    return 'basic_image_dimensions_unverified';
  }
  if (dim.w * dim.h < 64) {
    return 'basic_tiny_image';
  }
  if (dim.w > 12_000 || dim.h > 12_000) {
    return 'basic_extreme_dimensions';
  }
  return null;
}

export function validateMediaBufferForUpload(buffer: Buffer, mimeType: string): BufferSafetyResult {
  const sig = validateBufferMatchesMime(buffer, mimeType);
  if (!sig.ok) {
    return { ok: false, error: sig.error };
  }
  const basicNote = basicImageSafetyFlag(buffer, mimeType);
  return {
    ok: true,
    basicFlag: basicNote != null,
    basicNote,
  };
}
