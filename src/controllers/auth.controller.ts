import type { NextFunction, Request, Response } from "express";
import bcrypt from "bcrypt";
import { ActivityType, Prisma } from "@prisma/client";
import { z } from "zod";
import { createChildAuthToken, createParentAuthToken } from "../lib/auth";
import { logError } from "../lib/logger";
import { hashPassword } from "../lib/password";
import { parentHasActivePremium } from "../lib/parentPremiumAccess";
import { prisma } from "../lib/prisma";
import {
  childLoginSchema,
  formatZodError,
  minorAvatarOptionalSchema,
  passwordSchema,
  parentCredentialsSchema,
  usernameSchema,
} from "../lib/validation/schemas";

type ParentPremiumRow = { isPremium: boolean; premiumUntil: Date | null };
type MinorApprovalStatus = "approved" | "pending" | "blocked";

const registerParentSchema = z.object({
  email: z.string().trim().email("Email inv?lido.").max(320),
  password: passwordSchema,
  firstName: z.string().trim().min(1).max(100).optional().default("Tutor"),
  lastName: z.string().trim().min(1).max(100).optional().default("EduPlay"),
  phone: z.string().trim().min(6).max(30).optional().default("000000"),
});

const registerMinorSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  age: z.coerce.number().int().min(3).max(17),
  avatar: minorAvatarOptionalSchema,
  interests: z.array(z.string().trim().min(1).max(100)).max(30).default([]),
});

const minorCodeLoginSchema = z.object({
  username: usernameSchema,
  accessCode: z.string().trim().min(4).max(16),
});

const loginUnifiedSchema = parentCredentialsSchema.or(
  childLoginSchema.extend({
    parent_code: z.string().trim().min(1).max(320).optional(),
  })
);

const BASIC_READ_PATHS = new Set(["/api/auth/me", "/auth/me", "/api/minors", "/api/minors/"]);

const LEGACY_DEMO_CHILD_USERNAMES: Record<string, string> = {
  lucia_explora: "lucia_demo",
  mateo_numeros: "mateo_demo",
  sofia_ciencia: "sofia_demo",
  daniel_mapas: "daniel_demo",
  emma_lectora: "emma_demo",
};

function inferMinorApprovalStatus(user: {
  status: "active" | "inactive" | "suspended";
  parentAccountApprovedAt: Date | null;
}): MinorApprovalStatus {
  if (user.status !== "active") return "blocked";
  if (!user.parentAccountApprovedAt) return "pending";
  return "approved";
}

function actionFromRequest(req: Request): "post" | "friend_request" | "purchase" | "content_access" {
  const path = req.path.toLowerCase();
  const method = req.method.toUpperCase();
  if (path.includes("/friends") || path.includes("friend")) return "friend_request";
  if (path.includes("/purchase") || path.includes("/iap") || path.includes("/premium")) return "purchase";
  if (path.includes("/posts") || path.includes("/content") || method === "POST") return "post";
  return "content_access";
}

function generateToken(input:
  | { userType: "parent"; parentId: string; email: string }
  | {
      userType: "minor";
      userId: string;
      username: string;
      parentId: string;
      approvalStatus: MinorApprovalStatus;
    }): string {
  if (input.userType === "parent") {
    return createParentAuthToken(input.parentId, input.email);
  }
  return createChildAuthToken(input.userId, input.username, input.parentId, input.approvalStatus);
}

function generateMinorAccessCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function buildAuthResponse(parentId: string, email: string, premium: ParentPremiumRow): {
  token: string;
  parent: { id: string; email: string; isPremium: boolean; premiumUntil: string | null };
} {
  return {
    token: generateToken({ userType: "parent", parentId, email }),
    parent: {
      id: parentId,
      email,
      isPremium: parentHasActivePremium(premium),
      premiumUntil: premium.premiumUntil?.toISOString() ?? null,
    },
  };
}

export async function register(req: Request, res: Response): Promise<void> {
  const parsed = registerParentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }
  const body = parsed.data;

  try {
    const parentPasswordHash = await hashPassword(body.password);
    const parent = await prisma.parent.create({
      data: {
        email: body.email.toLowerCase(),
        password: parentPasswordHash,
      },
      select: { id: true, email: true, isPremium: true, premiumUntil: true },
    });

    // Perfil User del tutor para relaciones nuevas (minorProfile/parentChildRelation).
    const parentUserPasswordHash = await hashPassword(body.password);
    const parentUser = await prisma.user.create({
      data: {
        username: `parent_${parent.id.slice(0, 8)}`,
        realName: `${body.firstName} ${body.lastName}`.trim(),
        passwordHash: parentUserPasswordHash,
        age: 30,
        parentId: parent.id,
        type: "parent",
        status: "active",
        parentAccountApprovedAt: new Date(),
      },
      select: { id: true },
    });

    await prisma.parentProfile.create({
      data: {
        userId: parentUser.id,
        verificationStatus: "pending",
        verificationMethod: "email",
        subscriptionTier: "free",
      },
    });

    await prisma.analyticsEvent.create({
      data: {
        userId: parentUser.id,
        eventName: "parent_registered",
        metadata: {
          firstName: body.firstName,
          lastName: body.lastName,
          phone: body.phone,
          emailVerified: false,
        },
      },
    });

    res.status(201).json({
      ...buildAuthResponse(parent.id, parent.email, parent),
      parent: {
        id: parent.id,
        email: parent.email,
        isPremium: parentHasActivePremium(parent),
        premiumUntil: parent.premiumUntil?.toISOString() ?? null,
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone,
        emailVerificationStatus: "pending",
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      res.status(409).json({ error: "Ese email ya est? registrado." });
      return;
    }
    logError("auth", error);
    res.status(500).json({ error: "Error al registrar cuenta." });
  }
}

export async function registerParent(req: Request, res: Response): Promise<void> {
  await register(req, res);
}

export async function registerMinor(req: Request, res: Response): Promise<void> {
  const auth = req.auth;
  if (!auth || auth.kind !== "parent") {
    res.status(403).json({ error: "Solo un tutor autenticado puede crear menores." });
    return;
  }

  const parsed = registerMinorSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }

  try {
    const parent = await prisma.parent.findUnique({
      where: { id: auth.parentId },
      select: { id: true, email: true },
    });
    if (!parent) {
      res.status(404).json({ error: "Cuenta tutor no encontrada." });
      return;
    }

    const parentUser = await prisma.user.findFirst({
      where: { parentId: parent.id, type: "parent" },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    if (!parentUser) {
      res.status(400).json({
        error: "No existe perfil User de tipo parent para esta cuenta. Complet? primero el perfil de tutor.",
      });
      return;
    }

    const accessCode = generateMinorAccessCode();
    const passwordHash = await hashPassword(parsed.data.password);
    const accessCodeHash = await hashPassword(accessCode);

    const minor = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          username: parsed.data.username,
          realName: parsed.data.username,
          passwordHash,
          age: parsed.data.age,
          avatarUrl: parsed.data.avatar ?? null,
          parentId: parent.id,
          type: "minor",
          status: "active",
          // Alta creada por el tutor autenticado: queda aprobada para login inmediato.
          parentAccountApprovedAt: new Date(),
        },
      });

      await tx.minorProfile.create({
        data: {
          userId: created.id,
          parentId: parentUser.id,
          age: parsed.data.age,
          interests: parsed.data.interests,
          dailyTimeLimit: 90,
          contentRestrictions: {
            accessCodeHash,
            blockedCategories: [],
          },
          canMakePurchases: false,
          canAddFriends: true,
          canPostContent: true,
        },
      });

      await tx.parentChildRelation.create({
        data: {
          parentId: parentUser.id,
          childId: created.id,
          status: "active",
          approvalRequiredFor: ["friend_request", "post", "purchase", "content_access"],
        },
      });

      await tx.parentFamilyEvent.create({
        data: {
          parentId: parent.id,
          kind: "MINOR_REGISTERED",
          childId: created.id,
          title: "Nuevo menor registrado",
          body: `Se cre? la cuenta ${created.username}. Lista para iniciar sesi?n.`,
        },
      });

      return created;
    });

    res.status(201).json({
      minor: {
        id: minor.id,
        username: minor.username,
        age: minor.age,
        avatar: minor.avatarUrl,
        parentId: minor.parentId,
        approvalStatus: "approved",
      },
      accessCode,
      notification: "Se notific? al tutor del registro del menor.",
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      res.status(409).json({ error: "El username ya est? en uso." });
      return;
    }
    logError("auth.registerMinor", error);
    res.status(500).json({ error: "Error al registrar cuenta de menor." });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  const parsed = loginUnifiedSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }
  const body = parsed.data;

  try {
    if ("email" in body) {
      const parent = await prisma.parent.findUnique({
        where: { email: body.email },
        select: { id: true, email: true, password: true, isPremium: true, premiumUntil: true },
      });
      if (!parent) {
        res.status(401).json({ error: "Credenciales inv?lidas." });
        return;
      }
      const ok = await bcrypt.compare(body.password, parent.password);
      if (!ok) {
        res.status(401).json({ error: "Credenciales inv?lidas." });
        return;
      }
      res.json(buildAuthResponse(parent.id, parent.email, parent));
      return;
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
      res.status(401).json({ error: "Credenciales inv?lidas o cuenta sin contrase?a." });
      return;
    }
    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) {
      res.status(401).json({ error: "Credenciales inv?lidas." });
      return;
    }
    if (body.parent_code) {
      const parentCode = body.parent_code.trim().toLowerCase();
      const parent = await prisma.parent.findUnique({
        where: { id: user.parentId },
        select: { id: true, email: true },
      });
      if (!parent) {
        res.status(401).json({ error: "C?digo parental inv?lido." });
        return;
      }
      const matches = parent.id.toLowerCase() === parentCode || parent.email.toLowerCase() === parentCode;
      if (!matches) {
        res.status(401).json({ error: "C?digo parental inv?lido." });
        return;
      }
    }

    const approvalStatus = inferMinorApprovalStatus(user);
    res.json({
      token: generateToken({
        userType: "minor",
        userId: user.id,
        username: user.username,
        parentId: user.parentId,
        approvalStatus,
      }),
      user: { id: user.id, username: user.username, realName: user.realName, type: "minor" as const },
      approvalStatus,
    });
  } catch (error) {
    logError("auth", error);
    res.status(500).json({ error: "Error al iniciar sesi?n." });
  }
}

/** Login del menor por `username` + contrase?a (requiere `User.passwordHash`). */
export async function loginChild(req: Request, res: Response): Promise<void> {
  await login(req, res);
}

export async function loginMinorWithCode(req: Request, res: Response): Promise<void> {
  const parsed = minorCodeLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }

  try {
    const username = LEGACY_DEMO_CHILD_USERNAMES[parsed.data.username] ?? parsed.data.username;
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        realName: true,
        parentId: true,
        status: true,
        parentAccountApprovedAt: true,
        type: true,
        minorProfile: { select: { contentRestrictions: true } },
      },
    });
    if (!user || user.type !== "minor") {
      res.status(401).json({ error: "Credenciales inv?lidas." });
      return;
    }

    const restrictions = (user.minorProfile?.contentRestrictions ?? {}) as Record<string, unknown>;
    const accessCodeHash =
      typeof restrictions.accessCodeHash === "string" ? restrictions.accessCodeHash : "";
    if (!accessCodeHash) {
      res.status(401).json({ error: "Esta cuenta no tiene c?digo de acceso configurado." });
      return;
    }

    const matches = await bcrypt.compare(parsed.data.accessCode, accessCodeHash);
    if (!matches) {
      res.status(401).json({ error: "Credenciales inv?lidas." });
      return;
    }

    const approvalStatus = inferMinorApprovalStatus(user);
    res.json({
      token: generateToken({
        userType: "minor",
        userId: user.id,
        username: user.username,
        parentId: user.parentId,
        approvalStatus,
      }),
      user: { id: user.id, username: user.username, realName: user.realName, type: "minor" as const },
      approvalStatus,
    });
  } catch (error) {
    logError("auth.loginMinorWithCode", error);
    res.status(500).json({ error: "Error al iniciar sesi?n con c?digo." });
  }
}

/** Menor pendiente: solo lectura b?sica. Menor bloqueado: rechazar todo. */
export async function verifyMinorStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = req.auth;
  if (!auth || auth.kind !== "child") {
    next();
    return;
  }
  try {
    const row = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { status: true, parentAccountApprovedAt: true },
    });
    if (!row) {
      res.status(401).json({ error: "Sesi?n inv?lida." });
      return;
    }
    const approvalStatus = inferMinorApprovalStatus(row);
    if (approvalStatus === "blocked") {
      res.status(403).json({ error: "Tu cuenta est? bloqueada por tu tutor.", code: "MINOR_BLOCKED" });
      return;
    }
    if (approvalStatus === "pending" && !BASIC_READ_PATHS.has(req.path)) {
      res.status(403).json({
        error: "Tu cuenta est? pendiente de aprobaci?n. Solo ten?s acceso de lectura b?sica.",
        code: "MINOR_PENDING_APPROVAL_READ_ONLY",
      });
      return;
    }
    next();
  } catch (error) {
    logError("auth.verifyMinorStatus", error);
    res.status(500).json({ error: "Error al verificar estado del menor." });
  }
}

/** Verifica si la acci?n del menor requiere aprobaci?n parental. */
export async function checkParentalApproval(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = req.auth;
  if (!auth || auth.kind !== "child") {
    next();
    return;
  }

  try {
    const relation = await prisma.parentChildRelation.findFirst({
      where: { childId: auth.userId, status: "active" },
      select: { approvalRequiredFor: true },
    });
    if (!relation) {
      next();
      return;
    }

    const action = actionFromRequest(req);
    const requiredFor = Array.isArray(relation.approvalRequiredFor)
      ? relation.approvalRequiredFor.map((v) => String(v))
      : [];
    if (!requiredFor.includes(action)) {
      next();
      return;
    }

    const pending = await prisma.activityApproval.findFirst({
      where: {
        minorId: auth.userId,
        activityType: action as ActivityType,
        status: "pending",
      },
      orderBy: { requestedAt: "desc" },
      select: { id: true },
    });
    if (pending) {
      res.status(403).json({
        error: "Esta acci?n requiere aprobaci?n parental pendiente.",
        code: "PARENTAL_APPROVAL_PENDING",
        approvalId: pending.id,
      });
      return;
    }
    next();
  } catch (error) {
    logError("auth.checkParentalApproval", error);
    res.status(500).json({ error: "Error al verificar aprobaci?n parental." });
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
        select: { id: true, username: true, realName: true, parentId: true, parentAccountApprovedAt: true },
      });
      if (!user) {
        res.status(401).json({ error: "Sesi?n inv?lida." });
        return;
      }
      const parent = await prisma.parent.findUnique({
        where: { id: user.parentId },
        select: { id: true, email: true },
      });
      res.json({
        role: "child" as const,
        child: { id: user.id, username: user.username, realName: user.realName },
        accountApproved: user.parentAccountApprovedAt != null,
        parent: parent ? { id: parent.id, email: parent.email } : null,
      });
    } catch (error) {
      logError("auth", error);
      res.status(500).json({ error: "Error al cargar la sesi?n." });
    }
    return;
  }

  try {
    const [parentRow, children, parentUser] = await Promise.all([
      prisma.parent.findUnique({
        where: { id: auth.parentId },
        select: { isPremium: true, premiumUntil: true },
      }),
      prisma.user.findMany({
        where: { parentId: auth.parentId, type: "minor" },
        select: { id: true, username: true, realName: true, age: true, status: true, parentAccountApprovedAt: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.user.findFirst({
        where: { parentId: auth.parentId, type: "parent" },
        select: { id: true },
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
      parentUser: parentUser ? { id: parentUser.id } : null,
      children,
    });
  } catch (error) {
    logError("auth", error);
    res.status(500).json({ error: "Error al cargar la sesi?n." });
  }
}
