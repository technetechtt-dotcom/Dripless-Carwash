import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';

type RequestPart = 'body' | 'query' | 'params';

/**
 * Validates a request part. Unknown keys are stripped via Zod object
 * schemas that use .strip() (default for .object()) rather than .strict().
 */
export const validate =
  (schema: ZodTypeAny, part: RequestPart = 'body') =>
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      const parsed = schema.parse(req[part]);
      req[part] = parsed;
      next();
    } catch (error) {
      next(error);
    }
  };
