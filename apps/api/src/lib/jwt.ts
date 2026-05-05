import jwt from 'jsonwebtoken';
import type { UserRole } from '@padel/shared';
import { env } from '../config/env.js';

export interface JwtPayload {
  userId: string;
  role: UserRole;
}

const EXPIRY = '7d';

export const signToken = (payload: JwtPayload): string =>
  jwt.sign(payload, env.jwtSecret, { expiresIn: EXPIRY });

export const verifyToken = (token: string): JwtPayload => {
  const decoded = jwt.verify(token, env.jwtSecret);
  if (typeof decoded === 'string') throw new Error('Invalid token payload');
  return { userId: decoded['userId'] as string, role: decoded['role'] as UserRole };
};
