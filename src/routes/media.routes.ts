import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import multer from "multer";

import { postMediaUpload } from "../controllers/media.controller";
import { authWriteLimiter } from "../middlewares/rateLimit.middleware";
import { requireChild } from "../middlewares/rbac.middleware";

const MAX_BYTES = 80 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES },
});

function uploadSingleMiddleware(req: Request, res: Response, next: NextFunction): void {
  upload.single("file")(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        res.status(400).json({ error: "El archivo supera el tamaño máximo permitido (80 MB)." });
        return;
      }
      res.status(400).json({ error: err.message });
      return;
    }
    if (err) {
      res.status(400).json({ error: String((err as Error).message ?? err) });
      return;
    }
    next();
  });
}

export const mediaRouter = Router();

mediaRouter.post("/upload", authWriteLimiter, requireChild, uploadSingleMiddleware, postMediaUpload);
