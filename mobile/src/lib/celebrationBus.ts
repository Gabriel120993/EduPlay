export type CelebrationEvent =
  | { kind: "level_up"; newLevel: number }
  | { kind: "achievement"; title: string; icon?: string };

const queue: CelebrationEvent[] = [];
const listeners = new Set<() => void>();

export function subscribeCelebration(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify(): void {
  listeners.forEach((l) => l());
}

export function emitCelebration(e: CelebrationEvent): void {
  queue.push(e);
  notify();
}

export function consumeNextCelebration(): CelebrationEvent | undefined {
  return queue.shift();
}

export function getCelebrationQueueLength(): number {
  return queue.length;
}
