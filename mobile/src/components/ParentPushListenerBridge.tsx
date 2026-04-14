import * as Notifications from "expo-notifications";
import { useEffect } from "react";

import {
  getNotificationPreferencesSnapshot,
  refreshNotificationPreferencesFromStorage,
} from "../lib/notificationPreferencesStore";
import { showToast } from "../lib/toastBus";
import { parentNavigationRef } from "../navigation/navigationRefs";
import { playNotification } from "../services/soundManager";

/**
 * Alerta in-app para el tutor cuando el servidor envía push por mensaje de chat marcado/bloqueado (`CHAT_FILTER_ALERT`).
 */
export function ParentPushListenerBridge() {
  useEffect(() => {
    const received = Notifications.addNotificationReceivedListener(async (n) => {
      const data = n.request.content.data as Record<string, unknown>;
      if (data?.kind !== "CHAT_FILTER_ALERT") return;
      await refreshNotificationPreferencesFromStorage();
      const prefs = getNotificationPreferencesSnapshot();
      if (!prefs.notificationsEnabled) return;
      const title = String(n.request.content.title ?? "Chat");
      const body = String(n.request.content.body ?? "");
      const line = body ? `${title}\n${body}` : title;
      showToast(line, "success", "parentAlert");
      if (prefs.notificationSoundsEnabled) {
        void playNotification();
      }
    });

    const response = Notifications.addNotificationResponseReceivedListener((r) => {
      const data = r.notification.request.content.data as Record<string, unknown>;
      if (data?.kind !== "CHAT_FILTER_ALERT") return;
      if (parentNavigationRef.isReady()) {
        parentNavigationRef.navigate({ name: "Parent", params: {} });
      }
    });

    return () => {
      received.remove();
      response.remove();
    };
  }, []);

  return null;
}
