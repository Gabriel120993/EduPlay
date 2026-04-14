import { playNotification } from "../services/soundManager";

type Subscriber = (badgeCount: number) => void;

const subscribers = new Set<Subscriber>();
let badgeCount = 0;

export type PingBellOptions = { silent?: boolean };

export function pingNotificationBell(options?: PingBellOptions): void {
  badgeCount += 1;
  subscribers.forEach((s) => s(badgeCount));
  if (!options?.silent) {
    playNotification();
  }
}

export function clearNotificationBell(): void {
  badgeCount = 0;
  subscribers.forEach((s) => s(0));
}

export function subscribeNotificationBell(sub: Subscriber): () => void {
  subscribers.add(sub);
  sub(badgeCount);
  return () => subscribers.delete(sub);
}
