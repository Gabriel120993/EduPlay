/**
 * Design tokens: spacing, type scale, icons y avatares.
 *
 * Escala de espacio normalizada (8 / 12 / 16 + micro y secciones):
 * - `xs` 4px — micro (legacy ~3px)
 * - `sm` 8px — base
 * - `md` 12px — medio
 * - `lg` 16px — amplio
 * - `xl` 24px — bloques / final de lista (3×8)
 *
 * Preferir estos pasos antes que sumas largas (`md + sm`, `lg + md`, etc.).
 */

/** Espaciado (px) — alineado a 8 / 12 / 16 */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

/** Tipografía (px) */
export const typography = {
  /** Títulos de sección / pantalla */
  title: 18,
  /** Cuerpo principal */
  body: 14,
  /** Cuerpo destacado o inputs */
  bodyLarge: 16,
  /** Metadatos, captions, chips */
  secondary: 12,
} as const;

/** Tamaños estándar de iconos Ionicons en UI (px) */
export const iconSize = {
  sm: 14,
  md: 18,
  lg: 21,
} as const;

/** Avatares circulares (px diámetro) */
export const avatarSize = {
  /** Feed compacto (estilo redes sociales) */
  feedCompact: 30,
  /** Feed y tarjetas tipo post */
  feed: 32,
  /** Explorar (misma escala que feed) */
  explore: 32,
  /** Hero del perfil */
  profile: 72,
} as const;

/** Padding horizontal habitual de listas / pantalla (múltiplo de 8) */
export const screenEdge = {
  horizontal: 16,
} as const;

/** Radios grandes para tarjetas (estilo gamificado / infantil). */
export const radius = {
  card: 20,
  cardSm: 16,
  sheet: 24,
} as const;
