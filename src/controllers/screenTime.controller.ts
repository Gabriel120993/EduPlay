import type { Request, Response } from "express";
import { logError } from "../lib/logger";
import { addScreenTimeSeconds, getScreenTimeState } from "../lib/screenTime";

const MAX_DELTA_PER_REQUEST = 180; // 3 min — evita abusos por requests enormes

function parseDeltaSeconds(body: unknown): number | null {
  if (body === null || typeof body !== "object") return null;
  const raw = (body as Record<string, unknown>).deltaSeconds;
  if (raw === undefined || raw === null) return null;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

export async function getUserScreenTime(req: Request, res: Response): Promise<void> {
  const id = req.params.id?.trim();
  if (!id) {
    res.status(400).json({ error: "id de usuario es obligatorio." });
    return;
  }

  try {
    const state = await getScreenTimeState(id);
    if (!state) {
      res.status(404).json({ error: "Usuario no encontrado." });
      return;
    }

    res.json({
      dailyLimitMinutes: state.dailyLimitMinutes,
      usedTodaySeconds: state.usedTodaySeconds,
      limitExceeded: state.limitExceeded,
      remainingSeconds: state.remainingSeconds,
      lastReset: state.lastReset.toISOString(),
      isUnlimited: state.isUnlimited,
    });
  } catch (err) {
    logError("screenTime", err);
    res.status(500).json({ error: "Error al obtener tiempo de pantalla." });
  }
}

export async function postUserScreenTimeTick(req: Request, res: Response): Promise<void> {
  const id = req.params.id?.trim();
  if (!id) {
    res.status(400).json({ error: "id de usuario es obligatorio." });
    return;
  }

  const delta = parseDeltaSeconds(req.body);
  if (delta === null) {
    res.status(400).json({ error: "deltaSeconds (número >= 0) es obligatorio." });
    return;
  }

  const capped = Math.min(delta, MAX_DELTA_PER_REQUEST);

  try {
    const state = await addScreenTimeSeconds(id, capped);
    if (!state) {
      res.status(404).json({ error: "Usuario no encontrado." });
      return;
    }

    res.json({
      dailyLimitMinutes: state.dailyLimitMinutes,
      usedTodaySeconds: state.usedTodaySeconds,
      limitExceeded: state.limitExceeded,
      remainingSeconds: state.remainingSeconds,
      lastReset: state.lastReset.toISOString(),
      isUnlimited: state.isUnlimited,
    });
  } catch (err) {
    logError("screenTime", err);
    res.status(500).json({ error: "Error al registrar tiempo de pantalla." });
  }
}
