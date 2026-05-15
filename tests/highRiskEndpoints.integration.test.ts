/**
 * Cobertura de humo / matriz de riesgo para endpoints críticos (TAREA 2 del plan QA).
 * Sin mock global de Prisma: validaciones Zod y cadena auth antes de tocar la DB.
 * Rutas alineadas a `src/routes` (p. ej. quiz submit → POST /api/quiz/complete).
 */
import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { createParentAuthToken } from '../src/lib/auth';

let app: import('express').Express;

beforeAll(async () => {
  const { createApp } = await import('../src/app');
  app = createApp();
});

describe('Endpoints de alto riesgo — sin sesión', () => {
  it('POST /api/auth/register — payload inválido → 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'no-email', password: '123' });
    expect(res.status).toBe(400);
    expect(typeof res.body.error).toBe('string');
  });

  it('POST /api/auth/login-child — payload inválido → 400', async () => {
    const res = await request(app)
      .post('/api/auth/login-child')
      .send({ username: '', password: '123' });
    expect(res.status).toBe(400);
  });

  it('GET /api/auth/me — sin token → 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('GET /api/parents/:id/dashboard — sin token → 401', async () => {
    const res = await request(app).get('/api/parents/parent-1/dashboard');
    expect(res.status).toBe(401);
  });

  it('GET /api/content/ — sin token → 401', async () => {
    const res = await request(app).get('/api/content/');
    expect(res.status).toBe(401);
  });

  it('POST /api/quiz/complete — sin token → 401', async () => {
    const res = await request(app).post('/api/quiz/complete').send({});
    expect(res.status).toBe(401);
  });

  it('POST /api/friends/request — sin token → 401', async () => {
    const res = await request(app).post('/api/friends/request').send({ targetUserId: 'x' });
    expect(res.status).toBe(401);
  });

  it('POST /api/chat/messages — sin token → 401', async () => {
    const res = await request(app).post('/api/chat/messages').send({ peerId: 'x', text: 'hola' });
    expect(res.status).toBe(401);
  });

  it('POST /api/game-results — sin token → 401', async () => {
    const res = await request(app).post('/api/game-results').send({ gameKey: 'k', score: 1 });
    expect(res.status).toBe(401);
  });

  it('POST /api/reports — sin token → 401', async () => {
    const res = await request(app).post('/api/reports').send({});
    expect(res.status).toBe(401);
  });

  it('GET /api/achievements — sin token → 401', async () => {
    const res = await request(app).get('/api/achievements');
    expect(res.status).toBe(401);
  });

  it('POST /api/media/upload — sin token → 401', async () => {
    const res = await request(app).post('/api/media/upload');
    expect(res.status).toBe(401);
  });

  it('POST /api/analytics — sin token → 401', async () => {
    const res = await request(app).post('/api/analytics').send({ eventType: 'test' });
    expect(res.status).toBe(401);
  });

  it('GET /api/analytics/summary — sin token → 401', async () => {
    const res = await request(app).get('/api/analytics/summary');
    expect(res.status).toBe(401);
  });
});

describe('Endpoints de alto riesgo — permisos (403)', () => {
  it('GET /api/friends/:userId con JWT de tutor → 403 (solo menor)', async () => {
    const token = createParentAuthToken('parent-1', 'p@p.com');
    const res = await request(app)
      .get('/api/friends/child-1')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('POST /api/friends/request con JWT de tutor → 403 (solo menor)', async () => {
    const token = createParentAuthToken('parent-1', 'p@p.com');
    const res = await request(app)
      .post('/api/friends/request')
      .set('Authorization', `Bearer ${token}`)
      .send({ targetUserId: 'other-child' });
    expect(res.status).toBe(403);
  });
});

describe('Endpoints de alto riesgo — recurso / validación', () => {
  it('GET ruta inexistente con JWT tutor → 404', async () => {
    const token = createParentAuthToken('parent-1', 'p@p.com');
    const res = await request(app).get('/zzz-no-existe').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.code).toBe('NOT_FOUND');
  });
});
