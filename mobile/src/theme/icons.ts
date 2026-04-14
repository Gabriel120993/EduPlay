import type { ComponentProps } from "react";
import Ionicons from "@expo/vector-icons/Ionicons";

/** Nombre de glifo válido para `@expo/vector-icons` / Ionicons (única librería de iconos de la app). */
export type IoniconName = ComponentProps<typeof Ionicons>["name"];
