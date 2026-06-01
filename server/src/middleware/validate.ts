import type { Request, Response, NextFunction } from 'express';
import type { ZodType } from 'zod';

// Returns middleware that validates `req.body` against a Zod schema. On success
// it replaces req.body with the parsed (and coerced/defaulted) data and calls
// next(). On failure it responds 400 with a list of field errors.
export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: 'Validation failed',
        details: result.error.issues.map((i) => ({
          field: i.path.join('.') || '(body)',
          message: i.message,
        })),
      });
      return;
    }
    req.body = result.data;
    next();
  };
}
