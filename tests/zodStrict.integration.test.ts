import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';

let app: import('express').Express;

beforeAll(async () => {
  const { createApp } = await import('../src/app');
  app = createApp();
});

describe('Zod .strict() en payloads de auth', () => {
  it('POST /api/auth/register rechaza campo extra', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'nuevo-strict@test.dev',
      password: 'abcdef12',
      firstName: 'A',
      lastName: 'B',
      phone: '1234567890',
      campoExtra: true,
    });
    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe('string');
  });

  it('POST /api/auth/login rechaza campo extra en credenciales de tutor', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'x@test.dev',
      password: 'abcdef12',
      extra: 1,
    });
    expect(res.status).toBe(400);
  });
});
