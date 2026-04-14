import type { Request, Response } from "express";

import { CONTENT_CATEGORY_VALUES } from "../lib/contentCategory";

export function getHealth(_req: Request, res: Response): void {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}

/** Catálogo canónico de categorías (mismo enum que BD y validaciones). */
export function getContentCategories(_req: Request, res: Response): void {
  res.json({ categories: CONTENT_CATEGORY_VALUES });
}
