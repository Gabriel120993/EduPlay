import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { PermissionStatus } from "expo-modules-core";
import { Platform } from "react-native";

import { ensureEduPlayDefaultNotificationChannelAsync } from "../lib/ensureEduPlayNotificationChannel";
import {
  getStoredExpoPushToken,
  saveExpoPushTokenRecord,
  savePushPermissionOnly,
} from "../lib/pushTokenStorage";
import {
  getNotificationPreferencesSnapshot,
  refreshNotificationPreferencesFromStorage,
} from "../lib/notificationPreferencesStore";
import { postExpoPushToken, postParentPushToken } from "./api";

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    await refreshNotificationPreferencesFromStorage();
    const prefs = getNotificationPreferencesSnapshot();
    const on = prefs.notificationsEnabled;
    const data = notification.request.content.data as Record<string, unknown> | undefined;
    const kind = typeof data?.kind === "string" ? data.kind : "";
    /** En primer plano el toast in-app + sonido los manejan los bridges (evita duplicar banner/sistema). */
    const handledInApp = kind === "CHAT_MESSAGE" || kind === "CHAT_FILTER_ALERT";
    return {
      shouldShowBanner: on && !handledInApp,
      shouldShowList: on,
      shouldPlaySound: on && prefs.notificationSoundsEnabled && !handledInApp,
      shouldSetBadge: on,
    };
  },
});

function getExpoProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  const fromExtra = extra?.eas?.projectId;
  const fromEas = (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;
  const pid = typeof fromExtra === "string" ? fromExtra : fromEas;
  return typeof pid === "string" && pid.trim().length > 0 ? pid.trim() : undefined;
}

export type PushRegistrationResult = {
  success: boolean;
  token: string | null;
  permission: PermissionStatus;
};

async function obtainExpoPushTokenAndSaveLocal(): Promise<{
  token: string | null;
  permission: PermissionStatus;
}> {
  if (Platform.OS === "web") {
    await savePushPermissionOnly(PermissionStatus.UNDETERMINED);
    return { token: null, permission: PermissionStatus.UNDETERMINED };
  }

  if (Platform.OS === "android") {
    await ensureEduPlayDefaultNotificationChannelAsync();
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== PermissionStatus.GRANTED) {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== PermissionStatus.GRANTED) {
    await savePushPermissionOnly(finalStatus);
    return { token: null, permission: finalStatus };
  }

  if (!Device.isDevice) {
    await savePushPermissionOnly(finalStatus);
    return { token: null, permission: finalStatus };
  }

  const projectId = getExpoProjectId();
  if (!projectId) {
    await savePushPermissionOnly(finalStatus);
    if (__DEV__) {
      console.warn(
        "[EduPlay] Push: falta `extra.eas.projectId`. Definí EXPO_PUBLIC_EAS_PROJECT_ID en mobile/.env (UUID del proyecto en https://expo.dev ).",
      );
    }
    return { token: null, permission: finalStatus };
  }

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await saveExpoPushTokenRecord(token, finalStatus);
    return { token, permission: finalStatus };
  } catch (e) {
    if (__DEV__) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(
        "[EduPlay] Error al obtener token de notificaciones (sin valor del token):",
        msg,
      );
    }
    await savePushPermissionOnly(finalStatus);
    return { token: null, permission: finalStatus };
  }
}

/**
 * 1) Pide permiso de notificaciones.
 * 2) Obtiene el Expo push token (dispositivo físico + projectId en app config).
 * 3) Guarda el token de dispositivo en SecureStore y permiso/fecha en AsyncStorage.
 */
export async function registerForPushNotificationsAsync(
  userId: string | null,
): Promise<PushRegistrationResult> {
  const { token, permission } = await obtainExpoPushTokenAndSaveLocal();
  if (!token) {
    return { success: false, token: null, permission };
  }
  const uid = userId?.trim() ?? "";
  if (uid.length > 0) {
    try {
      await postExpoPushToken(uid, token);
    } catch (err) {
      if (__DEV__) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn("[EduPlay] No se pudo registrar notificaciones en el servidor.", msg);
      }
    }
  }
  return { success: true, token, permission };
}

/** Registra el mismo token Expo en la cuenta del tutor (avisos p. ej. nuevo amigo). */
export async function registerForParentPushNotificationsAsync(
  parentId: string,
): Promise<PushRegistrationResult> {
  const { token, permission } = await obtainExpoPushTokenAndSaveLocal();
  if (!token) {
    return { success: false, token: null, permission };
  }
  const pid = parentId.trim();
  if (pid.length > 0) {
    try {
      await postParentPushToken(pid, token);
    } catch (err) {
      if (__DEV__) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(
          "[EduPlay] No se pudo registrar notificaciones del tutor en el servidor.",
          msg,
        );
      }
    }
  }
  return { success: true, token, permission };
}

export { getStoredExpoPushToken };
