import axios from "axios";

import { API_BASE_URL } from "../config";

const analyticsApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10_000,
});

export function setAnalyticsToken(token: string | null): void {
  if (token) {
    analyticsApi.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }
  delete analyticsApi.defaults.headers.common.Authorization;
}

/**
 * Envía un evento a `POST /api/analytics` con el JWT del menor (mismo cliente que `api`).
 * No bloquea la UI; errores silenciados.
 */
export function trackEvent(name: string, metadata: Record<string, unknown> = {}): void {
  void analyticsApi
    .post("/api/analytics", { eventName: name, metadata })
    .catch(() => {
      /* analítica best-effort */
    });
}
