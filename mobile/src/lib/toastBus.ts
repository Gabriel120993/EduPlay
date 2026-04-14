export type ToastVariant = "success" | "error";

/** Estilo visual del toast (logros: icono 🏆/campana y animaciones). */
export type ToastVisual = "default" | "achievement" | "chat" | "parentAlert";

type Listener = (message: string, variant: ToastVariant, visual: ToastVisual) => void;

let listener: Listener | null = null;

/** Registra el host visual de toasts (solo uno). */
export function setToastListener(next: Listener | null): void {
  listener = next;
}

export function showToast(
  message: string,
  variant: ToastVariant = "success",
  visual: ToastVisual = "default"
): void {
  listener?.(message, variant, visual);
}
