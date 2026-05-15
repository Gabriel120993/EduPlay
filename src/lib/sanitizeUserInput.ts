/**
 * Saneamiento de texto libre del cliente: reduce riesgo XSS al persistir o exponer contenido.
 * No sustituye CSP en cliente ni el uso de consultas parametrizadas (Prisma) frente a SQL.
 */

/** Caracteres de control ASCII peligrosos (se conservan \\t, \\n, \\r). */
// eslint-disable-next-line no-control-regex -- intencional: filtrar controles ASCII fuera de tab/LF/CR
const ASCII_CTRL_EXCEPT_WHITESPACE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/**
 * Elimina etiquetas tipo HTML/XML y caracteres que suelen usarse en vectores XSS.
 * Tras quitar `<...>`, se eliminan `<` y `>` sueltos para evitar fragmentos rotos.
 */
export function sanitizeUserPlainText(input: string, maxLength?: number): string {
  if (typeof input !== 'string') {
    return '';
  }
  let s = input.replace(/\0/g, '');
  s = s.replace(ASCII_CTRL_EXCEPT_WHITESPACE, '');
  let prev = '';
  while (prev !== s) {
    prev = s;
    s = s.replace(/<[^>]{0,4000}?>/g, '');
  }
  s = s.replace(/</g, '').replace(/>/g, '');
  if (maxLength !== undefined && s.length > maxLength) {
    s = s.slice(0, maxLength);
  }
  return s;
}

/** Etiqueta corta (nombre visible, evento analytics, etc.). Una línea lógica. */
export function sanitizeShortUserText(input: string, maxLength: number): string {
  const s = sanitizeUserPlainText(input, maxLength);
  return s
    .replace(/\r\n|\r|\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
