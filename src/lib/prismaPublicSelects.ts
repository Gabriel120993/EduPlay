import type { Prisma } from "@prisma/client";

/** Campos de `User` seguros para respuestas HTTP (sin `passwordHash` ni `expoPushToken`). */
export const userPublicSelect = {
  id: true,
  username: true,
  realName: true,
  age: true,
  avatarUrl: true,
  profileImageUrl: true,
  level: true,
  experience: true,
  parentId: true,
  onboardingCompletedAt: true,
  onboardingFirstAction: true,
  notificationsEnabled: true,
  notificationSoundsEnabled: true,
  parentAccountApprovedAt: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export const userIdOnlySelect = { id: true } satisfies Prisma.UserSelect;

export const parentIdOnlySelect = { id: true } satisfies Prisma.ParentSelect;

export const postIdOnlySelect = { id: true } satisfies Prisma.PostSelect;
