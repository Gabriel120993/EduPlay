import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const AUTH_JWT_KEY = "eduplay_auth_jwt";

/** En web no hay Keychain; el JWT solo vive en memoria (se pierde al recargar). */
let webMemoryJwt: string | null = null;

const secureOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export async function getStoredAuthJwt(): Promise<string | null> {
  if (Platform.OS === "web") {
    return webMemoryJwt;
  }
  try {
    return await SecureStore.getItemAsync(AUTH_JWT_KEY);
  } catch {
    return null;
  }
}

export async function setStoredAuthJwt(token: string | null): Promise<void> {
  if (Platform.OS === "web") {
    webMemoryJwt = token;
    return;
  }
  try {
    if (token == null || token === "") {
      await SecureStore.deleteItemAsync(AUTH_JWT_KEY);
    } else {
      await SecureStore.setItemAsync(AUTH_JWT_KEY, token, secureOptions);
    }
  } catch {
    // best effort
  }
}
