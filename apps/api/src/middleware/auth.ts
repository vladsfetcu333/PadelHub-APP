import type { RequestHandler } from 'express';
import type { UserRole } from '@padel/shared';
import { verifyToken } from '../lib/jwt.js';
import { prisma } from '../lib/prisma.js';
import { unauthorized, forbidden } from '../lib/httpError.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { userId: string; role: UserRole };
    }
  }
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(unauthorized('Missing bearer token'));
  const token = header.slice(7);
  let payload: { userId: string; role: UserRole };
  try {
    payload = verifyToken(token);
  } catch {
    return next(unauthorized('Invalid or expired token'));
  }

  // Suspension check (Phase 5 Part D). A user whose account is
  // suspended after the token was issued must lose access immediately
  // for all non-admin endpoints. Admins bypass so a wrongly-suspended
  // admin can still recover. The DB hit is a single indexed
  // `SELECT id, isSuspended, isActive, role` — negligible for
  // thesis-scale traffic.
  try {
    const u = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, isSuspended: true, isActive: true, role: true },
    });
    if (!u) return next(unauthorized('Account no longer exists'));
    if (!u.isActive) return next(unauthorized('Contul este dezactivat'));
    if (u.isSuspended && u.role !== 'ADMIN') {
      return next(unauthorized('Contul tău este suspendat. Contactează un administrator.'));
    }
    req.user = payload;
    next();
  } catch (err) {
    next(err);
  }
};

export const requireRole =
  (...roles: UserRole[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden('Insufficient role'));
    next();
  };
