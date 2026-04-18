import { randomBytes } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { sanitizeForLog, logSuspicious } from "../lib/logger";

const SLOW_MS = 2000;
const VERY_LARGE_BODY = 400_000;

/**
 * Registra cada solicitud: método, ruta, duración, usuario autenticado (si existe).
 * Marca anomalías: respuestas lentas, muchos 4xx/5xx (por instancia de proceso, ligero).
 */
export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();
  req.requestId = req.requestId ?? randomBytes(8).toString("hex");

  const authSummary = (() => {
    const a = req.auth;
    if (!a) return "anonymous";
    if (a.kind === "parent") return `parent:${a.parentId.slice(0, 8)}…`;
    return `child:${a.userId.slice(0, 8)}…`;
  })();

  res.on("finish", () => {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1e6;
    const status = res.statusCode;

    const line = {
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl ?? req.path,
      status,
      durationMs: Math.round(durationMs),
      auth: authSummary,
      ip: req.ip ?? req.socket.remoteAddress ?? "",
    };

    if (durationMs >= SLOW_MS) {
      logSuspicious("slow_request", { ...line, thresholdMs: SLOW_MS });
    }
    if (status >= 500) {
      logSuspicious("http_5xx", line);
    } else if (status === 401 || status === 403) {
      logSuspicious("http_auth_error", line);
    }

    const cl = req.headers["content-length"];
    if (typeof cl === "string" && Number(cl) > VERY_LARGE_BODY) {
      logSuspicious("large_request_body", { ...line, contentLength: cl });
    }

    if (envLogVerbose()) {
      void console.log(`[access] ${JSON.stringify(sanitizeForLog(line))}`);
    }
  });

  next();
}

function envLogVerbose(): boolean {
  return process.env.REQUEST_LOG_VERBOSE?.trim().toLowerCase() === "true";
}
