import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';
import { HttpError } from '../lib/httpError.js';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: { message: 'Validation failed', details: err.flatten() },
    });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({
      error: { message: err.message, details: err.details },
    });
    return;
  }

  logger.error(err);
  const status = (err as { status?: number }).status ?? 500;
  res.status(status).json({
    error: {
      message: env.isDev ? (err as Error).message : 'Internal server error',
      ...(env.isDev && { stack: (err as Error).stack }),
    },
  });
};
