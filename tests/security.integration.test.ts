import request from 'supertest';
import jwt from 'jsonwebtoken';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createParentAuthToken } from '../src/lib/auth';

const prismaMock = vi.hoisted(() => ({
  parent: {
    findUnique: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn(),
  },
}));

vi.mock('../src/lib/prisma', () => ({
  prisma: prismaMock,
}));

let app: import('express').Express;

beforeAll(async () => {
  const { createApp } = await import('../src/app');
  app = createApp();
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('Seguridad HTTP (integración)', () => {
  describe('Helmet / cabeceras', () => {
    it('GET / incluye X-Content-Type-Options: nosniff', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('GET / incluye X-Frame-Options DENY', async () => {
      const res = await request(app).get('/');
      expect(res.headers['x-frame-options']).toMatch(/DENY/i);
    });

    it('en NODE_ENV=test no exige CSP global (API JSON; CSP desactivada en helmet)', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.headers['content-security-policy']).toBeUndefined();
    });

    it('Helmet puede incluir Strict-Transport-Security (no solo en producción)', async () => {
      const res = await request(app).get('/');
      expect(process.env.NODE_ENV).toBe('test');
      const hsts = res.headers['strict-transport-security'];
      expect(hsts).toBeDefined();
      expect(String(hsts)).toMatch(/max-age=/i);
    });
  });

  describe('CORS', () => {
    it('preflight OPTIONS sobre ruta pública responde sin error', async () => {
      const res = await request(app)
        .options('/api/health')
        .set('Origin', 'https://app.example.com')
        .set('Access-Control-Request-Method', 'GET');

      expect([200, 204]).toContain(res.status);
    });

    it('GET público con Origin permitido refleja ese origen en Access-Control-Allow-Origin', async () => {
      const res = await request(app).get('/api/health').set('Origin', 'https://app.example.com');
      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('https://app.example.com');
    });

    it('GET público sin cabecera Origin sigue respondiendo 200 (curl, apps nativas)', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
    });

    it('Origin no listado en CORS_ALLOWED_ORIGINS devuelve 403 con código CORS_NOT_ALLOWED', async () => {
      const res = await request(app).get('/api/health').set('Origin', 'https://evil.example');
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('CORS_NOT_ALLOWED');
    });
  });

  describe('JWT en rutas protegidas', () => {
    it('sin Bearer devuelve 401', async () => {
      const res = await request(app).get('/api/content/');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('No autenticado.');
    });

    it('token malformado devuelve 401', async () => {
      const res = await request(app).get('/api/content/').set('Authorization', 'Bearer !!!');
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Token inválido.');
    });

    it('token con firma incorrecta devuelve 401', async () => {
      const bad = jwt.sign(
        { sub: 'x', typ: 'parent', email: 'a@a.com' },
        'wrong-secret-wrong-secret-wrong-secret',
        {
          algorithm: 'HS256',
          expiresIn: '1h',
        },
      );
      const res = await request(app).get('/api/content/').set('Authorization', `Bearer ${bad}`);
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Token inválido.');
    });

    it('token expirado devuelve 401 (exp más allá de clockTolerance)', async () => {
      const expired = jwt.sign(
        {
          sub: 'parent-1',
          email: 'p@p.com',
          typ: 'parent',
          userType: 'parent',
          approvalStatus: 'approved',
          exp: Math.floor(Date.now() / 1000) - 7200,
        },
        process.env.JWT_SECRET!,
        { algorithm: 'HS256' },
      );
      const res = await request(app).get('/api/content/').set('Authorization', `Bearer ${expired}`);
      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Token expirado.');
    });

    it('token válido de tutor permite GET /api/auth/me (200)', async () => {
      prismaMock.parent.findUnique.mockResolvedValue({
        isPremium: false,
        premiumUntil: null,
      });
      prismaMock.user.findMany.mockResolvedValue([]);
      prismaMock.user.findFirst.mockResolvedValue({ id: 'parent-user-1' });

      const token = createParentAuthToken('parent-1', 'parent@example.com');
      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.role).toBe('parent');
    });
  });
});

describe('Seguridad HTTP — rate limit login (app aislada)', () => {
  let appStrict: import('express').Express;

  beforeAll(async () => {
    process.env.LOGIN_REGISTER_RATE_LIMIT_MAX = '1';
    vi.resetModules();
    const { createApp } = await import('../src/app');
    appStrict = createApp();
  });

  afterAll(() => {
    process.env.LOGIN_REGISTER_RATE_LIMIT_MAX = '80';
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('tras dos POST /api/auth/login se devuelve 429 y cabeceras RateLimit', async () => {
    prismaMock.parent.findUnique.mockResolvedValue(null);

    const res1 = await request(appStrict)
      .post('/api/auth/login')
      .send({ email: 'noexiste@test.dev', password: 'x'.repeat(12) });
    expect(res1.status).toBe(401);

    const res2 = await request(appStrict)
      .post('/api/auth/login')
      .send({ email: 'noexiste@test.dev', password: 'x'.repeat(12) });
    expect(res2.status).toBe(429);

    expect(res2.headers['ratelimit-limit']).toBeDefined();
    expect(res2.headers['ratelimit-remaining']).toBeDefined();
  });
});
