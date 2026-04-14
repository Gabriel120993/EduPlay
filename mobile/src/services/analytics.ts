import { api } from "./api";

/**
 * Envía un evento a `POST /api/analytics` con el JWT del menor (mismo cliente que `api`).
 * No bloquea la UI; errores silenciados.
 */
export function trackEvent(name: string, metadata: Record<string, unknown> = {}): void {
  void api
    .post("/api/analytics", { eventName: name, metadata })
    .catch(() => {
      /* analítica best-effort */
    });
}
