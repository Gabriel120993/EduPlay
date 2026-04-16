import { randomBytes } from "node:crypto";
import type { Request, Response } from "express";
import { ActivityApprovalStatus, ActivityType, Prisma } from "@prisma/client";
import { z } from "zod";
import { logError } from "../lib/logger";
import { hashPassword } from "../lib/password";
import { prisma } from "../lib/prisma";
import { formatZodError, usernameSchema, uuidSchema } from "../lib/validation/schemas";

const minorCreateBodySchema = z.object({
  username: usernameSchema,
  age: z.coerce.number().int().min(3, "La edad mínima es 3.").max(17, "La edad máxima es 17."),
  avatar: z.string().trim().url("avatar debe ser una URL válida.").max(2000).optional(),
  interests: z.array(z.string().trim().min(1).max(100)).max(30).default([]),
  gradeLevel: z.string().trim().min(1).max(50).optional(),
  password: z.string().min(6).max(128).optional(),
});

const minorUpdateBodySchema = z
  .object({
    username: usernameSchema.optional(),
    age: z.coerce.number().int().min(3).max(17).optional(),
    avatar: z.string().trim().url("avatar debe ser una URL válida.").max(2000).nullable().optional(),
    interests: z.array(z.string().trim().min(1).max(100)).max(30).optional(),
    gradeLevel: z.string().trim().min(1).max(50).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Debés enviar al menos un campo para actualizar." });

const minorApprovalBodySchema = z.object({
  approvalId: uuidSchema.optional(),
  status: z.enum([ActivityApprovalStatus.approved, ActivityApprovalStatus.rejected]),
  activityType: z.nativeEnum(ActivityType).optional(),
  activityData: z.record(z.string(), z.unknown()).optional(),
});

function parseWithSchema<T>(
  schema: z.ZodSchema<T>,
  input: unknown,
  res: Response
): { ok: true; data: T } | { ok: false } {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return { ok: false };
  }
  return { ok: true, data: parsed.data };
}

function actor(req: Request): string {
  if (req.auth?.kind === "parent") return `parent:${req.auth.parentId}`;
  if (req.auth?.kind === "child") return `child:${req.auth.userId}`;
  return "anonymous";
}

function generateAccessCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

async function resolveParentUserId(parentId: string): Promise<string | null> {
  const parentUser = await prisma.user.findFirst({
    where: { parentId, type: "parent" },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  return parentUser?.id ?? null;
}

async function assertParentAccess(req: Request, res: Response): Promise<string | null> {
  const auth = req.auth;
  if (!auth || auth.kind !== "parent") {
    res.status(403).json({ error: "Solo un tutor puede realizar esta operación." });
    return null;
  }
  const parsedParentId = parseWithSchema(uuidSchema, req.params.parentId, res);
  if (!parsedParentId.ok) return null;
  if (auth.parentId !== parsedParentId.data) {
    res.status(403).json({ error: "Solo podés operar sobre tus propios menores." });
    return null;
  }
  return parsedParentId.data;
}

async function assertParentOwnsMinor(req: Request, res: Response): Promise<{ minorId: string; parentId: string } | null> {
  const auth = req.auth;
  if (!auth || auth.kind !== "parent") {
    res.status(403).json({ error: "Solo un tutor puede realizar esta operación." });
    return null;
  }
  const parsedMinorId = parseWithSchema(uuidSchema, req.params.minorId, res);
  if (!parsedMinorId.ok) return null;

  const minor = await prisma.user.findUnique({
    where: { id: parsedMinorId.data },
    select: { id: true, parentId: true, type: true },
  });
  if (!minor || minor.type !== "minor") {
    res.status(404).json({ error: "Menor no encontrado." });
    return null;
  }
  if (minor.parentId !== auth.parentId) {
    res.status(403).json({ error: "Solo podés operar menores de tu cuenta." });
    return null;
  }
  return { minorId: minor.id, parentId: auth.parentId };
}

export async function createMinor(req: Request, res: Response): Promise<void> {
  const parentId = await assertParentAccess(req, res);
  if (!parentId) return;

  const parsedBody = parseWithSchema(minorCreateBodySchema, req.body, res);
  if (!parsedBody.ok) return;

  try {
    const parent = await prisma.parent.findUnique({ where: { id: parentId }, select: { id: true } });
    if (!parent) {
      res.status(404).json({ error: "Padre no encontrado." });
      return;
    }

    const parentUserId = await resolveParentUserId(parentId);
    if (!parentUserId) {
      res.status(400).json({
        error:
          "No existe un perfil User de tipo parent para este tutor. Crealo antes de asociar perfiles minor.",
      });
      return;
    }

    const plainPassword = parsedBody.data.password ?? generateAccessCode();
    const passwordHash = await hashPassword(plainPassword);

    const created = await prisma.$transaction(async (tx) => {
      const minor = await tx.user.create({
        data: {
          username: parsedBody.data.username,
          realName: parsedBody.data.username,
          passwordHash,
          age: parsedBody.data.age,
          avatarUrl: parsedBody.data.avatar ?? null,
          parentId,
          type: "minor",
          status: "active",
          parentAccountApprovedAt: null,
        },
      });

      const profile = await tx.minorProfile.create({
        data: {
          userId: minor.id,
          parentId: parentUserId,
          age: parsedBody.data.age,
          gradeLevel: parsedBody.data.gradeLevel ?? null,
          school: null,
          interests: parsedBody.data.interests,
          dailyTimeLimit: 90,
          contentRestrictions: {},
          canMakePurchases: false,
          canAddFriends: true,
          canPostContent: true,
        },
      });

      const relation = await tx.parentChildRelation.create({
        data: {
          parentId: parentUserId,
          childId: minor.id,
          status: "pending",
          approvalRequiredFor: ["friend_request", "post", "purchase", "content_access"],
        },
      });

      await tx.analyticsEvent.create({
        data: {
          userId: minor.id,
          eventName: "minor_created",
          metadata: {
            parentId,
            actor: actor(req),
          },
        },
      });

      return { minor, profile, relation };
    });

    res.status(201).json({
      minor: {
        id: created.minor.id,
        parentId: created.minor.parentId,
        username: created.minor.username,
        age: created.minor.age,
        avatar: created.minor.avatarUrl,
        gradeLevel: created.profile.gradeLevel,
        interests: created.profile.interests,
        status: created.minor.status,
      },
      relation: created.relation,
      credentials: {
        username: created.minor.username,
        password: plainPassword,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      res.status(409).json({ error: "El username ya está en uso." });
      return;
    }
    logError("minors.createMinor", err, { actor: actor(req) });
    res.status(500).json({ error: "No se pudo crear el menor." });
  }
}

export async function getMinorsByParent(req: Request, res: Response): Promise<void> {
  const parentId = await assertParentAccess(req, res);
  if (!parentId) return;

  try {
    const minors = await prisma.user.findMany({
      where: { parentId, type: "minor" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        username: true,
        age: true,
        avatarUrl: true,
        status: true,
        parentAccountApprovedAt: true,
        createdAt: true,
        minorProfile: {
          select: { gradeLevel: true, interests: true },
        },
      },
    });

    const parentUserId = await resolveParentUserId(parentId);
    const relations = parentUserId
      ? await prisma.parentChildRelation.findMany({
          where: { parentId: parentUserId, childId: { in: minors.map((m) => m.id) } },
          select: { childId: true, status: true, updatedAt: true },
        })
      : [];
    const relationMap = new Map(relations.map((r) => [r.childId, r]));

    const activityRows =
      minors.length === 0
        ? []
        : await prisma.analyticsEvent.findMany({
            where: { userId: { in: minors.map((m) => m.id) } },
            orderBy: { createdAt: "desc" },
            select: { userId: true, eventName: true, createdAt: true },
          });
    const activityMap = new Map<string, { eventName: string; createdAt: Date }>();
    for (const row of activityRows) {
      if (!row.userId || activityMap.has(row.userId)) continue;
      activityMap.set(row.userId, { eventName: row.eventName, createdAt: row.createdAt });
    }

    res.json(
      minors.map((m) => {
        const rel = relationMap.get(m.id);
        const lastActivity = activityMap.get(m.id);
        return {
          ...m,
          approvalStatus: m.parentAccountApprovedAt ? "approved" : "pending",
          relationStatus: rel?.status ?? "pending",
          relationUpdatedAt: rel?.updatedAt ?? null,
          lastActivity: lastActivity
            ? { eventName: lastActivity.eventName, at: lastActivity.createdAt.toISOString() }
            : null,
        };
      })
    );
  } catch (err) {
    logError("minors.getMinorsByParent", err, { actor: actor(req) });
    res.status(500).json({ error: "No se pudieron listar los menores." });
  }
}

export async function getMinorDetail(req: Request, res: Response): Promise<void> {
  const parsedMinorId = parseWithSchema(uuidSchema, req.params.minorId, res);
  if (!parsedMinorId.ok) return;

  try {
    const minor = await prisma.user.findUnique({
      where: { id: parsedMinorId.data },
      select: {
        id: true,
        username: true,
        age: true,
        avatarUrl: true,
        status: true,
        type: true,
        parentId: true,
        parentAccountApprovedAt: true,
        createdAt: true,
        updatedAt: true,
        minorProfile: true,
      },
    });
    if (!minor || minor.type !== "minor") {
      res.status(404).json({ error: "Menor no encontrado." });
      return;
    }

    const auth = req.auth;
    if (!auth) {
      res.status(401).json({ error: "No autenticado." });
      return;
    }
    const canRead =
      (auth.kind === "parent" && auth.parentId === minor.parentId) ||
      (auth.kind === "child" && auth.userId === minor.id);
    if (!canRead) {
      res.status(403).json({ error: "No tenés permisos para ver este menor." });
      return;
    }

    res.json(minor);
  } catch (err) {
    logError("minors.getMinorDetail", err, { actor: actor(req) });
    res.status(500).json({ error: "No se pudo obtener el menor." });
  }
}

export async function updateMinor(req: Request, res: Response): Promise<void> {
  const ownership = await assertParentOwnsMinor(req, res);
  if (!ownership) return;

  const parsedBody = parseWithSchema(minorUpdateBodySchema, req.body, res);
  if (!parsedBody.ok) return;

  try {
    const userData: Prisma.UserUpdateInput = {};
    const profileData: Prisma.MinorProfileUpdateInput = {};

    if (parsedBody.data.username !== undefined) userData.username = parsedBody.data.username;
    if (parsedBody.data.age !== undefined) {
      userData.age = parsedBody.data.age;
      profileData.age = parsedBody.data.age;
    }
    if (parsedBody.data.avatar !== undefined) userData.avatarUrl = parsedBody.data.avatar;
    if (parsedBody.data.interests !== undefined) profileData.interests = parsedBody.data.interests;
    if (parsedBody.data.gradeLevel !== undefined) profileData.gradeLevel = parsedBody.data.gradeLevel;

    const updated = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: ownership.minorId },
        data: userData,
      });
      const profile = await tx.minorProfile.update({
        where: { userId: ownership.minorId },
        data: profileData,
      });
      await tx.analyticsEvent.create({
        data: {
          userId: ownership.minorId,
          eventName: "minor_updated",
          metadata: {
            actor: actor(req),
            parentId: ownership.parentId,
            updatedFields: Object.keys(parsedBody.data),
          },
        },
      });
      return { user, profile };
    });

    res.json({
      id: updated.user.id,
      username: updated.user.username,
      age: updated.user.age,
      avatar: updated.user.avatarUrl,
      status: updated.user.status,
      gradeLevel: updated.profile.gradeLevel,
      interests: updated.profile.interests,
      updatedAt: updated.user.updatedAt,
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      res.status(409).json({ error: "El username ya está en uso." });
      return;
    }
    logError("minors.updateMinor", err, { actor: actor(req), minorId: ownership.minorId });
    res.status(500).json({ error: "No se pudo actualizar el menor." });
  }
}

export async function approveMinorActivity(req: Request, res: Response): Promise<void> {
  const ownership = await assertParentOwnsMinor(req, res);
  if (!ownership) return;

  const parsedBody = parseWithSchema(minorApprovalBodySchema, req.body, res);
  if (!parsedBody.ok) return;

  try {
    const parentUserId = await resolveParentUserId(ownership.parentId);
    if (!parentUserId) {
      res.status(400).json({ error: "No existe un perfil User de tipo parent para este tutor." });
      return;
    }

    const now = new Date();
    const approval = parsedBody.data.approvalId
      ? await prisma.activityApproval.update({
          where: { id: parsedBody.data.approvalId },
          data: { status: parsedBody.data.status, respondedAt: now },
        })
      : await prisma.activityApproval.create({
          data: {
            minorId: ownership.minorId,
            parentId: parentUserId,
            activityType: parsedBody.data.activityType ?? ActivityType.content_access,
            activityData: (parsedBody.data.activityData ?? {}) as Prisma.InputJsonValue,
            status: parsedBody.data.status,
            requestedAt: now,
            respondedAt: now,
          },
        });

    // Notificación al menor: evento persistido para que el cliente lo consulte.
    await prisma.analyticsEvent.create({
      data: {
        userId: ownership.minorId,
        eventName: "minor_activity_approval_updated",
        metadata: {
          actor: actor(req),
          approvalId: approval.id,
          status: approval.status,
          activityType: approval.activityType,
          notified: true,
          notifiedAt: now.toISOString(),
        },
      },
    });

    res.json(approval);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      res.status(404).json({ error: "Aprobación no encontrada." });
      return;
    }
    logError("minors.approveMinorActivity", err, { actor: actor(req), minorId: ownership.minorId });
    res.status(500).json({ error: "No se pudo procesar la aprobación." });
  }
}

export async function deleteMinor(req: Request, res: Response): Promise<void> {
  const ownership = await assertParentOwnsMinor(req, res);
  if (!ownership) return;

  try {
    const now = new Date();
    const purgeAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    await prisma.$transaction(async (tx) => {
      const snapshot = await tx.user.findUnique({
        where: { id: ownership.minorId },
        select: {
          id: true,
          username: true,
          age: true,
          avatarUrl: true,
          status: true,
          parentId: true,
          minorProfile: true,
        },
      });

      await tx.user.update({
        where: { id: ownership.minorId },
        data: {
          status: "inactive",
          parentAccountApprovedAt: null,
          expoPushToken: null,
        },
      });

      await tx.analyticsEvent.create({
        data: {
          userId: ownership.minorId,
          eventName: "minor_soft_deleted",
          metadata: {
            actor: actor(req),
            retentionDays: 30,
            purgeAfter: purgeAt.toISOString(),
            snapshot,
          },
        },
      });
    });

    res.status(204).send();
  } catch (err) {
    logError("minors.deleteMinor", err, { actor: actor(req), minorId: ownership.minorId });
    res.status(500).json({ error: "No se pudo desactivar el menor." });
  }
}
