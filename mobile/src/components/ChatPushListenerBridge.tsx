import * as Notifications from "expo-notifications";
import { useEffect } from "react";

import {
  getNotificationPreferencesSnapshot,
  refreshNotificationPreferencesFromStorage,
} from "../lib/notificationPreferencesStore";
import { showToast } from "../lib/toastBus";
import { rootNavigationRef } from "../navigation/navigationRefs";
import { playNotification } from "../services/soundManager";

/**
 * Primer plano: toast in-app + sonido tipo notificación para push `CHAT_MESSAGE`.
 * Tocar la notificación abre el hilo con el remitente.
 */
export function ChatPushListenerBridge() {
  useEffect(() => {
    const received = Notifications.addNotificationReceivedListener(async (n) => {
      const data = n.request.content.data as Record<string, unknown>;
      if (data?.kind !== "CHAT_MESSAGE") return;
      await refreshNotificationPreferencesFromStorage();
      const prefs = getNotificationPreferencesSnapshot();
      if (!prefs.notificationsEnabled) return;
      const title = String(n.request.content.title ?? "Mensaje");
      const body = String(n.request.content.body ?? "");
      const line = body ? `${title} — ${body}` : title;
      showToast(line, "success", "chat");
      if (prefs.notificationSoundsEnabled) {
        void playNotification();
      }
    });

    const response = Notifications.addNotificationResponseReceivedListener((r) => {
      const data = r.notification.request.content.data as Record<string, unknown>;
      if (data?.kind !== "CHAT_MESSAGE") return;
      const senderId = typeof data.senderId === "string" ? data.senderId.trim() : "";
      if (!senderId) return;
      const peerName =
        typeof data.peerName === "string" && data.peerName.trim()
          ? data.peerName.trim()
          : typeof data.senderUsername === "string" && data.senderUsername.trim()
            ? data.senderUsername.trim()
            : "Chat";
      if (rootNavigationRef.isReady()) {
        rootNavigationRef.navigate("ChatThread", { peerId: senderId, peerName });
      }
    });

    return () => {
      received.remove();
      response.remove();
    };
  }, []);

  return null;
}
