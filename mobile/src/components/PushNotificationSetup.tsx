import { useEffect } from "react";

import { useAuth } from "../contexts/AuthContext";
import {
  registerForParentPushNotificationsAsync,
  registerForPushNotificationsAsync,
} from "../services/pushNotifications";

/**
 * Registra push del menor o del tutor según la sesión activa.
 */
export function PushNotificationSetup() {
  const { sessionRole, viewerUserId, token, parent } = useAuth();

  useEffect(() => {
    if (sessionRole !== "child" || !viewerUserId || !token) return;
    void registerForPushNotificationsAsync(viewerUserId);
  }, [sessionRole, viewerUserId, token]);

  useEffect(() => {
    if (sessionRole !== "parent" || !parent?.id || !token) return;
    void registerForParentPushNotificationsAsync(parent.id);
  }, [sessionRole, parent?.id, token]);

  return null;
}
