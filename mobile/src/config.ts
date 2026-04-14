import Constants from "expo-constants";

type Extra = {
  viewerUserId?: string;
  parentUserId?: string;
  apiUrl?: string;
};

function getExtra(): Extra {
  return (Constants.expoConfig?.extra ?? {}) as Extra;
}

/**
 * ID del usuario “viewer” para feed y perfil.
 * Definir en `mobile/.env`: `EXPO_PUBLIC_USER_ID=<uuid>`
 * (se carga con `app.config.js` + dotenv y llega como `extra.viewerUserId`).
 */
export const VIEWER_USER_ID =
  getExtra().viewerUserId?.trim() ||
  process.env.EXPO_PUBLIC_USER_ID?.trim() ||
  "";

/**
 * UUID del padre/tutor para el panel familiar (`ParentScreen`).
 * Registro tutor: `POST /api/auth/register` (recomendado) o alias `POST /api/parents` (misma respuesta con `token`).
 * `GET /api/parents/:id/dashboard` — obtené un `Parent.id` desde el seed o la BD.
 */
export const PARENT_USER_ID =
  getExtra().parentUserId?.trim() ||
  process.env.EXPO_PUBLIC_PARENT_ID?.trim() ||
  "";

/** Base URL del API; opcional `EXPO_PUBLIC_API_URL` en `.env`. */
export const API_BASE_URL =
  getExtra().apiUrl?.trim() ||
  process.env.EXPO_PUBLIC_API_URL?.trim() ||
  "http://localhost:3000";
