import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env';
import { createChildAuthToken, createParentAuthToken } from '../lib/auth';
import { logError } from '../lib/logger';
import { parentHasActivePremium } from '../lib/parentPremiumAccess';
import { hashPassword } from '../lib/password';
import { prisma } from '../lib/prisma';
import { emailSchema, formatZodError, passwordSchema } from '../lib/validation/schemas';

type MinorApprovalStatus = 'approved' | 'pending' | 'blocked';

function inferMinorApprovalStatus(user: {
  status: 'active' | 'inactive' | 'suspended';
  parentAccountApprovedAt: Date | null;
}): MinorApprovalStatus {
  if (user.status !== 'active') return 'blocked';
  if (!user.parentAccountApprovedAt) return 'pending';
  return 'approved';
}

const forgotPasswordSchema = z.object({
  email: emailSchema,
});

const resetPasswordSchema = z.object({
  token: z.string().trim().min(20),
  password: passwordSchema,
});

/**
 * POST /api/auth/logout — JWT stateless: el cliente debe borrar el token.
 */
export async function postLogout(_req: Request, res: Response): Promise<void> {
  res.status(204).send();
}

/**
 * POST /api/auth/refresh — Emite un nuevo JWT con los mismos datos de cuenta.
 */
export async function postRefresh(req: Request, res: Response): Promise<void> {
  const auth = req.auth;
  if (!auth) {
    res.status(401).json({ error: 'No autenticado.' });
    return;
  }

  try {
    if (auth.kind === 'parent') {
      const parent = await prisma.parent.findUnique({
        where: { id: auth.parentId },
        select: { id: true, email: true, isPremium: true, premiumUntil: true },
      });
      if (!parent) {
        res.status(401).json({ error: 'Sesión inválida.' });
        return;
      }
      res.json({
        token: createParentAuthToken(parent.id, parent.email),
        parent: {
          id: parent.id,
          email: parent.email,
          isPremium: parentHasActivePremium(parent),
          premiumUntil: parent.premiumUntil?.toISOString() ?? null,
        },
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        id: true,
        username: true,
        realName: true,
        parentId: true,
        status: true,
        parentAccountApprovedAt: true,
      },
    });
    if (!user) {
      res.status(401).json({ error: 'Sesión inválida.' });
      return;
    }
    const approvalStatus = inferMinorApprovalStatus(user);
    res.json({
      token: createChildAuthToken(user.id, user.username, user.parentId, approvalStatus),
      user: {
        id: user.id,
        username: user.username,
        realName: user.realName,
        type: 'minor' as const,
      },
      approvalStatus,
    });
  } catch (e) {
    logError('authSession.refresh', e);
    res.status(500).json({ error: 'Error al refrescar la sesión.' });
  }
}

export async function postForgotPassword(req: Request, res: Response): Promise<void> {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }

  try {
    const parent = await prisma.parent.findUnique({
      where: { email: parsed.data.email },
      select: { id: true },
    });
    if (!parent) {
      res.json({
        ok: true,
        message:
          'Si el email está registrado, recibirás instrucciones para restablecer la contraseña.',
      });
      return;
    }

    const resetToken = jwt.sign({ pwdReset: 1, sub: parent.id }, env.jwtSecret, {
      expiresIn: '1h',
      algorithm: 'HS256',
    });

    res.json({
      ok: true,
      message:
        'Si el email está registrado, recibirás instrucciones para restablecer la contraseña.',
      ...(env.nodeEnv !== 'production' ? { devResetToken: resetToken } : {}),
    });
  } catch (e) {
    logError('authSession.forgotPassword', e);
    res.status(500).json({ error: 'Error al procesar la solicitud.' });
  }
}

export async function postResetPassword(req: Request, res: Response): Promise<void> {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }

  try {
    const decoded = jwt.verify(parsed.data.token, env.jwtSecret, {
      algorithms: ['HS256'],
    }) as jwt.JwtPayload;
    if (decoded.pwdReset !== 1 || typeof decoded.sub !== 'string') {
      res.status(400).json({ error: 'Token de recuperación inválido.' });
      return;
    }

    const parentId = decoded.sub;
    const passwordHash = await hashPassword(parsed.data.password);

    await prisma.$transaction(async (tx) => {
      await tx.parent.update({
        where: { id: parentId },
        data: { password: passwordHash },
      });
      const parentUser = await tx.user.findFirst({
        where: { parentId, type: 'parent' },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      });
      if (parentUser) {
        await tx.user.update({
          where: { id: parentUser.id },
          data: { passwordHash },
        });
      }
    });

    res.json({ ok: true, message: 'Contraseña actualizada.' });
  } catch (e) {
    if (e instanceof jwt.TokenExpiredError) {
      res.status(400).json({ error: 'El enlace de recuperación expiró.' });
      return;
    }
    if (e instanceof jwt.JsonWebTokenError) {
      res.status(400).json({ error: 'Token de recuperación inválido.' });
      return;
    }
    logError('authSession.resetPassword', e);
    res.status(500).json({ error: 'Error al restablecer la contraseña.' });
  }
}
