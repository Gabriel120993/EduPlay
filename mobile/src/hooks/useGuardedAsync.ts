import { useCallback, useRef, useState } from "react";

export type UseGuardedAsyncOptions = {
  /**
   * Tiempo mínimo entre el fin de un intento (éxito o error) y poder iniciar otro.
   * Mitiga doble toque y envíos repetidos.
   */
  cooldownMs?: number;
};

/**
 * Ejecuta una función async a la vez y aplica cooldown entre intentos.
 * Útil para envíos de formularios, API sensibles y botones que disparan mutaciones.
 */
export function useGuardedAsync(options: UseGuardedAsyncOptions = {}) {
  const { cooldownMs = 600 } = options;
  const inFlightRef = useRef(false);
  const lastEndRef = useRef(0);
  const [busy, setBusy] = useState(false);

  const run = useCallback(
    async (fn: () => Promise<void>): Promise<boolean> => {
      const now = Date.now();
      if (inFlightRef.current) {
        return false;
      }
      if (now - lastEndRef.current < cooldownMs) {
        return false;
      }
      inFlightRef.current = true;
      setBusy(true);
      try {
        await fn();
        return true;
      } finally {
        inFlightRef.current = false;
        setBusy(false);
        lastEndRef.current = Date.now();
      }
    },
    [cooldownMs],
  );

  return { run, busy };
}
