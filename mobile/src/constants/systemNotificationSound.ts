/**
 * Archivo WAV empaquetado vía plugin `expo-notifications` → `sounds` en `app.config.js`.
 * Usar solo el nombre del archivo (con extensión) en `Notifications` y en payloads push (iOS/Expo).
 */
export const EDUPLAY_SYSTEM_NOTIFICATION_WAV = "eduplay-push-chime.wav";

/** Canal Android por defecto (coincide con `defaultChannel` del plugin). */
export const ANDROID_DEFAULT_NOTIFICATION_CHANNEL_ID = "default";
