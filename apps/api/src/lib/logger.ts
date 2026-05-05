import pino from 'pino';
import { env } from '../config/env.js';

export const logger = pino(
  env.isDev
    ? {
        level: 'debug',
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, ignore: 'pid,hostname' },
        },
      }
    : { level: 'info' },
);
