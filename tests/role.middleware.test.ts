import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextFunction, Request, Response } from 'express';
import {
  checkContentAccess,
  requireApprovalFor,
  requireMinor,
  requireParent,
  requireParentOrSelf,
} from '../src/middlewares/role.middleware';

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    parentChildRelation: {
      findFirst: vi.fn(),
    },
    activityApproval: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('../src/lib/prisma', () => ({
  prisma: prismaMock,
}));

vi.mock('../src/lib/logger', () => ({
  logError: vi.fn(),
}));

function mockRes(): Response {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

function nextSpy(): NextFunction {
  return vi.fn() as unknown as NextFunction;
}

describe('role.middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('requireParent', () => {
    it('permite tutor verificado', async () => {
      const req = {
        auth: { kind: 'parent', parentId: 'p1', email: 'a@a.com' },
      } as unknown as Request;
      const res = mockRes();
      const next = nextSpy();
      prismaMock.user.findFirst.mockResolvedValue({
        id: 'u1',
        status: 'active',
        parentProfile: { verificationStatus: 'verified' },
      });

      await requireParent(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('rechaza tutor no verificado', async () => {
      const req = {
        auth: { kind: 'parent', parentId: 'p1', email: 'a@a.com' },
      } as unknown as Request;
      const res = mockRes();
      const next = nextSpy();
      prismaMock.user.findFirst.mockResolvedValue({
        id: 'u1',
        status: 'active',
        parentProfile: { verificationStatus: 'pending' },
      });

      await requireParent(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireMinor', () => {
    it('permite menor activo y aprobado', async () => {
      const req = { auth: { kind: 'child', userId: 'm1', username: 'mini' } } as unknown as Request;
      const res = mockRes();
      const next = nextSpy();
      prismaMock.user.findUnique.mockResolvedValue({
        type: 'minor',
        status: 'active',
        parentAccountApprovedAt: new Date(),
      });

      await requireMinor(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('rechaza menor pendiente', async () => {
      const req = { auth: { kind: 'child', userId: 'm1', username: 'mini' } } as unknown as Request;
      const res = mockRes();
      const next = nextSpy();
      prismaMock.user.findUnique.mockResolvedValue({
        type: 'minor',
        status: 'active',
        parentAccountApprovedAt: null,
      });

      await requireMinor(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireParentOrSelf', () => {
    it('permite menor sobre sí mismo', async () => {
      const req = {
        auth: { kind: 'child', userId: 'm1', username: 'mini' },
        params: { minorId: 'm1' },
      } as unknown as Request;
      const res = mockRes();
      const next = nextSpy();

      await requireParentOrSelf(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('permite tutor del recurso', async () => {
      const req = {
        auth: { kind: 'parent', parentId: 'p1', email: 'x@y.com' },
        params: { minorId: 'm1' },
      } as unknown as Request;
      const res = mockRes();
      const next = nextSpy();
      prismaMock.user.findUnique.mockResolvedValue({ id: 'm1', parentId: 'p1', type: 'minor' });

      await requireParentOrSelf(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('checkContentAccess', () => {
    it('rechaza por edad', async () => {
      const req = {
        auth: { kind: 'child', userId: 'm1', username: 'mini' },
        body: { minAge: 12 },
        query: {},
      } as unknown as Request;
      const res = mockRes();
      const next = nextSpy();
      prismaMock.user.findUnique.mockResolvedValue({
        age: 10,
        minorProfile: { contentRestrictions: {} },
      });

      await checkContentAccess(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('rechaza categoría bloqueada por padres', async () => {
      const req = {
        auth: { kind: 'child', userId: 'm1', username: 'mini' },
        body: { category: 'violence' },
        query: {},
      } as unknown as Request;
      const res = mockRes();
      const next = nextSpy();
      prismaMock.user.findUnique.mockResolvedValue({
        age: 13,
        minorProfile: { contentRestrictions: { blockedCategories: ['violence'] } },
      });

      await checkContentAccess(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('requireApprovalFor', () => {
    it('rechaza compra si perfil no permite compras', async () => {
      const req = {
        auth: { kind: 'child', userId: 'm1', username: 'mini' },
      } as unknown as Request;
      const res = mockRes();
      const next = nextSpy();
      prismaMock.user.findUnique.mockResolvedValue({
        parentId: 'p1',
        minorProfile: { canPostContent: true, canAddFriends: true, canMakePurchases: false },
      });

      await requireApprovalFor('make_purchase')(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('permite acción con aprobación parental', async () => {
      const req = {
        auth: { kind: 'child', userId: 'm1', username: 'mini' },
      } as unknown as Request;
      const res = mockRes();
      const next = nextSpy();
      prismaMock.user.findUnique.mockResolvedValue({
        parentId: 'p1',
        minorProfile: { canPostContent: true, canAddFriends: true, canMakePurchases: true },
      });
      prismaMock.user.findFirst.mockResolvedValue({ id: 'parent-user-1' });
      prismaMock.parentChildRelation.findFirst.mockResolvedValue({
        approvalRequiredFor: ['post'],
      });
      prismaMock.activityApproval.findFirst.mockResolvedValue({ id: 'approval-ok' });

      await requireApprovalFor('post_content')(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });
});
