import { prisma } from "./prisma";

/**
 * Sin fila en `ParentSettings` → sin restricción extra (valores por defecto permisivos del producto).
 */
export async function assertAllowPosting(
  childUserId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const settings = await prisma.parentSettings.findUnique({
    where: { childId: childUserId },
    select: { allowPosting: true },
  });
  if (!settings || settings.allowPosting) {
    return { ok: true };
  }
  return {
    ok: false,
    message: "Publicar no está permitido por configuración parental.",
  };
}

export async function assertAllowFriends(
  childUserId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const settings = await prisma.parentSettings.findUnique({
    where: { childId: childUserId },
    select: { allowFriends: true },
  });
  if (!settings || settings.allowFriends) {
    return { ok: true };
  }
  return {
    ok: false,
    message: "Agregar amigos no está permitido por configuración parental.",
  };
}

export async function assertAllowChat(
  childUserId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const settings = await prisma.parentSettings.findUnique({
    where: { childId: childUserId },
    select: { chatEnabled: true },
  });
  if (!settings || settings.chatEnabled) {
    return { ok: true };
  }
  return {
    ok: false,
    message: "El chat no está permitido por configuración parental.",
  };
}
