import { trackEvent } from "../services/analytics";
import { showToast } from "./toastBus";

/**
 * Evita mostrar el mismo aviso dos veces (p. ej. refetch + respuesta API) por `userMissionId`.
 */
const alertedMissionIds = new Set<string>();

export type MissionRewardLine = {
  userMissionId: string;
  xpReward: number;
};

/**
 * Muestra toast(s) para recompensas nuevas y devuelve los `userMissionId` mostrados (para resaltar en UI).
 */
export function tryAlertMissionCompletions(items: MissionRewardLine[]): string[] {
  const toShow = items.filter((i) => !alertedMissionIds.has(i.userMissionId));
  if (toShow.length === 0) return [];

  for (const i of toShow) {
    alertedMissionIds.add(i.userMissionId);
    trackEvent("mission_completed", { userMissionId: i.userMissionId, xpReward: i.xpReward });
  }

  if (toShow.length === 1) {
    const xp = toShow[0].xpReward;
    showToast(xp > 0 ? `Misión completada 🏆 +${xp} XP` : "Misión completada 🏆", "success");
  } else {
    const parts = toShow.map((x) => (x.xpReward > 0 ? `+${x.xpReward} XP` : "ok"));
    showToast(`${toShow.length} misiones completadas 🏆 · ${parts.join(", ")}`, "success");
  }

  return toShow.map((i) => i.userMissionId);
}
