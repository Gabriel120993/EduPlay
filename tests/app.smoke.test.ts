import request from 'supertest';
import { beforeAll, describe, expect, it, vi } from 'vitest';

let app: import('express').Express;

beforeAll(async () => {
  vi.resetModules();
  const { createApp } = await import('../src/app');
  app = createApp();
});

describe('API smoke tests', () => {
  it('responde metadata en la raíz', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      message: 'EduPlay API',
      docs: '/api/health',
    });
    expect(typeof response.body.tagline).toBe('string');
  });

  it('responde salud en /api/health', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
    expect(typeof response.body.timestamp).toBe('string');
  });

  it('expone categorías públicas', async () => {
    const response = await request(app).get('/api/content-categories');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.categories)).toBe(true);
    expect(response.body.categories.length).toBeGreaterThan(0);
  });

  it('bloquea rutas privadas sin token', async () => {
    const response = await request(app).get('/api/parents/me');

    expect(response.status).toBe(401);
    expect(response.body.error).toBe('No autenticado.');
  });
});
