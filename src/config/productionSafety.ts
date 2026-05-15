/**
 * Validaciones que deben cumplirse antes de arrancar en producción.
 * Exportado aparte para tests unitarios sin recargar todo `env.ts`.
 */
export function assertPreLaunchProductionConfig(params: {
  nodeEnv: string;
  corsAllowedOrigins: string;
}): void {
  if (params.nodeEnv === 'production' && params.corsAllowedOrigins === '*') {
    throw new Error('[FATAL] CORS_ALLOWED_ORIGINS=* no está permitido en producción');
  }
}
