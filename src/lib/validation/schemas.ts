import { z } from "zod";
import { sanitizeUserPlainText } from "../sanitizeUserInput";

const PASSWORD_MIN = 6;
const PASSWORD_MAX = 128;
const USERNAME_MAX = 64;
const REAL_NAME_MAX = 200;
const EMAIL_MAX = 320;

/** Identificador UUID (validación estricta de formato). */
export const uuidSchema = z.string().trim().uuid("Debe ser un UUID válido.");

/** Email normalizado (minúsculas, trim). */
export const emailSchema = z
  .string()
  .trim()
  .min(1, "El email es obligatorio.")
  .max(EMAIL_MAX, "El email es demasiado largo.")
  .email("El email no tiene un formato válido.")
  .transform((s) => s.toLowerCase());

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres.`)
  .max(PASSWORD_MAX, "La contraseña es demasiado larga.");

/**
 * Nombre de usuario (login del menor): letras, números, punto, guiones.
 * Alineado con usernames típicos en la app (p. ej. `lucia_explora`).
 */
export const usernameSchema = z
  .string()
  .trim()
  .min(1, "El usuario es obligatorio.")
  .max(USERNAME_MAX, "El usuario es demasiado largo.")
  .regex(
    /^[a-zA-Z0-9_.-]+$/,
    "El usuario solo puede incluir letras, números, punto, guiones y guión bajo."
  );

export const parentCredentialsSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const childLoginSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

/** Mismas reglas que `parentCredentialsSchema` (registro tutor vía `POST /api/auth/register` o alias `POST /api/parents`). */
export const createParentBodySchema = parentCredentialsSchema;

/** Alta de menor por el tutor: contraseña en claro solo en tránsito; el servidor guarda hash bcrypt. */
export const createChildUserBodySchema = z.object({
  username: usernameSchema,
  realName: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio.")
    .max(REAL_NAME_MAX, "El nombre es demasiado largo.")
    .transform((s) => sanitizeUserPlainText(s, REAL_NAME_MAX))
    .refine((s) => s.trim().length >= 1, { message: "El nombre no puede quedar vacío." }),
  age: z.coerce.number().int().min(0, "age debe ser un número entero mayor o igual a 0."),
  parentId: uuidSchema,
  password: passwordSchema,
});

/** Par de usuarios en flujos de amistad (cuerpo JSON). */
export const friendUserPairSchema = z
  .object({
    userId: uuidSchema,
    friendId: uuidSchema,
  })
  .refine((d) => d.userId !== d.friendId, {
    message: "userId y friendId deben ser distintos.",
    path: ["friendId"],
  });

export const sendFriendRequestBodySchema = z
  .object({
    userId: uuidSchema,
    friendId: uuidSchema,
    requiresParentApproval: z.boolean().optional(),
  })
  .refine((d) => d.userId !== d.friendId, {
    message: "userId y friendId deben ser distintos.",
    path: ["friendId"],
  });

export const parentApproveFriendBodySchema = z
  .object({
    userId: uuidSchema,
    friendId: uuidSchema,
    parentId: uuidSchema,
  })
  .refine((d) => d.userId !== d.friendId, {
    message: "userId y friendId deben ser distintos.",
    path: ["friendId"],
  });

export type ParentCredentials = z.infer<typeof parentCredentialsSchema>;
export type ChildLoginInput = z.infer<typeof childLoginSchema>;
export type CreateChildUserInput = z.infer<typeof createChildUserBodySchema>;

export function formatZodError(err: z.ZodError): string {
  const first = err.issues[0];
  return first?.message ?? "Datos no válidos.";
}

/** Valida un UUID en `params` o `query` (p. ej. `userId`). */
export function parseUuidParam(value: unknown): { ok: true; uuid: string } | { ok: false; error: string } {
  const r = uuidSchema.safeParse(value);
  if (!r.success) {
    return { ok: false, error: formatZodError(r.error) };
  }
  return { ok: true, uuid: r.data };
}
