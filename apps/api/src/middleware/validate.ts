import type { RequestHandler } from 'express';
import type { ZodSchema } from 'zod';

type Source = 'body' | 'query' | 'params';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      validated?: { body?: unknown; query?: unknown; params?: unknown };
    }
  }
}

export const validate =
  <T>(schema: ZodSchema<T>, source: Source = 'body'): RequestHandler =>
  (req, _res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) return next(result.error);

    if (source === 'body') {
      // body is plain JSON — safe to reassign
      req.body = result.data;
    }

    // Always also store the parsed (and coerced) value in req.validated
    // so handlers reading query/params get the typed values regardless
    // of Express 5's read-only req.query.
    req.validated ??= {};
    req.validated[source] = result.data;
    next();
  };

export function valid<T>(req: Express.Request, source: Source): T {
  return req.validated?.[source] as T;
}
