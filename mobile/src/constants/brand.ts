/** Eslogan oficial (tienda, auth, cabeceras). */
export const APP_TAGLINE = "EduPlay - Mi primera red social";

/** Subtítulo cuando el título principal ya muestra “EduPlay”. */
export function appTaglineSubtitle(): string {
  return APP_TAGLINE.replace(/^EduPlay\s*-\s*/i, "").trim();
}
