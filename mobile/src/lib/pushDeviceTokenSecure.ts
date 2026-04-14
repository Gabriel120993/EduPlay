import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const EXPO_PUSH_DEVICE_TOKEN_KEY = "eduplay_expo_push_device_token";

let webMemoryPushToken: string | null = null;

const secureOptions: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

export async function getSecurePushDeviceToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return webMemoryPushToken;
  }
  try {
    return await SecureStore.getItemAsync(EXPO_PUSH_DEVICE_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setSecurePushDeviceToken(token: string | null): Promise<void> {
  if (Platform.OS === "web") {
    webMemoryPushToken = token;
    return;
  }
  try {
    if (token == null || token === "") {
      await SecureStore.deleteItemAsync(EXPO_PUSH_DEVICE_TOKEN_KEY);
    } else {
      await SecureStore.setItemAsync(EXPO_PUSH_DEVICE_TOKEN_KEY, token, secureOptions);
    }
  } catch {
    // best effort
  }
}
