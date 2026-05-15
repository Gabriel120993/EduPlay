export type ThemeMode = "light" | "dark";

export type SimpleTheme = {
  background: string;
  card: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
};

export const lightTheme: SimpleTheme = {
  background: "#f9fafb",
  card: "#ffffff",
  textPrimary: "#111827",
  textSecondary: "#6b7280",
  border: "#e5e7eb",
};

export const darkTheme: SimpleTheme = {
  background: "#0b0b0d",
  card: "#26262c",
  textPrimary: "#f8fafc",
  textSecondary: "#aeb4bf",
  border: "#3f3f46",
};

export const theme = {
  light: lightTheme,
  dark: darkTheme,
};

export function getTheme(mode: ThemeMode): SimpleTheme {
  return mode === "dark" ? darkTheme : lightTheme;
}
