import request from 'supertest';
import { beforeAll, describe, expect, it, vi } from 'vitest';

let app: import('express').Express;

beforeAll(async () => {
  vi.resetModules();
  const { createApp } = await import('../src/app');
  app = createApp();
}, 30_000);

describe('Library API smoke', () => {
  it('bloquea /api/library sin token', async () => {
    const res = await request(app).get('/api/library');
    expect(res.status).toBe(401);
  });

  it('bloquea /api/channels sin token', async () => {
    const res = await request(app).get('/api/channels');
    expect(res.status).toBe(401);
  });
});
