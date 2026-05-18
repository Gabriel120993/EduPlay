import request from 'supertest';
import { beforeAll, describe, expect, it, vi } from 'vitest';

let app: import('express').Express;

beforeAll(async () => {
  vi.resetModules();
  const { createApp } = await import('../src/app');
  app = createApp();
});

describe('Play games API smoke', () => {
  it('bloquea /api/play-games sin token', async () => {
    const res = await request(app).get('/api/play-games');
    expect(res.status).toBe(401);
  });

  it('bloquea start sin token', async () => {
    const res = await request(app).post('/api/play-games/memory-arena/start').send({ difficulty: 1 });
    expect(res.status).toBe(401);
  });
});
