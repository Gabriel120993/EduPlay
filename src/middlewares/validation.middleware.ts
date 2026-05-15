import type { NextFunction, Request, Response } from 'express';
import type { z } from 'zod';
import { formatZodError } from '../lib/validation/schemas';

/**
 * Valida `req.body` con un esquema Zod.
 * Alias semántico de `validateBody` para APIs REST.
 */
export function validate<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: formatZodError(parsed.error), code: 'VALIDATION_ERROR' });
      return;
    }
    req.body = parsed.data as Request['body'];
    next();
  };
}

export function validateParams<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: formatZodError(parsed.error), code: 'VALIDATION_ERROR' });
      return;
    }
    req.params = parsed.data as Request['params'];
    next();
  };
}

export function validateQuery<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: formatZodError(parsed.error), code: 'VALIDATION_ERROR' });
      return;
    }
    req.query = parsed.data as Request['query'];
    next();
  };
}
