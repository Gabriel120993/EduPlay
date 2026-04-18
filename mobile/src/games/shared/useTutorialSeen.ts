import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

import type { MiniGameId } from "../types";

const storageKey = (id: MiniGameId) => `@eduplay/minigame_tutorial_done:${id}`;

/** `showTutorial` solo true cuando ya leímos AsyncStorage y el usuario no completó el tutorial antes. */
export function useTutorialSeen(gameId: MiniGameId): [boolean, () => Promise<void>] {
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const v = await AsyncStorage.getItem(storageKey(gameId));
        if (!cancelled) {
          setPending(v !== "1");
          setReady(true);
        }
      } catch {
        if (!cancelled) {
          setPending(true);
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gameId]);

  const markDone = useCallback(async () => {
    await AsyncStorage.setItem(storageKey(gameId), "1");
    setPending(false);
  }, [gameId]);

  return [ready && pending, markDone];
}
