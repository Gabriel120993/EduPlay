import AsyncStorage from "@react-native-async-storage/async-storage";
import { PermissionStatus } from "expo-modules-core";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import {
  applyNotificationPreferencesFromProfile,
  refreshNotificationPreferencesFromStorage,
  getNotificationPreferencesSnapshot,
} from "../lib/notificationPreferencesStore";
import {
  bodyChallengesWithInterests,
  bodyInactivityWithInterests,
  pickAnotherInterestCategoryId,
  pickInterestCategoryId,
} from "../lib/notificationPersonalization";
import { ANDROID_DEFAULT_NOTIFICATION_CHANNEL_ID, EDUPLAY_SYSTEM_NOTIFICATION_WAV } from "../constants/systemNotificationSound";
import { ensureEduPlayDefaultNotificationChannelAsync } from "../lib/ensureEduPlayNotificationChannel";
import { getTodayDailyMissions, getUserProfile } from "./api";

const STORAGE_INACTIVITY_ID = "eduplay:localNotif:inactivityScheduleId";
const STORAGE_CHALLENGES_ID = "eduplay:localNotif:challengesScheduleId";

/** 24 h sin abrir la app (se reprograma en cada apertura). */
const INACTIVITY_SECONDS = 24 * 60 * 60;

/** Recordatorio de desafíos: horas después de la última sincronización con el API. */
const CHALLENGE_REMINDER_HOURS = 2;

async function cancelStored(key: string): Promise<void> {
  try {
    const id = await AsyncStorage.getItem(key);
    if (id) {
      await Notifications.cancelScheduledNotificationAsync(id);
    }
    await AsyncStorage.removeItem(key);
  } catch {
    // noop
  }
}

function hasIncompleteDailyChallenges(
  missions: { completed: boolean }[],
  dailyChallengeBonus: { granted: boolean }
): boolean {
  if (missions.length === 0) return false;
  if (dailyChallengeBonus.granted) return false;
  return missions.some((m) => !m.completed);
}

/**
 * Programa:
 * - recordatorio por inactividad (24 h desde la última vez que se llamó esta función con permiso);
 * - recordatorio de desafíos diarios pendientes (si el API indica misiones sin completar).
 */
export async function syncLocalNotifications(userId: string): Promise<void> {
  if (Platform.OS === "web") return;

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== PermissionStatus.GRANTED) return;

  await ensureEduPlayDefaultNotificationChannelAsync();

  await refreshNotificationPreferencesFromStorage();

  let interests:
    | {
        category: string;
        score: number;
      }[]
    | undefined;
  try {
    const profile = await getUserProfile(userId);
    await applyNotificationPreferencesFromProfile(profile);
    interests = profile.interests;
  } catch {
    interests = undefined;
  }

  const prefs = getNotificationPreferencesSnapshot();
  if (!prefs.notificationsEnabled) {
    await clearLocalNotificationSchedules();
    return;
  }

  const notificationSound = prefs.notificationSoundsEnabled ? EDUPLAY_SYSTEM_NOTIFICATION_WAV : false;

  const androidTriggerExtra =
    Platform.OS === "android" ? { channelId: ANDROID_DEFAULT_NOTIFICATION_CHANNEL_ID } : {};

  const categoryInactivity = pickInterestCategoryId(interests);
  const inactivityBody = bodyInactivityWithInterests(categoryInactivity);

  await cancelStored(STORAGE_INACTIVITY_ID);
  const inactivityId = await Notifications.scheduleNotificationAsync({
    content: {
      title: "EduPlay",
      body: inactivityBody,
      data: {
        kind: "local_inactivity",
        ...(categoryInactivity ? { category: categoryInactivity } : {}),
      },
      sound: notificationSound,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: INACTIVITY_SECONDS,
      repeats: false,
      ...androidTriggerExtra,
    },
  });
  await AsyncStorage.setItem(STORAGE_INACTIVITY_ID, inactivityId);

  await cancelStored(STORAGE_CHALLENGES_ID);
  try {
    const today = await getTodayDailyMissions(userId);
    const incomplete = hasIncompleteDailyChallenges(today.missions, today.dailyChallengeBonus);
    if (!incomplete) return;

    const categoryChallenges = pickAnotherInterestCategoryId(interests, categoryInactivity);
    const challengesBody = bodyChallengesWithInterests(categoryChallenges);
    const challengesTitle = categoryChallenges != null ? "Tenés desafíos pendientes 🎯" : "EduPlay";

    const fireAt = new Date(Date.now() + CHALLENGE_REMINDER_HOURS * 60 * 60 * 1000);
    const challengesId = await Notifications.scheduleNotificationAsync({
      content: {
        title: challengesTitle,
        body: challengesBody,
        data: {
          kind: "local_challenges",
          ...(categoryChallenges ? { category: categoryChallenges } : {}),
        },
        sound: notificationSound,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireAt,
        ...androidTriggerExtra,
      },
    });
    await AsyncStorage.setItem(STORAGE_CHALLENGES_ID, challengesId);
  } catch {
    // Sin API: no programamos el recordatorio de desafíos.
  }
}

export async function clearLocalNotificationSchedules(): Promise<void> {
  if (Platform.OS === "web") return;
  await cancelStored(STORAGE_INACTIVITY_ID);
  await cancelStored(STORAGE_CHALLENGES_ID);
}
