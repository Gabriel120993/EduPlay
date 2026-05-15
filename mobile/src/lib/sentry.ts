/**
 * Monitoreo Sentry en la app móvil (solo builds no-dev con DSN configurado).
 * Definir EXPO_PUBLIC_SENTRY_DSN en mobile/.env o EAS secrets.
 */
let initialized = false;

export function initMobileSentry(): void {
  if (initialized || __DEV__) {
    return;
  }

  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim();
  if (!dsn) {
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require("@sentry/react-native") as typeof import("@sentry/react-native");
    Sentry.init({
      dsn,
      environment: "production",
      tracesSampleRate: 0.1,
    });
    initialized = true;
  } catch {
    /* @sentry/react-native no instalado o entorno sin soporte nativo */
  }
}
