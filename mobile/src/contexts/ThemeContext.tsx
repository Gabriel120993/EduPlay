import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";

import type { AppColors, ThemeMode } from "../theme/appTheme";
import { colorsForMode } from "../theme/appTheme";

const STORAGE_KEY = "@eduplay/theme_mode";

type ThemeContextValue = {
  /** Alias friendly para UI. Igual que `mode` pero con nombre más semántico. */
  currentTheme: ThemeMode;
  mode: ThemeMode;
  colors: AppColors;
  ready: boolean;
  setMode: (mode: ThemeMode) => Promise<void>;
  toggleDark: () => Promise<void>;
  /** Toggle preferido (alias de `toggleDark`). */
  toggleTheme: () => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [userPreference, setUserPreference] = useState<ThemeMode | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled && (raw === "dark" || raw === "light")) {
          setUserPreference(raw);
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setMode = useCallback(async (next: ThemeMode) => {
    setUserPreference(next);
    await AsyncStorage.setItem(STORAGE_KEY, next);
  }, []);

  const systemMode: ThemeMode = systemScheme === "dark" ? "dark" : "light";
  const mode: ThemeMode = userPreference ?? systemMode;

  const toggleDark = useCallback(async () => {
    const next: ThemeMode = mode === "dark" ? "light" : "dark";
    await setMode(next);
  }, [mode, setMode]);

  const colors = useMemo(() => colorsForMode(mode), [mode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      currentTheme: mode,
      mode,
      colors,
      ready,
      setMode,
      toggleDark,
      toggleTheme: toggleDark,
    }),
    [mode, colors, ready, setMode, toggleDark],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme debe usarse dentro de ThemeProvider");
  }
  return ctx;
}

/** Para componentes que pueden renderizarse fuera de `ThemeProvider` (p. ej. splash). */
export function useThemeOptional(): ThemeContextValue | null {
  return useContext(ThemeContext);
}
