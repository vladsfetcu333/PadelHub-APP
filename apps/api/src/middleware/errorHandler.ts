import type { ErrorRequestHandler } from 'express';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  logger.error(err);
  const status = (err as { status?: number }).status ?? 500;
  res.status(status).json({
    error: {
      message: env.isDev ? (err as Error).message : 'Internal server error',
      ...(env.isDev && { stack: (err as Error).stack }),
    },
  });
};
