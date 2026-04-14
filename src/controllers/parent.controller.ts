import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";
import { ContentFilterLevel, FriendStatus, Prisma } from "@prisma/client";
import { removeFriendshipPair } from "../lib/friendshipCleanup";
import { peekScreenTimeToday, utcDayStart } from "../lib/screenTime";
import { logError } from "../lib/logger";
import { prisma } from "../lib/prisma";
import { userPublicSelect } from "../lib/prismaPublicSelects";

const RECENT_POSTS_PER_CHILD = 8;
const RECENT_ACHIEVEMENTS_PER_CHILD = 6;

function utcDayEndExclusive(d = new Date()): Date {
  const s = utcDayStart(d);
  return new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate() + 1, 0, 0, 0, 0));
}

export async function getParentDashboard(req: Request, res: Response): Promise<void> {
  const parentId = req.params.id?.trim();
  if (!parentId) {
    res.status(400).json({ error: "id del padre/tutor es obligatorio." });
    return;
  }

  const auth = req.auth;
  if (auth?.kind !== "parent" || auth.parentId !== parentId) {
    res.status(403).json({ error: "No autorizado." });
    return;
  }

  try {
    const parent = await prisma.parent.findUnique({
      where: { id: parentId },
      select: {
        id: true,
        email: true,
        createdAt: true,
        children: {
          select: {
            id: true,
            username: true,
            realName: true,
            age: true,
            avatarUrl: true,
            level: true,
            experience: true,
            parentAccountApprovedAt: true,
            createdAt: true,
          },
          orderBy: { username: "asc" },
        },
      },
    });

    if (!parent) {
      res.status(404).json({ error: "Padre o tutor no encontrado." });
      return;
    }

    const todayStart = utcDayStart();
    const todayEnd = utcDayEndExclusive();

    const childIds = parent.children.map((c) => c.id);
    const awaitingRows =
      childIds.length === 0
        ? []
        : await prisma.friend.findMany({
            where: {
              friendId: { in: childIds },
              status: FriendStatus.AWAITING_PARENT,
              requiresParentApproval: true,
            },
            select: { id: true, userId: true, friendId: true, createdAt: true },
          });

    const senderIds = [...new Set(awaitingRows.map((r) => r.userId))];
    const senders =
      senderIds.length === 0
        ? []
        : await prisma.user.findMany({
            where: { id: { in: senderIds } },
            select: { id: true, username: true, realName: true },
          });
    const senderById = new Map(senders.map((s) => [s.id, s]));

    const pendingFriendsByChild = new Map<
      string,
      {
        friendshipId: string;
        senderUserId: string;
        senderUsername: string;
        senderRealName: string;
        createdAt: string;
      }[]
    >();
    for (const r of awaitingRows) {
      const s = senderById.get(r.userId);
      const entry = {
        friendshipId: r.id,
        senderUserId: r.userId,
        senderUsername: s?.username ?? "",
        senderRealName: s?.realName ?? "",
        createdAt: r.createdAt.toISOString(),
      };
      const arr = pendingFriendsByChild.get(r.friendId) ?? [];
      arr.push(entry);
      pendingFriendsByChild.set(r.friendId, arr);
    }

    const childrenPayload = await Promise.all(
      parent.children.map(async (child) => {
        const [
          screenPeek,
          missionsCompletedToday,
          achievementsUnlockedToday,
          recentPosts,
          settingsRow,
          recentAchievements,
        ] = await Promise.all([
          peekScreenTimeToday(child.id),
          prisma.userMission.count({
            where: {
              userId: child.id,
              date: todayStart,
              completed: true,
            },
          }),
          prisma.userAchievement.count({
            where: {
              userId: child.id,
              obtainedAt: { gte: todayStart, lt: todayEnd },
            },
          }),
          prisma.post.findMany({
            where: { userId: child.id },
            orderBy: { createdAt: "desc" },
            take: RECENT_POSTS_PER_CHILD,
            select: {
              id: true,
              content: true,
              imageUrl: true,
              videoUrl: true,
              mediaModerationFlagged: true,
              mediaModerationNote: true,
              parentModerationVisibleAt: true,
              parentModerationVisibleById: true,
              type: true,
              visibility: true,
              category: true,
              createdAt: true,
            },
          }),
          prisma.parentSettings.findUnique({
            where: { childId: child.id },
            select: {
              allowPosting: true,
              allowFriends: true,
              chatEnabled: true,
              parentChatSupervisionEnabled: true,
              notifyParentNewContact: true,
              notifyParentSuspiciousChat: true,
              dailyScreenTimeLimit: true,
              contentFilterLevel: true,
            },
          }),
          prisma.userAchievement.findMany({
            where: { userId: child.id },
            orderBy: { obtainedAt: "desc" },
            take: RECENT_ACHIEVEMENTS_PER_CHILD,
            select: {
              id: true,
              obtainedAt: true,
              achievement: {
                select: { title: true, badgeIcon: true, rarity: true },
              },
            },
          }),
        ]);

        const time = screenPeek ?? { usedTodaySeconds: 0, dailyLimitMinutes: 120 };
        const settings = settingsRow ?? {
          allowPosting: true,
          allowFriends: true,
          chatEnabled: true,
          parentChatSupervisionEnabled: true,
          notifyParentNewContact: true,
          notifyParentSuspiciousChat: true,
          dailyScreenTimeLimit: 120,
          contentFilterLevel: ContentFilterLevel.MEDIUM,
        };

        return {
          child: {
            id: child.id,
            username: child.username,
            realName: child.realName,
            age: child.age,
            avatarUrl: child.avatarUrl,
            level: child.level,
            experience: child.experience,
            parentAccountApprovedAt: child.parentAccountApprovedAt?.toISOString() ?? null,
            createdAt: child.createdAt.toISOString(),
          },
          pendingFriendApprovals: pendingFriendsByChild.get(child.id) ?? [],
          timeSpentTodaySeconds: time.usedTodaySeconds,
          dailyScreenLimitMinutes: time.dailyLimitMinutes,
          missionsCompletedToday,
          achievementsUnlockedToday,
          settings: {
            allowPosting: settings.allowPosting,
            allowFriends: settings.allowFriends,
            chatEnabled: settings.chatEnabled,
            parentChatSupervisionEnabled: settings.parentChatSupervisionEnabled,
            notifyParentNewContact: settings.notifyParentNewContact,
            notifyParentSuspiciousChat: settings.notifyParentSuspiciousChat,
            dailyScreenTimeLimit: settings.dailyScreenTimeLimit,
            contentFilterLevel: settings.contentFilterLevel,
          },
          recentPosts: recentPosts.map((p) => ({
            id: p.id,
            content: p.content,
            imageUrl: p.imageUrl,
            videoUrl: p.videoUrl,
            mediaModerationFlagged: p.mediaModerationFlagged,
            mediaModerationNote: p.mediaModerationNote,
            parentModerationVisibleAt: p.parentModerationVisibleAt?.toISOString() ?? null,
            parentModerationVisibleById: p.parentModerationVisibleById,
            type: p.type,
            visibility: p.visibility,
            ...(p.category != null && String(p.category).trim() !== ""
              ? { category: String(p.category).trim() }
              : {}),
            createdAt: p.createdAt.toISOString(),
          })),
          recentAchievements: recentAchievements.map((a) => ({
            id: a.id,
            title: a.achievement.title,
            badgeIcon: a.achievement.badgeIcon,
            rarity: a.achievement.rarity,
            obtainedAt: a.obtainedAt.toISOString(),
          })),
        };
      })
    );

    const familyEvents = await prisma.parentFamilyEvent.findMany({
      where: { parentId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        kind: true,
        childId: true,
        peerUserId: true,
        title: true,
        body: true,
        createdAt: true,
      },
    });

    res.json({
      parent: {
        id: parent.id,
        email: parent.email,
        createdAt: parent.createdAt.toISOString(),
      },
      dateUtc: todayStart.toISOString().slice(0, 10),
      children: childrenPayload,
      familyEvents: familyEvents.map((e) => ({
        id: e.id,
        kind: e.kind,
        childId: e.childId,
        peerUserId: e.peerUserId,
        title: e.title,
        body: e.body,
        createdAt: e.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    logError("parent", err);
    res.status(500).json({ error: "Error al obtener el panel del padre/tutor." });
  }
}

/** Aprueba la cuenta del menor: podrá iniciar sesión y usar la API como hijo. */
export async function approveChildAccount(req: Request, res: Response): Promise<void> {
  const parentId = req.params.id?.trim();
  const childId = req.params.childId?.trim();
  if (!parentId || !childId) {
    res.status(400).json({ error: "id del padre y childId del menor son obligatorios." });
    return;
  }

  const auth = req.auth;
  if (auth?.kind !== "parent" || auth.parentId !== parentId) {
    res.status(403).json({ error: "No autorizado." });
    return;
  }

  try {
    const child = await prisma.user.findUnique({
      where: { id: childId },
      select: { id: true, parentId: true },
    });
    if (!child || child.parentId !== parentId) {
      res.status(404).json({ error: "Menor no encontrado o no vinculado a tu cuenta." });
      return;
    }

    const updated = await prisma.user.update({
      where: { id: childId },
      data: { parentAccountApprovedAt: new Date() },
      select: userPublicSelect,
    });

    res.json({ ok: true, user: updated });
  } catch (err) {
    logError("parent.approveChildAccount", err);
    res.status(500).json({ error: "Error al aprobar la cuenta del menor." });
  }
}

export async function patchChildParentSettings(req: Request, res: Response): Promise<void> {
  const parentId = req.params.id?.trim();
  const childId = req.params.childId?.trim();
  if (!parentId || !childId) {
    res.status(400).json({ error: "id del padre y childId del menor son obligatorios." });
    return;
  }

  const auth = req.auth;
  if (auth?.kind !== "parent" || auth.parentId !== parentId) {
    res.status(403).json({ error: "No autorizado." });
    return;
  }

  if (req.body === null || typeof req.body !== "object") {
    res.status(400).json({ error: "El cuerpo debe ser un objeto JSON." });
    return;
  }

  const b = req.body as Record<string, unknown>;
  const patch: {
    allowPosting?: boolean;
    allowFriends?: boolean;
    chatEnabled?: boolean;
    parentChatSupervisionEnabled?: boolean;
    notifyParentNewContact?: boolean;
    notifyParentSuspiciousChat?: boolean;
  } = {};
  if (b.allowPosting !== undefined) {
    if (typeof b.allowPosting !== "boolean") {
      res.status(400).json({ error: "allowPosting debe ser booleano." });
      return;
    }
    patch.allowPosting = b.allowPosting;
  }
  if (b.allowFriends !== undefined) {
    if (typeof b.allowFriends !== "boolean") {
      res.status(400).json({ error: "allowFriends debe ser booleano." });
      return;
    }
    patch.allowFriends = b.allowFriends;
  }
  if (b.chatEnabled !== undefined) {
    if (typeof b.chatEnabled !== "boolean") {
      res.status(400).json({ error: "chatEnabled debe ser booleano." });
      return;
    }
    patch.chatEnabled = b.chatEnabled;
  }
  if (b.parentChatSupervisionEnabled !== undefined) {
    if (typeof b.parentChatSupervisionEnabled !== "boolean") {
      res.status(400).json({ error: "parentChatSupervisionEnabled debe ser booleano." });
      return;
    }
    patch.parentChatSupervisionEnabled = b.parentChatSupervisionEnabled;
  }
  if (b.notifyParentNewContact !== undefined) {
    if (typeof b.notifyParentNewContact !== "boolean") {
      res.status(400).json({ error: "notifyParentNewContact debe ser booleano." });
      return;
    }
    patch.notifyParentNewContact = b.notifyParentNewContact;
  }
  if (b.notifyParentSuspiciousChat !== undefined) {
    if (typeof b.notifyParentSuspiciousChat !== "boolean") {
      res.status(400).json({ error: "notifyParentSuspiciousChat debe ser booleano." });
      return;
    }
    patch.notifyParentSuspiciousChat = b.notifyParentSuspiciousChat;
  }

  if (Object.keys(patch).length === 0) {
    res.status(400).json({
      error:
        "Incluí al menos un campo booleano: allowPosting, allowFriends, chatEnabled, parentChatSupervisionEnabled, notifyParentNewContact, notifyParentSuspiciousChat.",
    });
    return;
  }

  try {
    const child = await prisma.user.findUnique({
      where: { id: childId },
      select: { id: true, parentId: true },
    });
    if (!child) {
      res.status(404).json({ error: "Menor no encontrado." });
      return;
    }
    if (child.parentId !== parentId) {
      res.status(403).json({ error: "Este menor no pertenece a ese padre o tutor." });
      return;
    }

    const row = await prisma.parentSettings.upsert({
      where: { childId },
      create: {
        id: randomUUID(),
        parentId,
        childId,
        dailyScreenTimeLimit: 120,
        allowPosting: patch.allowPosting ?? true,
        allowFriends: patch.allowFriends ?? true,
        chatEnabled: patch.chatEnabled ?? true,
        parentChatSupervisionEnabled: patch.parentChatSupervisionEnabled ?? true,
        notifyParentNewContact: patch.notifyParentNewContact ?? true,
        notifyParentSuspiciousChat: patch.notifyParentSuspiciousChat ?? true,
        contentFilterLevel: ContentFilterLevel.MEDIUM,
      },
      update: patch,
      select: {
        allowPosting: true,
        allowFriends: true,
        chatEnabled: true,
        parentChatSupervisionEnabled: true,
        notifyParentNewContact: true,
        notifyParentSuspiciousChat: true,
      },
    });

    res.json({
      childId,
      allowPosting: row.allowPosting,
      allowFriends: row.allowFriends,
      chatEnabled: row.chatEnabled,
      parentChatSupervisionEnabled: row.parentChatSupervisionEnabled,
      notifyParentNewContact: row.notifyParentNewContact,
      notifyParentSuspiciousChat: row.notifyParentSuspiciousChat,
    });
  } catch (err) {
    logError("parent", err);
    res.status(500).json({ error: "Error al actualizar la configuración parental." });
  }
}

const CONTENT_FILTER_LEVELS = new Set<string>(["LOW", "MEDIUM", "HIGH"]);

/** PATCH controles avanzados: límite de pantalla y filtro de contenido (requiere premium en ruta). */
export async function patchChildParentAdvancedSettings(req: Request, res: Response): Promise<void> {
  const parentId = req.params.id?.trim();
  const childId = req.params.childId?.trim();
  if (!parentId || !childId) {
    res.status(400).json({ error: "id del padre y childId del menor son obligatorios." });
    return;
  }

  const auth = req.auth;
  if (auth?.kind !== "parent" || auth.parentId !== parentId) {
    res.status(403).json({ error: "No autorizado." });
    return;
  }

  if (req.body === null || typeof req.body !== "object") {
    res.status(400).json({ error: "El cuerpo debe ser un objeto JSON." });
    return;
  }

  const b = req.body as Record<string, unknown>;
  const patch: { dailyScreenTimeLimit?: number; contentFilterLevel?: ContentFilterLevel } = {};

  if (b.dailyScreenTimeLimit !== undefined) {
    const raw = b.dailyScreenTimeLimit;
    const n = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > 24 * 60) {
      res.status(400).json({ error: "dailyScreenTimeLimit debe ser un entero entre 1 y 1440 (minutos)." });
      return;
    }
    patch.dailyScreenTimeLimit = n;
  }

  if (b.contentFilterLevel !== undefined) {
    if (typeof b.contentFilterLevel !== "string") {
      res.status(400).json({ error: "contentFilterLevel debe ser un texto (LOW | MEDIUM | HIGH)." });
      return;
    }
    const lvl = b.contentFilterLevel.trim().toUpperCase();
    if (!CONTENT_FILTER_LEVELS.has(lvl)) {
      res.status(400).json({ error: "contentFilterLevel debe ser LOW, MEDIUM o HIGH." });
      return;
    }
    patch.contentFilterLevel = ContentFilterLevel[lvl as keyof typeof ContentFilterLevel];
  }

  if (Object.keys(patch).length === 0) {
    res.status(400).json({ error: "Incluí dailyScreenTimeLimit y/o contentFilterLevel." });
    return;
  }

  try {
    const child = await prisma.user.findUnique({
      where: { id: childId },
      select: { id: true, parentId: true },
    });
    if (!child) {
      res.status(404).json({ error: "Menor no encontrado." });
      return;
    }
    if (child.parentId !== parentId) {
      res.status(403).json({ error: "Este menor no pertenece a ese padre o tutor." });
      return;
    }

    const row = await prisma.parentSettings.upsert({
      where: { childId },
      create: {
        id: randomUUID(),
        parentId,
        childId,
        dailyScreenTimeLimit: patch.dailyScreenTimeLimit ?? 120,
        allowPosting: true,
        allowFriends: true,
        chatEnabled: true,
        parentChatSupervisionEnabled: true,
        notifyParentNewContact: true,
        notifyParentSuspiciousChat: true,
        contentFilterLevel: patch.contentFilterLevel ?? ContentFilterLevel.MEDIUM,
      },
      update: patch,
      select: {
        dailyScreenTimeLimit: true,
        contentFilterLevel: true,
      },
    });

    res.json({
      childId,
      dailyScreenTimeLimit: row.dailyScreenTimeLimit,
      contentFilterLevel: row.contentFilterLevel,
    });
  } catch (err) {
    logError("parent", err);
    res.status(500).json({ error: "Error al actualizar los controles parentales avanzados." });
  }
}

const CHILD_CHAT_MONITOR_LIMIT_MAX = 200;

/** Supervisión: mensajes donde el hijo es emisor o receptor (incluye bloqueados y texto de auditoría). */
export async function getChildChatMessages(req: Request, res: Response): Promise<void> {
  const parentId = req.params.id?.trim();
  const childId = req.params.childId?.trim();
  if (!parentId || !childId) {
    res.status(400).json({ error: "id del padre y childId del menor son obligatorios." });
    return;
  }

  const auth = req.auth;
  if (auth?.kind !== "parent" || auth.parentId !== parentId) {
    res.status(403).json({ error: "No autorizado." });
    return;
  }

  const rawLimit = req.query.limit;
  let limit = 80;
  if (rawLimit != null && rawLimit !== "") {
    const n = typeof rawLimit === "string" ? Number(rawLimit) : Number(Array.isArray(rawLimit) ? rawLimit[0] : rawLimit);
    if (Number.isFinite(n) && Number.isInteger(n) && n >= 1) {
      limit = Math.min(CHILD_CHAT_MONITOR_LIMIT_MAX, n);
    }
  }

  try {
    const child = await prisma.user.findUnique({
      where: { id: childId },
      select: { id: true, parentId: true },
    });
    if (!child) {
      res.status(404).json({ error: "Menor no encontrado." });
      return;
    }
    if (child.parentId !== parentId) {
      res.status(403).json({ error: "Este menor no pertenece a ese padre o tutor." });
      return;
    }

    const supervision = await prisma.parentSettings.findUnique({
      where: { childId },
      select: { parentChatSupervisionEnabled: true },
    });
    if (supervision && !supervision.parentChatSupervisionEnabled) {
      res.status(403).json({
        error:
          "La supervisión de mensajes está desactivada para este menor. Podés activarla en controles parentales del panel.",
      });
      return;
    }

    const rows = await prisma.chatMessage.findMany({
      where: {
        OR: [{ senderId: childId }, { recipientId: childId }],
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        senderId: true,
        recipientId: true,
        body: true,
        blocked: true,
        blockReason: true,
        auditPlain: true,
        moderationFlagged: true,
        createdAt: true,
      },
    });

    const userIds = new Set<string>();
    for (const r of rows) {
      userIds.add(r.senderId);
      userIds.add(r.recipientId);
    }
    const users = await prisma.user.findMany({
      where: { id: { in: Array.from(userIds) } },
      select: { id: true, username: true, realName: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));

    res.json({
      childId,
      messages: rows.map((m) => {
        const s = byId.get(m.senderId);
        const t = byId.get(m.recipientId);
        return {
          id: m.id,
          createdAt: m.createdAt.toISOString(),
          senderId: m.senderId,
          recipientId: m.recipientId,
          senderUsername: s?.username ?? null,
          recipientUsername: t?.username ?? null,
          deliveredBody: m.body,
          blocked: m.blocked,
          blockReason: m.blockReason,
          auditPlain: m.auditPlain,
          moderationFlagged: m.moderationFlagged,
        };
      }),
    });
  } catch (err) {
    logError("parent", err);
    res.status(500).json({ error: "Error al obtener los mensajes de chat del menor." });
  }
}

export async function postParentPushToken(req: Request, res: Response): Promise<void> {
  const parentId = req.params.id?.trim();
  if (!parentId) {
    res.status(400).json({ error: "id del padre/tutor es obligatorio." });
    return;
  }

  const auth = req.auth;
  if (auth?.kind !== "parent" || auth.parentId !== parentId) {
    res.status(403).json({ error: "No autorizado." });
    return;
  }

  const body = req.body as { token?: unknown };
  const raw = body.token;

  try {
    if (raw === null || raw === undefined) {
      await prisma.parent.update({
        where: { id: parentId },
        data: { expoPushToken: null },
      });
      res.status(204).send();
      return;
    }

    if (typeof raw !== "string") {
      res.status(400).json({ error: "token debe ser un string o null." });
      return;
    }

    const trimmed = raw.trim();
    if (trimmed.length === 0) {
      await prisma.parent.update({
        where: { id: parentId },
        data: { expoPushToken: null },
      });
      res.status(204).send();
      return;
    }

    if (trimmed.length > 8000) {
      res.status(400).json({ error: "token demasiado largo." });
      return;
    }

    await prisma.parent.update({
      where: { id: parentId },
      data: { expoPushToken: trimmed },
    });
    res.status(204).send();
  } catch (err) {
    logError("parent", err);
    res.status(500).json({ error: "Error al guardar el token de notificaciones." });
  }
}

/** Amigos aceptados del menor (vista tutor). */
export async function getChildFriendsForParent(req: Request, res: Response): Promise<void> {
  const parentId = req.params.id?.trim();
  const childId = req.params.childId?.trim();
  if (!parentId || !childId) {
    res.status(400).json({ error: "id del padre y childId del menor son obligatorios." });
    return;
  }

  const auth = req.auth;
  if (auth?.kind !== "parent" || auth.parentId !== parentId) {
    res.status(403).json({ error: "No autorizado." });
    return;
  }

  try {
    const child = await prisma.user.findUnique({
      where: { id: childId },
      select: { id: true, parentId: true },
    });
    if (!child) {
      res.status(404).json({ error: "Menor no encontrado." });
      return;
    }
    if (child.parentId !== parentId) {
      res.status(403).json({ error: "Este menor no pertenece a ese padre o tutor." });
      return;
    }

    const rows = await prisma.friend.findMany({
      where: {
        status: FriendStatus.ACCEPTED,
        OR: [{ userId: childId }, { friendId: childId }],
      },
      orderBy: { createdAt: "desc" },
    });

    const seenOther = new Set<string>();
    const dedupedRows: typeof rows = [];
    for (const r of rows) {
      const otherId = r.userId === childId ? r.friendId : r.userId;
      if (seenOther.has(otherId)) continue;
      seenOther.add(otherId);
      dedupedRows.push(r);
    }

    const uniqueIds = dedupedRows.map((r) => (r.userId === childId ? r.friendId : r.userId));
    const users = await prisma.user.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true, username: true, avatarUrl: true, realName: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));

    const friends = dedupedRows.map((r) => {
      const otherId = r.userId === childId ? r.friendId : r.userId;
      return {
        friendshipId: r.id,
        since: r.createdAt.toISOString(),
        friend: byId.get(otherId) ?? { id: otherId },
      };
    });

    res.json({ childId, friends });
  } catch (err) {
    logError("parent", err);
    res.status(500).json({ error: "Error al listar amigos del menor." });
  }
}

export async function listChildBlockedUsers(req: Request, res: Response): Promise<void> {
  const parentId = req.params.id?.trim();
  const childId = req.params.childId?.trim();
  if (!parentId || !childId) {
    res.status(400).json({ error: "id del padre y childId del menor son obligatorios." });
    return;
  }

  const auth = req.auth;
  if (auth?.kind !== "parent" || auth.parentId !== parentId) {
    res.status(403).json({ error: "No autorizado." });
    return;
  }

  try {
    const child = await prisma.user.findUnique({
      where: { id: childId },
      select: { id: true, parentId: true },
    });
    if (!child) {
      res.status(404).json({ error: "Menor no encontrado." });
      return;
    }
    if (child.parentId !== parentId) {
      res.status(403).json({ error: "Este menor no pertenece a ese padre o tutor." });
      return;
    }

    const blocks = await prisma.parentUserBlock.findMany({
      where: { childId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        blockedUserId: true,
        createdAt: true,
        blockedUser: {
          select: { id: true, username: true, realName: true, avatarUrl: true },
        },
      },
    });

    res.json({
      childId,
      blocked: blocks.map((b) => ({
        id: b.id,
        blockedUserId: b.blockedUserId,
        createdAt: b.createdAt.toISOString(),
        user: b.blockedUser,
      })),
    });
  } catch (err) {
    logError("parent", err);
    res.status(500).json({ error: "Error al listar usuarios bloqueados." });
  }
}

export async function postBlockUserForChild(req: Request, res: Response): Promise<void> {
  const parentId = req.params.id?.trim();
  const childId = req.params.childId?.trim();
  if (!parentId || !childId) {
    res.status(400).json({ error: "id del padre y childId del menor son obligatorios." });
    return;
  }

  const auth = req.auth;
  if (auth?.kind !== "parent" || auth.parentId !== parentId) {
    res.status(403).json({ error: "No autorizado." });
    return;
  }

  if (req.body === null || typeof req.body !== "object") {
    res.status(400).json({ error: "El cuerpo debe ser un objeto JSON." });
    return;
  }
  const b = req.body as Record<string, unknown>;
  const blockedUserIdRaw = typeof b.blockedUserId === "string" ? b.blockedUserId.trim() : "";
  const usernameRaw = typeof b.username === "string" ? b.username.trim() : "";

  try {
    const child = await prisma.user.findUnique({
      where: { id: childId },
      select: { id: true, parentId: true },
    });
    if (!child) {
      res.status(404).json({ error: "Menor no encontrado." });
      return;
    }
    if (child.parentId !== parentId) {
      res.status(403).json({ error: "Este menor no pertenece a ese padre o tutor." });
      return;
    }

    let blockedUserId = blockedUserIdRaw;
    if (!blockedUserId && usernameRaw) {
      const u = await prisma.user.findFirst({
        where: { username: { equals: usernameRaw, mode: "insensitive" } },
        select: { id: true },
      });
      blockedUserId = u?.id ?? "";
    }

    if (!blockedUserId) {
      res.status(400).json({ error: "Indicá blockedUserId o username del usuario a bloquear." });
      return;
    }

    if (blockedUserId === childId) {
      res.status(400).json({ error: "No podés bloquear al propio menor." });
      return;
    }

    const target = await prisma.user.findUnique({
      where: { id: blockedUserId },
      select: { id: true, username: true },
    });
    if (!target) {
      res.status(404).json({ error: "Usuario a bloquear no encontrado." });
      return;
    }

    await prisma.parentUserBlock.upsert({
      where: {
        childId_blockedUserId: { childId, blockedUserId },
      },
      create: {
        parentId,
        childId,
        blockedUserId,
      },
      update: {},
    });

    await removeFriendshipPair(childId, blockedUserId);

    res.status(201).json({
      childId,
      blockedUserId,
      username: target.username,
    });
  } catch (err) {
    logError("parent", err);
    res.status(500).json({ error: "Error al bloquear al usuario." });
  }
}

export async function unblockUserForChild(req: Request, res: Response): Promise<void> {
  const parentId = req.params.id?.trim();
  const childId = req.params.childId?.trim();
  const blockedUserId = req.params.blockedUserId?.trim();
  if (!parentId || !childId || !blockedUserId) {
    res.status(400).json({ error: "id del padre, childId y blockedUserId son obligatorios." });
    return;
  }

  const auth = req.auth;
  if (auth?.kind !== "parent" || auth.parentId !== parentId) {
    res.status(403).json({ error: "No autorizado." });
    return;
  }

  try {
    const child = await prisma.user.findUnique({
      where: { id: childId },
      select: { id: true, parentId: true },
    });
    if (!child) {
      res.status(404).json({ error: "Menor no encontrado." });
      return;
    }
    if (child.parentId !== parentId) {
      res.status(403).json({ error: "Este menor no pertenece a ese padre o tutor." });
      return;
    }

    const del = await prisma.parentUserBlock.deleteMany({
      where: { childId, blockedUserId, parentId },
    });

    if (del.count === 0) {
      res.status(404).json({ error: "No hay bloqueo registrado para ese usuario." });
      return;
    }

    res.status(204).send();
  } catch (err) {
    logError("parent", err);
    res.status(500).json({ error: "Error al quitar el bloqueo." });
  }
}
