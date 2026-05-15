import { useCallback, useRef } from "react";
import { Pressable, type PressableProps } from "react-native";

export type SafePressableProps = PressableProps & {
  /** Mínimo tiempo entre toques registrados (ms). */
  minIntervalMs?: number;
};

/**
 * Pressable que ignora toques demasiado seguidos (doble tap accidental).
 * Para acciones async, combiná con `useGuardedAsync` o `disabled={busy}`.
 */
export function SafePressable({
  onPress,
  minIntervalMs = 450,
  disabled,
  ...rest
}: SafePressableProps) {
  const lastPressRef = useRef(0);

  const handlePress = useCallback(
    (e: Parameters<NonNullable<PressableProps["onPress"]>>[0]) => {
      if (!onPress) return;
      const now = Date.now();
      if (now - lastPressRef.current < minIntervalMs) {
        return;
      }
      lastPressRef.current = now;
      onPress(e);
    },
    [onPress, minIntervalMs],
  );

  return <Pressable {...rest} disabled={disabled} onPress={handlePress} />;
}
