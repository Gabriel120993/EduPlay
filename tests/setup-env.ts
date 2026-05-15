import { vi } from 'vitest';

process.env.NODE_ENV = 'test';
process.env.PORT = '0';
process.env.DATABASE_URL =
  'postgresql://postgres:postgres@localhost:5432/eduplay_test?schema=public';
process.env.JWT_SECRET = 'test-jwt-secret-with-at-least-thirty-two-chars';
/** Límite holgado para la suite global; el test explícito de rate-limit en `auth.integration` fija `1` con `vi.stubEnv` + `resetModules`. */
process.env.LOGIN_REGISTER_RATE_LIMIT_MAX = '80';
process.env.LOGIN_REGISTER_RATE_LIMIT_WINDOW_MS = '60000';
/** Lista explícita para probar CORS en integración (sin `*`). */
process.env.CORS_ALLOWED_ORIGINS = 'http://localhost:19006,https://app.example.com';

vi.mock('@prisma/client', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@prisma/client');
  return {
    ...actual,
    ContentReportTarget: actual.ContentReportTarget ?? {
      POST: 'POST',
      USER: 'USER',
      CHAT_MESSAGE: 'CHAT_MESSAGE',
    },
    ContentReportStatus: actual.ContentReportStatus ?? {
      OPEN: 'OPEN',
      DISMISSED: 'DISMISSED',
      ESCALATED: 'ESCALATED',
    },
  };
});
