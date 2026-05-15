import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_LAST_ACTIVE = "eduplay_last_child_active_at_v1";

/** Sin usar la app (Feed / Explorar / Perfil) durante este tiempo → recordatorio en el Feed. */
export const INACTIVITY_REMINDER_THRESHOLD_MS = 48 * 60 * 60 * 1000;

const REMINDER_MESSAGES = [
  "Tenés desafíos pendientes 🎯",
  "Volvé a aprender algo nuevo 🚀",
] as const;

/** Marca actividad reciente (Explorar, Perfil, o tras evaluar el Feed). */
export async function touchChildLastActiveAt(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_LAST_ACTIVE, String(Date.now()));
  } catch {
    /* best effort */
  }
}

async function readLastActiveAt(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY_LAST_ACTIVE);
    if (raw == null || raw === "") return null;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

/**
 * Llamar al enfocar el Feed: si hubo inactividad prolongada, devuelve un mensaje y actualiza la marca de actividad.
 * Primera visita (sin marca previa): no muestra recordatorio.
 */
export async function evaluateFeedInactivityReminder(): Promise<{
  show: boolean;
  message: string;
}> {
  const now = Date.now();
  const last = await readLastActiveAt();
  const show = last !== null && now - last >= INACTIVITY_REMINDER_THRESHOLD_MS;

  await touchChildLastActiveAt();

  if (!show) {
    return { show: false, message: "" };
  }

  const message = REMINDER_MESSAGES[Math.floor(Math.random() * REMINDER_MESSAGES.length)]!;
  return { show: true, message };
}
