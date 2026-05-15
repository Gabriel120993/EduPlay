import { useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { useAuth } from "../contexts/AuthContext";
import {
  clearLocalNotificationSchedules,
  syncLocalNotifications,
} from "../services/localNotifications";

/**
 * Programa notificaciones locales: inactividad 24h y desafíos diarios pendientes (según API).
 */
export function LocalNotificationScheduler() {
  const { sessionRole, viewerUserId, token } = useAuth();
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (sessionRole !== "child" || !viewerUserId || !token) {
      void clearLocalNotificationSchedules();
      return;
    }

    void syncLocalNotifications(viewerUserId);

    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && next === "active") {
        void syncLocalNotifications(viewerUserId);
      }
      appState.current = next;
    });

    return () => {
      sub.remove();
    };
  }, [sessionRole, viewerUserId, token]);

  return null;
}
