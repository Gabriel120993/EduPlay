import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";
import { createChildAuthToken, createParentAuthToken } from "../lib/auth";
import { logError } from "../lib/logger";
import { hashPassword } from "../lib/password";
import { parentHasActivePremium } from "../lib/parentPremiumAccess";
import { prisma } from "../lib/prisma";
import {
  childLoginSchema,
  formatZodError,
  parentCredentialsSchema,
} from "../lib/validation/schemas";

type ParentPremiumRow = { isPremium: boolean; premiumUntil: Date | null };

function buildAuthResponse(parentId: string, email: string, premium: ParentPremiumRow): {
  token: string;
  parent: { id: string; email: string; isPremium: boolean; premiumUntil: string | null };
} {
  return {
    token: createParentAuthToken(parentId, email),
    parent: {
      id: parentId,
      email,
      isPremium: parentHasActivePremium(premium),
      premiumUntil: premium.premiumUntil?.toISOString() ?? null,
    },
  };
}

export async function register(req: Request, res: Response): Promise<void> {
  const parsed = parentCredentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }
  const body = parsed.data;

  try {
    const password = await hashPassword(body.password);
    const parent = await prisma.parent.create({
      data: { email: body.email, password },
      select: { id: true, email: true, isPremium: true, premiumUntil: true },
    });
    res.status(201).json(buildAuthResponse(parent.id, parent.email, parent));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      res.status(409).json({ error: "Ese email ya está registrado." });
      return;
    }
    logError("auth", error);
    res.status(500).json({ error: "Error al registrar cuenta." });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  const parsed = parentCredentialsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }
  const body = parsed.data;

  try {
    const parent = await prisma.parent.findUnique({
      where: { email: body.email },
      select: { id: true, email: true, password: true, isPremium: true, premiumUntil: true },
    });
    if (!parent) {
      res.status(401).json({ error: "Credenciales inválidas." });
      return;
    }
    const ok = await bcrypt.compare(body.password, parent.password);
    if (!ok) {
      res.status(401).json({ error: "Credenciales inválidas." });
      return;
    }
    res.json(buildAuthResponse(parent.id, parent.email, parent));
  } catch (error) {
    logError("auth", error);
    res.status(500).json({ error: "Error al iniciar sesión." });
  }
}

/** Login del menor por `username` + contraseña (requiere `User.passwordHash`). */
export async function loginChild(req: Request, res: Response): Promise<void> {
  const parsed = childLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }
  const body = parsed.data;

  try {
    const user = await prisma.user.findUnique({
      where: { username: body.username },
      select: { id: true, username: true, realName: true, passwordHash: true, parentAccountApprovedAt: true },
    });
    if (!user?.passwordHash) {
      res.status(401).json({ error: "Credenciales inválidas o cuenta sin contraseña." });
      return;
    }
    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) {
      res.status(401).json({ error: "Credenciales inválidas." });
      return;
    }
    if (!user.parentAccountApprovedAt) {
      res.status(403).json({
        error:
          "Tu tutor o tutora debe aprobar tu cuenta en el panel familiar antes de que puedas entrar.",
        code: "CHILD_ACCOUNT_PENDING_APPROVAL",
      });
      return;
    }
    res.json({
      token: createChildAuthToken(user.id, user.username),
      user: { id: user.id, username: user.username, realName: user.realName },
    });
  } catch (error) {
    logError("auth", error);
    res.status(500).json({ error: "Error al iniciar sesión." });
  }
}

export async function me(req: Request, res: Response): Promise<void> {
  const auth = req.auth;
  if (!auth) {
    res.status(401).json({ error: "No autenticado." });
    return;
  }

  if (auth.kind === "child") {
    try {
      const user = await prisma.user.findUnique({
        where: { id: auth.userId },
        select: { id: true, username: true, realName: true, parentAccountApprovedAt: true },
      });
      if (!user) {
        res.status(401).json({ error: "Sesión inválida." });
        return;
      }
      res.json({
        role: "child" as const,
        child: { id: user.id, username: user.username, realName: user.realName },
        accountApproved: user.parentAccountApprovedAt != null,
      });
    } catch (error) {
      logError("auth", error);
      res.status(500).json({ error: "Error al cargar la sesión." });
    }
    return;
  }

  try {
    const [parentRow, children] = await Promise.all([
      prisma.parent.findUnique({
        where: { id: auth.parentId },
        select: { isPremium: true, premiumUntil: true },
      }),
      prisma.user.findMany({
        where: { parentId: auth.parentId },
        select: { id: true, username: true, realName: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);
    const premium: ParentPremiumRow = {
      isPremium: parentRow?.isPremium ?? false,
      premiumUntil: parentRow?.premiumUntil ?? null,
    };
    res.json({
      role: "parent" as const,
      parent: {
        id: auth.parentId,
        email: auth.email,
        isPremium: parentHasActivePremium(premium),
        premiumUntil: premium.premiumUntil?.toISOString() ?? null,
      },
      children,
    });
  } catch (error) {
    logError("auth", error);
    res.status(500).json({ error: "Error al cargar la sesión." });
  }
}
