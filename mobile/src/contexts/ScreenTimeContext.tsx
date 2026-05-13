import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState, type AppStateStatus, StyleSheet, View } from "react-native";

import { getScreenTime, postScreenTimeTick } from "../services/api";

export type ScreenTimeMetrics = {
  dailyLimitMinutes: number;
  usedTodaySeconds: number;
  remainingSeconds: number;
};

export type ScreenTimeContextValue = {
  /** Límite diario alcanzado (modo lectura: sin publicar, reaccionar, juegos interactivos, etc.). */
  limitExceeded: boolean;
  /** Igual que `limitExceeded` cuando el tracking está activo; alias semántico. */
  readOnlyMode: boolean;
  /** Tutor configuró tiempo ilimitado (`dailyScreenTimeLimit === 0`). */
  isUnlimited: boolean;
  /** Última lectura del API (GET o tick); null hasta la primera carga. */
  metrics: ScreenTimeMetrics | null;
  enabled: boolean;
  refresh: () => Promise<void>;
};

const ScreenTimeContext = createContext<ScreenTimeContextValue | null>(null);

const TICK_INTERVAL_MS = 30_000;

/** Banner en Feed / Explorar cuando el menor alcanzó el tiempo de pantalla. */
export const READ_ONLY_BANNER_TEXT = "⏳ Modo lectura activo";

/** Toast al intentar una acción bloqueada en modo lectura. */
export const READ_ONLY_TOAST_MSG = "Volvé mañana para seguir aprendiendo 🚀";

/** @deprecated Usar READ_ONLY_BANNER_TEXT o READ_ONLY_TOAST_MSG */
export const SCREEN_TIME_LIMIT_TITLE = READ_ONLY_BANNER_TEXT;

function useScreenTimeSession(
  userId: string | null,
  onTick: (deltaSeconds: number) => Promise<void>
): void {
  const lastTickRef = useRef<number | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const onTickRef = useRef(onTick);
  onTickRef.current = onTick;

  useEffect(() => {
    if (!userId) return;

    const flush = async (reason: string) => {
      if (lastTickRef.current === null) return;
      const now = Date.now();
      const deltaSec = Math.floor((now - lastTickRef.current) / 1000);
      lastTickRef.current = now;
      if (deltaSec > 0) {
        try {
          await onTickRef.current(deltaSec);
        } catch (e) {
          console.warn("[screenTime] tick failed", reason, e);
        }
      }
    };

    const onAppStateChange = (next: AppStateStatus) => {
      if (appStateRef.current.match(/active/) && next.match(/inactive|background/)) {
        void flush("background");
      }
      if (next === "active") {
        lastTickRef.current = Date.now();
      }
      appStateRef.current = next;
    };

    lastTickRef.current = Date.now();
    const sub = AppState.addEventListener("change", onAppStateChange);
    const interval = setInterval(() => {
      void flush("interval");
    }, TICK_INTERVAL_MS);

    return () => {
      sub.remove();
      clearInterval(interval);
      void flush("cleanup");
    };
  }, [userId]);
}

export function ScreenTimeProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const enabled = Boolean(userId.trim());
  const [limitExceeded, setLimitExceeded] = useState(false);
  const [isUnlimited, setIsUnlimited] = useState(false);
  const [metrics, setMetrics] = useState<ScreenTimeMetrics | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const s = await getScreenTime(userId);
      setLimitExceeded(s.limitExceeded);
      setIsUnlimited(Boolean(s.isUnlimited));
      setMetrics({
        dailyLimitMinutes: s.dailyLimitMinutes,
        usedTodaySeconds: s.usedTodaySeconds,
        remainingSeconds: s.remainingSeconds,
      });
    } catch {
      /* sin bloquear la app si el API falla */
    }
  }, [userId, enabled]);

  const applyTick = useCallback(
    async (deltaSeconds: number) => {
      if (!enabled || deltaSeconds <= 0) return;
      try {
        const s = await postScreenTimeTick(userId, deltaSeconds);
        setLimitExceeded(s.limitExceeded);
        setIsUnlimited(Boolean(s.isUnlimited));
        setMetrics({
          dailyLimitMinutes: s.dailyLimitMinutes,
          usedTodaySeconds: s.usedTodaySeconds,
          remainingSeconds: s.remainingSeconds,
        });
      } catch {
        /* red de tick: no bloquear uso; el próximo GET/refresh sincroniza */
      }
    },
    [userId, enabled]
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useScreenTimeSession(enabled ? userId : null, applyTick);

  const readOnlyMode = enabled && limitExceeded && !isUnlimited;

  const value = useMemo<ScreenTimeContextValue>(
    () => ({
      limitExceeded,
      readOnlyMode,
      isUnlimited,
      metrics,
      enabled,
      refresh,
    }),
    [limitExceeded, readOnlyMode, isUnlimited, metrics, enabled, refresh]
  );

  return (
    <ScreenTimeContext.Provider value={value}>
      <View style={styles.flex}>{children}</View>
    </ScreenTimeContext.Provider>
  );
}

export function useScreenTime(): ScreenTimeContextValue {
  const ctx = useContext(ScreenTimeContext);
  if (!ctx) {
    return {
      limitExceeded: false,
      readOnlyMode: false,
      isUnlimited: false,
      metrics: null,
      enabled: false,
      refresh: async () => {},
    };
  }
  return ctx;
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});
