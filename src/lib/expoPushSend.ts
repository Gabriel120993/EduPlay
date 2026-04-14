import { logError } from "./logger";

/**
 * Envío mínimo a la API HTTP de Expo Push (sin dependencia extra).
 * Falla en silencio salvo log (sin token ni cuerpo de respuesta).
 */
export type ExpoPushSendOptions = {
  /** p. ej. `eduplay-push-chime.wav` si está en el bundle de la app Expo. */
  sound?: string;
  /** Canal Android (p. ej. `default`). */
  channelId?: string;
};

export async function sendExpoPushToToken(
  expoPushToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
  options?: ExpoPushSendOptions
): Promise<void> {
  const token = expoPushToken.trim();
  if (!token) return;

  const payload: Record<string, unknown> = {
    to: token,
    title,
    body,
    sound: options?.sound ?? "default",
    priority: "high",
    data: data ?? {},
  };
  if (options?.channelId) {
    payload.channelId = options.channelId;
  }

  try {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      await res.text().catch(() => "");
      logError("expo-push", new Error(`Expo API responded ${res.status}`));
    }
  } catch (e) {
    logError("expo-push", e);
  }
}
