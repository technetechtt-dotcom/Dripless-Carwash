import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { captureException } from '../lib/monitoring.js';

export class HttpError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const notFoundHandler = (_req: Request, res: Response) => {
  res.status(404).json({ message: 'Not found' });
};

export const errorHandler = (
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (error instanceof ZodError) {
    return res.status(400).json({
      message: 'Validation failed',
      details: error.flatten()
    });
  }
  if (error instanceof HttpError) {
    return res.status(error.status).json({
      message: error.message,
      details: error.details
    });
  }
  captureException(error, { requestId: req.requestId, method: req.method, path: req.path });
  return res.status(500).json({ message: 'Internal server error', requestId: req.requestId });
};
