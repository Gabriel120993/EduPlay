import * as Notifications from "expo-notifications";

import {
  ANDROID_DEFAULT_NOTIFICATION_CHANNEL_ID,
  EDUPLAY_SYSTEM_NOTIFICATION_WAV,
} from "../constants/systemNotificationSound";

/**
 * Android 8+: el sonido del aviso lo define el canal; debe coincidir con el WAV del config plugin.
 */
export async function ensureEduPlayDefaultNotificationChannelAsync(): Promise<void> {
  await Notifications.setNotificationChannelAsync(ANDROID_DEFAULT_NOTIFICATION_CHANNEL_ID, {
    name: "EduPlay",
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: EDUPLAY_SYSTEM_NOTIFICATION_WAV,
    enableVibrate: true,
  });
}
