import axios from "axios";

/**
 * Mensaje legible para fallos del API (incluye 404 usuario / URL en web).
 */
export function formatApiError(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const raw = error.response?.data;
    const serverMsg =
      raw && typeof raw === "object" && raw !== null && "error" in raw
        ? String((raw as { error?: unknown }).error ?? "").trim()
        : "";

    if (status === 403) {
      const code =
        raw && typeof raw === "object" && raw !== null && "code" in raw
          ? String((raw as { code?: unknown }).code ?? "").trim()
          : "";
      if (code === "CHILD_ACCOUNT_PENDING_APPROVAL") {
        return [
          "Tu tutor o tutora tiene que aprobar tu cuenta en el panel familiar antes de que puedas usar EduPlay.",
          "Pedile que abra la app con su cuenta, entre al panel del menor y pulse «Aprobar cuenta».",
        ].join(" ");
      }
    }

    if (status === 404) {
      if (/usuario/i.test(serverMsg) || serverMsg.length === 0) {
        return [
          "Usuario no encontrado (404).",
          "En el navegador abrí: http://localhost:3000/api/users",
          "Copiá el \"id\" (UUID) de un usuario y pegalo en mobile/.env:",
          "EXPO_PUBLIC_USER_ID=<ese-uuid>",
          "Guardá el archivo y reiniciá Expo: npx expo start -c",
        ].join(" ");
      }
      return serverMsg || "Recurso no encontrado (404). Revisá EXPO_PUBLIC_API_URL y el id de usuario.";
    }

    if (serverMsg) return serverMsg;
    if (typeof error.message === "string" && error.message.length > 0) return error.message;
  }

  if (error instanceof Error && error.message.length > 0) return error.message;
  return fallback;
}
