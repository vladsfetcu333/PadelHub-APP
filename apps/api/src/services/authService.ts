import type { RegisterInput, LoginInput, ChangePasswordInput, AuthResponse } from '@padel/shared';
import { prisma } from '../lib/prisma.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { signToken } from '../lib/jwt.js';
import { toSelfUser } from '../lib/userDto.js';
import { badRequest, conflict, notFound, unauthorized, HttpError } from '../lib/httpError.js';
import { initialRatingFromLevel } from '../lib/rating/glicko2.js';
import { createNotification } from './notificationService.js';

export async function register(input: RegisterInput): Promise<AuthResponse> {
  const existingEmail = await prisma.user.findUnique({ where: { email: input.email } });
  if (existingEmail) throw conflict('Email is already in use');

  const existingUsername = await prisma.user.findUnique({ where: { username: input.username } });
  if (existingUsername) throw conflict('Username is already taken');

  const passwordHash = await hashPassword(input.password);
  // Seed Glicko-2 rating from the declared padel level. The mapping is the same
  // anchor table used by the matching algorithm's "effective level" computation
  // and the profile's rating-to-level display, so all three stay consistent.
  const initialRating = initialRatingFromLevel(input.padelLevel);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      username: input.username,
      firstName: input.firstName,
      lastName: input.lastName,
      dateOfBirth: input.dateOfBirth,
      gender: input.gender,
      city: input.city,
      padelLevel: input.padelLevel,
      preferredSide: input.preferredSide,
      dominantHand: input.dominantHand,
      playFrequency: input.playFrequency,
      goal: input.goal,
      glickoRating: initialRating.rating,
      glickoRD: initialRating.rd,
      glickoVolatility: initialRating.volatility,
    },
  });

  const token = signToken({ userId: user.id, role: user.role });

  // Welcome notification — fire-and-forget, never blocks registration
  void createNotification({
    userId: user.id,
    type: 'WELCOME',
    title: 'Bun venit pe Padel Platform!',
    body: 'Completează-ți disponibilitatea și încearcă să găsești primul tău partener.',
    actionUrl: '/profile',
  });

  return { token, user: toSelfUser(user) };
}

export async function login(input: LoginInput): Promise<AuthResponse> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) throw unauthorized('Email sau parolă incorectă');
  if (!user.isActive) throw unauthorized('Contul este dezactivat');

  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) throw unauthorized('Email sau parolă incorectă');

  // Suspension check — admins are exempt so a suspended admin can still
  // recover the account themselves. Players / club owners are bounced
  // with a clear message containing the documented reason.
  if (user.isSuspended && user.role !== 'ADMIN') {
    const reason = user.suspendedReason ?? 'fără motiv specificat';
    throw new HttpError(
      403,
      `Contul tău este suspendat. Motiv: ${reason}. Contactează un administrator.`,
    );
  }

  const token = signToken({ userId: user.id, role: user.role });
  return { token, user: toSelfUser(user) };
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound('User no longer exists');
  return toSelfUser(user);
}

export async function changePassword(userId: string, input: ChangePasswordInput) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound('User no longer exists');

  const ok = await verifyPassword(input.currentPassword, user.passwordHash);
  if (!ok) throw badRequest('Current password is incorrect');

  const passwordHash = await hashPassword(input.newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}
