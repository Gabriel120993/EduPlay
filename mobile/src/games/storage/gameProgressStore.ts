import AsyncStorage from "@react-native-async-storage/async-storage";

import type { MiniGameId, Stars } from "../types";

const PREFIX = "@eduplay/minigame:";
const UNLOCK_PREFIX = "@eduplay/minigame_unlocks:";

export async function getMaxUnlockedLevel(gameId: MiniGameId): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(`${PREFIX}${gameId}:maxLevel`);
    const n = raw != null ? Number(raw) : 0;
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

export async function setMaxUnlockedLevel(gameId: MiniGameId, levelIndex: number): Promise<void> {
  const prev = await getMaxUnlockedLevel(gameId);
  if (levelIndex > prev) {
    await AsyncStorage.setItem(`${PREFIX}${gameId}:maxLevel`, String(levelIndex));
  }
}

export async function getStarsForLevel(gameId: MiniGameId, levelIndex: number): Promise<Stars | 0> {
  try {
    const raw = await AsyncStorage.getItem(`${PREFIX}${gameId}:stars:${levelIndex}`);
    const n = raw != null ? Number(raw) : 0;
    if (n === 1 || n === 2 || n === 3) return n;
    return 0;
  } catch {
    return 0;
  }
}

export async function setStarsForLevel(gameId: MiniGameId, levelIndex: number, stars: Stars): Promise<void> {
  const prev = await getStarsForLevel(gameId, levelIndex);
  if (stars > prev) {
    await AsyncStorage.setItem(`${PREFIX}${gameId}:stars:${levelIndex}`, String(stars));
  }
}

export type CosmeticUnlocks = {
  skinIndex: number;
  theme: "ocean" | "forest" | "space" | "sunset";
};

export async function getCosmeticUnlocks(gameId: MiniGameId): Promise<CosmeticUnlocks> {
  try {
    const raw = await AsyncStorage.getItem(`${UNLOCK_PREFIX}${gameId}`);
    if (!raw) return { skinIndex: 0, theme: "ocean" };
    return JSON.parse(raw) as CosmeticUnlocks;
  } catch {
    return { skinIndex: 0, theme: "ocean" };
  }
}

export async function bumpUnlocksAfterLevel(gameId: MiniGameId, levelIndex: number): Promise<CosmeticUnlocks> {
  const cur = await getCosmeticUnlocks(gameId);
  let skinIndex = cur.skinIndex;
  if ((levelIndex + 1) % 5 === 0) skinIndex = Math.min(5, skinIndex + 1);
  const themes: CosmeticUnlocks["theme"][] = ["ocean", "forest", "space", "sunset"];
  let theme = cur.theme;
  if ((levelIndex + 1) % 8 === 0) {
    const i = themes.indexOf(theme);
    theme = themes[(i + 1) % themes.length]!;
  }
  const next: CosmeticUnlocks = { skinIndex, theme };
  await AsyncStorage.setItem(`${UNLOCK_PREFIX}${gameId}`, JSON.stringify(next));
  return next;
}
