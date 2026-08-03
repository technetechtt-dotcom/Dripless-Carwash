import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';

type RequestPart = 'body' | 'query' | 'params';

export const validate =
  (schema: ZodTypeAny, part: RequestPart = 'body') =>
  (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.parse(req[part]);
    req[part] = parsed;
    next();
  };
