import { describe, expect, it } from 'vitest';
import { assertPreLaunchProductionConfig } from '../src/config/productionSafety';

describe('CORS en producción', () => {
  it('rechaza CORS_ALLOWED_ORIGINS=* cuando NODE_ENV=production', () => {
    expect(() =>
      assertPreLaunchProductionConfig({ nodeEnv: 'production', corsAllowedOrigins: '*' }),
    ).toThrow(/CORS_ALLOWED_ORIGINS=\*/);
  });

  it('permite orígenes explícitos en producción', () => {
    expect(() =>
      assertPreLaunchProductionConfig({
        nodeEnv: 'production',
        corsAllowedOrigins: 'https://eduplay.app,https://admin.eduplay.app',
      }),
    ).not.toThrow();
  });

  it('permite * en desarrollo (validación no aplica)', () => {
    expect(() =>
      assertPreLaunchProductionConfig({ nodeEnv: 'development', corsAllowedOrigins: '*' }),
    ).not.toThrow();
  });
});

