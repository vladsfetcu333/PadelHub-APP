import type {
  UpdateProfileInput,
  AvailabilityInput,
  PublicUserDto,
  SelfUserDto,
  AvailabilityDto,
} from '@padel/shared';
import { MAX_FAVORITE_CLUBS } from '@padel/shared';
import { prisma } from '../lib/prisma.js';
import { toPublicUser, toSelfUser } from '../lib/userDto.js';
import { toClubDto } from '../lib/clubDto.js';
import { badRequest, conflict, notFound, forbidden } from '../lib/httpError.js';

export async function updateMyProfile(userId: string, input: UpdateProfileInput) {
  if (input.username) {
    const taken = await prisma.user.findFirst({
      where: { username: input.username, NOT: { id: userId } },
    });
    if (taken) throw conflict('Username is already taken');
  }
  const user = await prisma.user.update({ where: { id: userId }, data: input });
  return toSelfUser(user);
}

export async function getUserPublic(
  identifier: string,
  viewerId: string | null,
): Promise<PublicUserDto | SelfUserDto> {
  // Allow lookup by id or username
  const user = await prisma.user.findFirst({
    where: { OR: [{ id: identifier }, { username: identifier }] },
  });
  if (!user) throw notFound('User not found');

  if (user.id === viewerId) return toSelfUser(user);

  if (user.profileVisibility === 'PRIVATE') throw forbidden('This profile is private');
  // FRIENDS_ONLY behaves like PUBLIC until friendships are introduced (Phase 2+)

  return toPublicUser(user);
}

export async function listMyAvailabilities(userId: string): Promise<AvailabilityDto[]> {
  const rows = await prisma.availability.findMany({
    where: { userId },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });
  return rows.map((r) => ({
    id: r.id,
    dayOfWeek: r.dayOfWeek,
    startTime: r.startTime,
    endTime: r.endTime,
  }));
}

export async function createAvailability(
  userId: string,
  input: AvailabilityInput,
): Promise<AvailabilityDto> {
  const row = await prisma.availability.create({ data: { userId, ...input } });
  return {
    id: row.id,
    dayOfWeek: row.dayOfWeek,
    startTime: row.startTime,
    endTime: row.endTime,
  };
}

export async function updateAvailability(
  userId: string,
  id: string,
  input: Partial<AvailabilityInput>,
): Promise<AvailabilityDto> {
  const existing = await prisma.availability.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) throw notFound('Availability not found');
  const row = await prisma.availability.update({ where: { id }, data: input });
  return {
    id: row.id,
    dayOfWeek: row.dayOfWeek,
    startTime: row.startTime,
    endTime: row.endTime,
  };
}

export async function deleteAvailability(userId: string, id: string) {
  const existing = await prisma.availability.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) throw notFound('Availability not found');
  await prisma.availability.delete({ where: { id } });
}

export async function listMyFavoriteClubs(userId: string) {
  const rows = await prisma.userFavoriteClub.findMany({
    where: { userId },
    include: { club: { include: { courts: true } } },
    orderBy: { createdAt: 'desc' },
  });
  // Run through toClubDto so the response matches the ClubDto shape
  // (photoObjects + URL-only photos array). Without this, after the
  // Phase 5 photos String → Json migration the raw row leaks
  // object-form photos into `club.photos`, breaking <img src={…[0]}>
  // wherever the favorites are rendered.
  return rows.map((r) => toClubDto(r.club));
}

export async function addFavoriteClub(userId: string, clubId: string) {
  const club = await prisma.club.findUnique({ where: { id: clubId } });
  if (!club) throw notFound('Club not found');

  const count = await prisma.userFavoriteClub.count({ where: { userId } });
  if (count >= MAX_FAVORITE_CLUBS) {
    throw badRequest(`You can favorite at most ${MAX_FAVORITE_CLUBS} clubs`);
  }

  const existing = await prisma.userFavoriteClub.findUnique({
    where: { userId_clubId: { userId, clubId } },
  });
  if (existing) return; // idempotent

  await prisma.userFavoriteClub.create({ data: { userId, clubId } });
}

export async function removeFavoriteClub(userId: string, clubId: string) {
  await prisma.userFavoriteClub
    .delete({ where: { userId_clubId: { userId, clubId } } })
    .catch(() => {
      // Already removed — idempotent
    });
}
