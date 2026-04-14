import AsyncStorage from "@react-native-async-storage/async-storage";

import type { UserNotificationPreferences, UserProfileResponse } from "../types/api";

const STORAGE_KEY = "eduplay:notificationPrefs:v1";

export const NOTIFICATION_PREFS_DEFAULTS: UserNotificationPreferences = {
  notificationsEnabled: true,
  notificationSoundsEnabled: true,
};

let cached: UserNotificationPreferences = { ...NOTIFICATION_PREFS_DEFAULTS };
let loadPromise: Promise<void> | null = null;

const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((l) => l());
}

function ensureLoadStarted(): void {
  if (loadPromise) return;
  loadPromise = (async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Partial<UserNotificationPreferences>;
        cached = {
          notificationsEnabled:
            typeof p.notificationsEnabled === "boolean" ? p.notificationsEnabled : NOTIFICATION_PREFS_DEFAULTS.notificationsEnabled,
          notificationSoundsEnabled:
            typeof p.notificationSoundsEnabled === "boolean"
              ? p.notificationSoundsEnabled
              : NOTIFICATION_PREFS_DEFAULTS.notificationSoundsEnabled,
        };
      }
    } catch {
      cached = { ...NOTIFICATION_PREFS_DEFAULTS };
    }
    notify();
  })();
}

export function subscribeNotificationPreferences(cb: () => void): () => void {
  ensureLoadStarted();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getNotificationPreferencesSnapshot(): UserNotificationPreferences {
  return { ...cached };
}

export async function refreshNotificationPreferencesFromStorage(): Promise<UserNotificationPreferences> {
  ensureLoadStarted();
  await loadPromise;
  return { ...cached };
}

export async function applyNotificationPreferencesFromProfile(profile: UserProfileResponse): Promise<void> {
  ensureLoadStarted();
  await loadPromise;
  cached = { ...profile.preferences };
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
  } catch {
    // noop
  }
  notify();
}

export async function applyNotificationPreferencesLocal(prefs: UserNotificationPreferences): Promise<void> {
  ensureLoadStarted();
  await loadPromise;
  cached = { ...prefs };
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
  } catch {
    // noop
  }
  notify();
}
