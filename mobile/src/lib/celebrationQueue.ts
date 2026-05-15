import { emitCelebration } from "./celebrationBus";
import { showToast } from "./toastBus";

/** Sin importar `services/api` (evita ciclo con `completeQuizSession`). */
export function queueCelebrationsAfterQuizComplete(res: {
  levelUp?: boolean;
  newLevel?: number;
  unlockedAchievements?: { title: string; badgeIcon?: string | null }[];
}): void {
  if (res.levelUp && res.newLevel != null) {
    emitCelebration({ kind: "level_up", newLevel: res.newLevel });
  }
  const achievements = res.unlockedAchievements ?? [];
  for (const a of achievements) {
    emitCelebration({ kind: "achievement", title: a.title, icon: a.badgeIcon ?? undefined });
  }
  if (achievements.length === 1) {
    const a = achievements[0]!;
    const detail = [a.badgeIcon?.trim() || "", a.title].filter(Boolean).join(" ").trim();
    showToast(
      detail ? `¡Logro desbloqueado! 🏆\n${detail}` : "¡Logro desbloqueado! 🏆",
      "success",
      "achievement",
    );
  } else if (achievements.length > 1) {
    const titles = achievements.map((x) => x.title).join(" · ");
    showToast(
      `¡Logros desbloqueados! 🏆 (${achievements.length})\n${titles}`,
      "success",
      "achievement",
    );
  }
}

export function queueCelebrationsAfterContentLearn(res: {
  levelUp?: boolean;
  newLevel?: number;
}): void {
  if (res.levelUp && res.newLevel != null) {
    emitCelebration({ kind: "level_up", newLevel: res.newLevel });
  }
}
