import request from 'supertest';
import { beforeAll, describe, expect, it, vi } from 'vitest';

let app: import('express').Express;

beforeAll(async () => {
  vi.resetModules();
  const { createApp } = await import('../src/app');
  app = createApp();
}, 30_000);

describe('Feed API smoke', () => {
  it('bloquea /api/feed sin token', async () => {
    const res = await request(app).get('/api/feed');
    expect(res.status).toBe(401);
  });

  it('bloquea /api/social-challenges sin token', async () => {
    const res = await request(app).get('/api/social-challenges');
    expect(res.status).toBe(401);
  });
});
