import AsyncStorage from "@react-native-async-storage/async-storage";
import { getSecurePushDeviceToken, setSecurePushDeviceToken } from "./pushDeviceTokenSecure";

/** Migración: el token de dispositivo estuvo en AsyncStorage antes de SecureStore. */
const LEGACY_ASYNC_EXPO_PUSH_TOKEN = "eduplay:expoPushToken";

const KEY_PUSH_PERMISSION = "eduplay:pushPermission";
const KEY_PUSH_TOKEN_UPDATED_AT = "eduplay:expoPushTokenUpdatedAt";

export type StoredPushRecord = {
  token: string;
  permission: string;
  updatedAtIso: string;
};

async function migrateLegacyPushTokenIfNeeded(): Promise<void> {
  const current = await getSecurePushDeviceToken();
  if (current) return;
  try {
    const legacy = await AsyncStorage.getItem(LEGACY_ASYNC_EXPO_PUSH_TOKEN);
    if (legacy && legacy.length > 0) {
      await setSecurePushDeviceToken(legacy);
      await AsyncStorage.removeItem(LEGACY_ASYNC_EXPO_PUSH_TOKEN);
    }
  } catch {
    // ignore
  }
}

export async function saveExpoPushTokenRecord(token: string, permission: string): Promise<void> {
  const updatedAtIso = new Date().toISOString();
  await Promise.all([
    setSecurePushDeviceToken(token),
    AsyncStorage.setItem(KEY_PUSH_PERMISSION, permission),
    AsyncStorage.setItem(KEY_PUSH_TOKEN_UPDATED_AT, updatedAtIso),
  ]);
  await AsyncStorage.removeItem(LEGACY_ASYNC_EXPO_PUSH_TOKEN);
}

export async function savePushPermissionOnly(permission: string): Promise<void> {
  await AsyncStorage.setItem(KEY_PUSH_PERMISSION, permission);
}

export async function getStoredExpoPushToken(): Promise<string | null> {
  await migrateLegacyPushTokenIfNeeded();
  return getSecurePushDeviceToken();
}

export async function getStoredPushPermission(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEY_PUSH_PERMISSION);
  } catch {
    return null;
  }
}

export async function getStoredPushTokenUpdatedAt(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEY_PUSH_TOKEN_UPDATED_AT);
  } catch {
    return null;
  }
}

/** Llamar al cerrar sesión para no dejar un token viejo listo para enviar al backend. */
export async function clearExpoPushToken(): Promise<void> {
  try {
    await Promise.all([
      setSecurePushDeviceToken(null),
      AsyncStorage.removeItem(KEY_PUSH_TOKEN_UPDATED_AT),
      AsyncStorage.removeItem(LEGACY_ASYNC_EXPO_PUSH_TOKEN),
    ]);
  } catch {
    // best effort
  }
}
