import { DarkTheme, DefaultTheme, type Theme } from "@react-navigation/native";

import type { AppColors } from "../theme/appTheme";

export function navigationThemeFrom(colors: AppColors): Theme {
  const base = colors.mode === "dark" ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.tabBar,
      text: colors.headerTint,
      border: colors.tabBarBorder,
      notification: colors.primary,
    },
  };
}
