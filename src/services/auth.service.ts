import bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import { createChildAuthToken, createParentAuthToken } from '../lib/auth';
import { hashPassword } from '../lib/password';
import { parentHasActivePremium } from '../lib/parentPremiumAccess';
import { prisma } from '../lib/prisma';

export type ParentPremiumRow = { isPremium: boolean; premiumUntil: Date | null };
export type MinorApprovalStatus = 'approved' | 'pending' | 'blocked';

export const LEGACY_DEMO_CHILD_USERNAMES: Record<string, string> = {
  lucia_explora: 'lucia_demo',
  mateo_numeros: 'mateo_demo',
  sofia_ciencia: 'sofia_demo',
  daniel_mapas: 'daniel_demo',
  emma_lectora: 'emma_demo',
};

export function inferMinorApprovalStatus(user: {
  status: 'active' | 'inactive' | 'suspended';
  parentAccountApprovedAt: Date | null;
}): MinorApprovalStatus {
  if (user.status !== 'active') return 'blocked';
  if (!user.parentAccountApprovedAt) return 'pending';
  return 'approved';
}

export type RegisterParentInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
};

export async function registerParentTransactional(
  body: RegisterParentInput,
): Promise<Record<string, unknown>> {
  const parentPasswordHash = await hashPassword(body.password);
  const parent = await prisma.parent.create({
    data: {
      email: body.email.toLowerCase(),
      password: parentPasswordHash,
    },
    select: { id: true, email: true, isPremium: true, premiumUntil: true },
  });

  const parentUserPasswordHash = await hashPassword(body.password);
  const parentUser = await prisma.user.create({
    data: {
      username: `parent_${parent.id.slice(0, 8)}`,
      realName: `${body.firstName} ${body.lastName}`.trim(),
      passwordHash: parentUserPasswordHash,
      age: 30,
      parentId: parent.id,
      type: 'parent',
      status: 'active',
      parentAccountApprovedAt: new Date(),
    },
    select: { id: true },
  });

  await prisma.parentProfile.create({
    data: {
      userId: parentUser.id,
      verificationStatus: 'pending',
      verificationMethod: 'email',
      subscriptionTier: 'free',
    },
  });

  await prisma.analyticsEvent.create({
    data: {
      userId: parentUser.id,
      eventName: 'parent_registered',
      metadata: {
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone,
        emailVerified: false,
      },
    },
  });

  const premium: ParentPremiumRow = {
    isPremium: parent.isPremium,
    premiumUntil: parent.premiumUntil,
  };

  return {
    token: createParentAuthToken(parent.id, parent.email),
    parent: {
      id: parent.id,
      email: parent.email,
      isPremium: parentHasActivePremium(premium),
      premiumUntil: parent.premiumUntil?.toISOString() ?? null,
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone,
      emailVerificationStatus: 'pending',
    },
  };
}

export function isRegisterParentPrismaConflict(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}

type LoginParentBody = { email: string; password: string };
type LoginChildBody = { username: string; password: string; parent_code?: string };

export type LoginUnifiedInput = LoginParentBody | LoginChildBody;

export type LoginUnifiedResponse =
  | {
      kind: 'parent';
      json: {
        token: string;
        parent: { id: string; email: string; isPremium: boolean; premiumUntil: string | null };
      };
    }
  | {
      kind: 'child';
      json: {
        token: string;
        user: { id: string; username: string; realName: string; type: 'minor' };
        approvalStatus: MinorApprovalStatus;
      };
    }
  | { kind: 'error'; status: 401; message: string };

export async function loginUnifiedTransactional(
  body: LoginUnifiedInput,
): Promise<LoginUnifiedResponse> {
  if ('email' in body) {
    const parent = await prisma.parent.findUnique({
      where: { email: body.email },
      select: { id: true, email: true, password: true, isPremium: true, premiumUntil: true },
    });
    if (!parent) {
      return { kind: 'error', status: 401, message: 'Credenciales inv?lidas.' };
    }
    const ok = await bcrypt.compare(body.password, parent.password);
    if (!ok) {
      return { kind: 'error', status: 401, message: 'Credenciales inv?lidas.' };
    }
    const premium: ParentPremiumRow = {
      isPremium: parent.isPremium,
      premiumUntil: parent.premiumUntil,
    };
    return {
      kind: 'parent',
      json: {
        token: createParentAuthToken(parent.id, parent.email),
        parent: {
          id: parent.id,
          email: parent.email,
          isPremium: parentHasActivePremium(premium),
          premiumUntil: parent.premiumUntil?.toISOString() ?? null,
        },
      },
    };
  }

  const username = LEGACY_DEMO_CHILD_USERNAMES[body.username] ?? body.username;
  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      realName: true,
      passwordHash: true,
      parentId: true,
      parentAccountApprovedAt: true,
      status: true,
    },
  });
  if (!user?.passwordHash) {
    return {
      kind: 'error',
      status: 401,
      message: 'Credenciales inv?lidas o cuenta sin contrase?a.',
    };
  }
  const ok = await bcrypt.compare(body.password, user.passwordHash);
  if (!ok) {
    return { kind: 'error', status: 401, message: 'Credenciales inv?lidas.' };
  }
  if (body.parent_code) {
    const parentCode = body.parent_code.trim().toLowerCase();
    const parent = await prisma.parent.findUnique({
      where: { id: user.parentId },
      select: { id: true, email: true },
    });
    if (!parent) {
      return { kind: 'error', status: 401, message: 'C?digo parental inv?lido.' };
    }
    const matches =
      parent.id.toLowerCase() === parentCode || parent.email.toLowerCase() === parentCode;
    if (!matches) {
      return { kind: 'error', status: 401, message: 'C?digo parental inv?lido.' };
    }
  }

  const approvalStatus = inferMinorApprovalStatus(user);
  return {
    kind: 'child',
    json: {
      token: createChildAuthToken(user.id, user.username, user.parentId, approvalStatus),
      user: {
        id: user.id,
        username: user.username,
        realName: user.realName,
        type: 'minor' as const,
      },
      approvalStatus,
    },
  };
}
