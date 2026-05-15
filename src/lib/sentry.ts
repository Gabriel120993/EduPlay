import * as Sentry from '@sentry/node';
import { env } from '../config/env';

let initialized = false;

export function initSentry(): void {
  if (initialized || env.nodeEnv === 'development' || env.nodeEnv === 'test') {
    return;
  }
  if (!env.sentryDsn) {
    return;
  }

  Sentry.init({
    dsn: env.sentryDsn,
    environment: env.nodeEnv,
    release: process.env.npm_package_version ?? 'eduplay-api@unknown',
    tracesSampleRate: 0.1,
  });
  initialized = true;
}

export function captureException(
  error: unknown,
  context?: { extra?: Record<string, unknown> },
): void {
  if (!initialized) return;
  Sentry.captureException(error, context);
}

export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
  if (!initialized) return;
  Sentry.captureMessage(message, level);
}
