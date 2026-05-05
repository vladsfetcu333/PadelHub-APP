import type { RegisterInput, LoginInput, ChangePasswordInput, AuthResponse } from '@padel/shared';
import { prisma } from '../lib/prisma.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { signToken } from '../lib/jwt.js';
import { toSelfUser } from '../lib/userDto.js';
import { badRequest, conflict, notFound, unauthorized } from '../lib/httpError.js';

export async function register(input: RegisterInput): Promise<AuthResponse> {
  const existingEmail = await prisma.user.findUnique({ where: { email: input.email } });
  if (existingEmail) throw conflict('Email is already in use');

  const existingUsername = await prisma.user.findUnique({ where: { username: input.username } });
  if (existingUsername) throw conflict('Username is already taken');

  const passwordHash = await hashPassword(input.password);
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
    },
  });

  const token = signToken({ userId: user.id, role: user.role });
  return { token, user: toSelfUser(user) };
}

export async function login(input: LoginInput): Promise<AuthResponse> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) throw unauthorized('Invalid credentials');
  if (!user.isActive) throw unauthorized('Account is disabled');

  const ok = await verifyPassword(input.password, user.passwordHash);
  if (!ok) throw unauthorized('Invalid credentials');

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
