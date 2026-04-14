import Ionicons from "@expo/vector-icons/Ionicons";

import type { IoniconName } from "../theme/icons";
import { iconSize } from "../theme/tokens";

type SizePreset = keyof typeof iconSize;

export type AppIconProps = {
  name: IoniconName;
  color: string;
  /** Por defecto `md`. Ver `iconSize` en tokens. */
  size?: SizePreset | number;
};

export function AppIcon({ name, color, size = "md" }: AppIconProps) {
  const px = typeof size === "number" ? size : iconSize[size];
  return <Ionicons name={name} size={px} color={color} />;
}
