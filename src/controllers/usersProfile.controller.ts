import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { logError } from "../lib/logger";
import { prisma } from "../lib/prisma";
import { formatZodError, minorAvatarUpdateSchema, passwordSchema } from "../lib/validation/schemas";

const updateProfileSchema = z
  .object({
    realName: z.string().trim().min(1).max(200).optional(),
    username: z
      .string()
      .trim()
      .min(1)
      .max(64)
      .regex(/^[a-zA-Z0-9_.-]+$/)
      .optional(),
    notificationsEnabled: z.boolean().optional(),
    notificationSoundsEnabled: z.boolean().optional(),
    achievementsPublicOnProfile: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "Debés enviar al menos un campo." });

const avatarBodySchema = z.object({
  avatarUrl: minorAvatarUpdateSchema,
});

export async function getMyFullProfile(req: Request, res: Response): Promise<void> {
  const auth = req.auth;
  if (!auth) {
    res.status(401).json({ error: "No autenticado." });
    return;
  }

  try {
    if (auth.kind === "parent") {
      const [parent, parentUser] = await Promise.all([
        prisma.parent.findUnique({
          where: { id: auth.parentId },
          select: {
            id: true,
            email: true,
            isPremium: true,
            premiumUntil: true,
            createdAt: true,
            expoPushToken: true,
          },
        }),
        prisma.user.findFirst({
          where: { parentId: auth.parentId, type: "parent" },
          select: {
            id: true,
            username: true,
            realName: true,
            avatarUrl: true,
            profileImageUrl: true,
            status: true,
            notificationsEnabled: true,
            notificationSoundsEnabled: true,
            createdAt: true,
          },
          orderBy: { createdAt: "asc" },
        }),
      ]);
      if (!parent) {
        res.status(404).json({ error: "Cuenta no encontrada." });
        return;
      }
      res.json({
        role: "parent" as const,
        parent,
        user: parentUser,
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      include: {
        minorProfile: true,
        parent: { select: { id: true, email: true } },
      },
    });
    if (!user) {
      res.status(404).json({ error: "Usuario no encontrado." });
      return;
    }

    res.json({
      role: "child" as const,
      user: {
        id: user.id,
        username: user.username,
        realName: user.realName,
        age: user.age,
        avatarUrl: user.avatarUrl,
        profileImageUrl: user.profileImageUrl,
        level: user.level,
        experience: user.experience,
        quizCoins: user.quizCoins,
        status: user.status,
        parentAccountApprovedAt: user.parentAccountApprovedAt,
        notificationsEnabled: user.notificationsEnabled,
        notificationSoundsEnabled: user.notificationSoundsEnabled,
        achievementsPublicOnProfile: user.achievementsPublicOnProfile,
        onboardingCompletedAt: user.onboardingCompletedAt,
        createdAt: user.createdAt,
        parent: user.parent,
        minorProfile: user.minorProfile,
      },
    });
  } catch (e) {
    logError("usersProfile.getMyFullProfile", e);
    res.status(500).json({ error: "Error al cargar el perfil." });
  }
}

export async function putMyProfile(req: Request, res: Response): Promise<void> {
  const auth = req.auth;
  if (!auth) {
    res.status(401).json({ error: "No autenticado." });
    return;
  }

  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }

  try {
    if (auth.kind === "parent") {
      const parentUser = await prisma.user.findFirst({
        where: { parentId: auth.parentId, type: "parent" },
        select: { id: true },
        orderBy: { createdAt: "asc" },
      });
      if (!parentUser) {
        res.status(400).json({ error: "No existe perfil de usuario tutor." });
        return;
      }
      const data: Prisma.UserUpdateInput = {};
      if (parsed.data.realName != null) data.realName = parsed.data.realName;
      if (parsed.data.username != null) data.username = parsed.data.username;
      if (parsed.data.notificationsEnabled != null) data.notificationsEnabled = parsed.data.notificationsEnabled;
      if (parsed.data.notificationSoundsEnabled != null) {
        data.notificationSoundsEnabled = parsed.data.notificationSoundsEnabled;
      }
      if (parsed.data.achievementsPublicOnProfile != null) {
        data.achievementsPublicOnProfile = parsed.data.achievementsPublicOnProfile;
      }
      const updated = await prisma.user.update({
        where: { id: parentUser.id },
        data,
        select: { id: true, username: true, realName: true, avatarUrl: true, status: true },
      });
      res.json({ profile: updated });
      return;
    }

    const data: Prisma.UserUpdateInput = {};
    if (parsed.data.realName != null) data.realName = parsed.data.realName;
    if (parsed.data.username != null) data.username = parsed.data.username;
    if (parsed.data.notificationsEnabled != null) data.notificationsEnabled = parsed.data.notificationsEnabled;
    if (parsed.data.notificationSoundsEnabled != null) {
      data.notificationSoundsEnabled = parsed.data.notificationSoundsEnabled;
    }
    if (parsed.data.achievementsPublicOnProfile != null) {
      data.achievementsPublicOnProfile = parsed.data.achievementsPublicOnProfile;
    }
    const updated = await prisma.user.update({
      where: { id: auth.userId },
      data,
      select: {
        id: true,
        username: true,
        realName: true,
        avatarUrl: true,
        status: true,
        notificationsEnabled: true,
        notificationSoundsEnabled: true,
        achievementsPublicOnProfile: true,
      },
    });
    res.json({ profile: updated });
  } catch (e) {
    logError("usersProfile.putMyProfile", e);
    res.status(500).json({ error: "Error al actualizar el perfil." });
  }
}

export async function putMyAvatar(req: Request, res: Response): Promise<void> {
  const auth = req.auth;
  if (!auth) {
    res.status(401).json({ error: "No autenticado." });
    return;
  }

  const parsed = avatarBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }

  try {
    if (auth.kind === "parent") {
      const parentUser = await prisma.user.findFirst({
        where: { parentId: auth.parentId, type: "parent" },
        select: { id: true },
        orderBy: { createdAt: "asc" },
      });
      if (!parentUser) {
        res.status(400).json({ error: "No existe perfil de usuario tutor." });
        return;
      }
      const updated = await prisma.user.update({
        where: { id: parentUser.id },
        data: { avatarUrl: parsed.data.avatarUrl ?? null },
        select: { id: true, avatarUrl: true },
      });
      res.json({ avatarUrl: updated.avatarUrl });
      return;
    }

    const updated = await prisma.user.update({
      where: { id: auth.userId },
      data: { avatarUrl: parsed.data.avatarUrl ?? null },
      select: { id: true, avatarUrl: true },
    });
    res.json({ avatarUrl: updated.avatarUrl });
  } catch (e) {
    logError("usersProfile.putMyAvatar", e);
    res.status(500).json({ error: "Error al actualizar el avatar." });
  }
}

const deleteAccountSchema = z.object({
  confirm: z.literal(true),
  password: passwordSchema.optional(),
});

/**
 * Baja lógica: marca `User.status = inactive`. Para tutores también invalida sesión futura vía email/password existentes.
 */
export async function deleteMyAccount(req: Request, res: Response): Promise<void> {
  const auth = req.auth;
  if (!auth) {
    res.status(401).json({ error: "No autenticado." });
    return;
  }

  const parsed = deleteAccountSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: formatZodError(parsed.error) });
    return;
  }

  try {
    if (auth.kind === "parent") {
      const parent = await prisma.parent.findUnique({
        where: { id: auth.parentId },
        select: { id: true, password: true, email: true },
      });
      if (!parent) {
        res.status(404).json({ error: "Cuenta no encontrada." });
        return;
      }
      if (parsed.data.password) {
        const ok = await bcrypt.compare(parsed.data.password, parent.password);
        if (!ok) {
          res.status(403).json({ error: "Contraseña incorrecta." });
          return;
        }
      }

      await prisma.$transaction(async (tx) => {
        await tx.user.updateMany({
          where: { parentId: parent.id },
          data: { status: "inactive" },
        });
      });
      res.status(204).send();
      return;
    }

    await prisma.user.update({
      where: { id: auth.userId },
      data: { status: "inactive" },
    });
    res.status(204).send();
  } catch (e) {
    logError("usersProfile.deleteMyAccount", e);
    res.status(500).json({ error: "Error al eliminar la cuenta." });
  }
}
