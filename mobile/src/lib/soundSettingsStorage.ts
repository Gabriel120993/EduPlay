import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_ENABLED = "eduplay:soundEnabled";
const KEY_VOLUME = "eduplay:soundVolume";

export const SOUND_DEFAULTS = {
  enabled: true,
  volume: 1,
} as const;

export async function loadSoundSettings(): Promise<{ enabled: boolean; volume: number }> {
  try {
    const [e, v] = await Promise.all([AsyncStorage.getItem(KEY_ENABLED), AsyncStorage.getItem(KEY_VOLUME)]);
    const enabled = e === null ? SOUND_DEFAULTS.enabled : e === "1";
    const parsedVol = v === null ? SOUND_DEFAULTS.volume : parseFloat(v);
    const volume = Number.isFinite(parsedVol) ? Math.min(1, Math.max(0, parsedVol)) : SOUND_DEFAULTS.volume;
    return { enabled, volume };
  } catch {
    return { ...SOUND_DEFAULTS };
  }
}

export async function saveSoundEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(KEY_ENABLED, enabled ? "1" : "0");
}

export async function saveSoundVolume(volume: number): Promise<void> {
  const clamped = Math.min(1, Math.max(0, volume));
  await AsyncStorage.setItem(KEY_VOLUME, String(clamped));
}
