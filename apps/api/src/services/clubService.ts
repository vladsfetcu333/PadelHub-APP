import slugify from 'slugify';
import type { Prisma } from '@prisma/client';
import type {
  ClubCreateInput,
  ClubUpdateInput,
  ClubListQuery,
  CourtCreateInput,
  CourtUpdateInput,
  ClubListResponse,
  UserRole,
} from '@padel/shared';
import { prisma } from '../lib/prisma.js';
import { toClubDto, toCourtDto } from '../lib/clubDto.js';
import { haversineKm, bboxAround } from '../lib/geo.js';
import { badRequest, forbidden, notFound } from '../lib/httpError.js';

async function uniqueSlugFor(name: string): Promise<string> {
  const base = slugify(name, { lower: true, strict: true }) || 'club';
  let candidate = base;
  let n = 2;
  // 50 attempts is way past anything sane; bail out as guard
  for (let i = 0; i < 50; i++) {
    const existing = await prisma.club.findUnique({ where: { slug: candidate } });
    if (!existing) return candidate;
    candidate = `${base}-${n++}`;
  }
  throw badRequest('Unable to generate a unique slug — please rename the club');
}

export async function listClubs(query: ClubListQuery): Promise<ClubListResponse> {
  const where: Prisma.ClubWhereInput = {};
  if (query.city) where.city = { contains: query.city };

  // For court-type / indoor filters we need to filter on the related courts
  if (query.type || query.indoor != null) {
    const courtFilter: Prisma.CourtWhereInput = {};
    if (query.type) courtFilter.type = query.type;
    if (query.indoor === true) courtFilter.location = 'INDOOR';
    if (query.indoor === false) courtFilter.location = 'OUTDOOR';
    where.courts = { some: courtFilter };
  }

  let bbox: ReturnType<typeof bboxAround> | null = null;
  if (query.lat != null && query.lng != null && query.radiusKm != null) {
    bbox = bboxAround(query.lat, query.lng, query.radiusKm);
    where.latitude = { gte: bbox.minLat, lte: bbox.maxLat };
    where.longitude = { gte: bbox.minLng, lte: bbox.maxLng };
  }

  // Fetch a page from the bounding-box-filtered set, then refine with Haversine
  const skip = (query.page - 1) * query.pageSize;

  const [rows, total] = await Promise.all([
    prisma.club.findMany({
      where,
      include: { courts: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take: query.pageSize,
    }),
    prisma.club.count({ where }),
  ]);

  const items = rows
    .map((club) => {
      if (query.lat != null && query.lng != null) {
        const distanceKm = haversineKm(
          { lat: query.lat, lng: query.lng },
          { lat: club.latitude, lng: club.longitude },
        );
        if (query.radiusKm != null && distanceKm > query.radiusKm) return null;
        return toClubDto(club, { distanceKm });
      }
      return toClubDto(club);
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  // If we have a location, sort by distance ascending
  if (query.lat != null && query.lng != null) {
    items.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
  }

  return { items, total, page: query.page, pageSize: query.pageSize };
}

export async function getClubBySlug(slug: string) {
  const club = await prisma.club.findUnique({ where: { slug }, include: { courts: true } });
  if (!club) throw notFound('Club not found');
  return toClubDto(club);
}

export async function createClub(actorId: string, actorRole: UserRole, input: ClubCreateInput) {
  const slug = await uniqueSlugFor(input.name);
  const photosJson = JSON.stringify(input.photos ?? []);
  const businessHoursJson = JSON.stringify(input.businessHours ?? {});

  const club = await prisma.club.create({
    data: {
      slug,
      name: input.name,
      description: input.description ?? null,
      address: input.address,
      city: input.city,
      latitude: input.latitude,
      longitude: input.longitude,
      phone: input.phone ?? null,
      email: input.email ?? null,
      website: input.website ?? null,
      photos: photosJson,
      businessHours: businessHoursJson,
      hasLockerRoom: input.hasLockerRoom ?? false,
      hasShowers: input.hasShowers ?? false,
      hasCafe: input.hasCafe ?? false,
      hasParking: input.hasParking ?? false,
      hasShop: input.hasShop ?? false,
      hasSchool: input.hasSchool ?? false,
      hasRacketRental: input.hasRacketRental ?? false,
      // ADMIN can create pre-verified clubs; CLUB_OWNER must be reviewed
      isVerified: actorRole === 'ADMIN',
      ownerId: actorRole === 'CLUB_OWNER' ? actorId : null,
    },
    include: { courts: true },
  });

  return toClubDto(club);
}

async function loadOwnedClub(id: string, actorId: string, actorRole: UserRole) {
  const club = await prisma.club.findUnique({ where: { id } });
  if (!club) throw notFound('Club not found');
  if (actorRole !== 'ADMIN' && club.ownerId !== actorId) throw forbidden();
  return club;
}

export async function updateClub(
  id: string,
  actorId: string,
  actorRole: UserRole,
  input: ClubUpdateInput,
) {
  await loadOwnedClub(id, actorId, actorRole);

  const { photos, businessHours, ...rest } = input;
  const data: Prisma.ClubUpdateInput = { ...rest };
  if (photos !== undefined) data.photos = JSON.stringify(photos);
  if (businessHours !== undefined) data.businessHours = JSON.stringify(businessHours);

  const club = await prisma.club.update({ where: { id }, data, include: { courts: true } });
  return toClubDto(club);
}

export async function deleteClub(id: string) {
  // Caller is ADMIN — checked at route level
  await prisma.club.delete({ where: { id } });
}

export async function verifyClub(id: string) {
  const club = await prisma.club.update({
    where: { id },
    data: { isVerified: true },
    include: { courts: true },
  });
  return toClubDto(club);
}

export async function addCourt(
  clubId: string,
  actorId: string,
  actorRole: UserRole,
  input: CourtCreateInput,
) {
  await loadOwnedClub(clubId, actorId, actorRole);
  const court = await prisma.court.create({ data: { clubId, ...input } });
  return toCourtDto(court);
}

export async function updateCourt(
  courtId: string,
  actorId: string,
  actorRole: UserRole,
  input: CourtUpdateInput,
) {
  const court = await prisma.court.findUnique({ where: { id: courtId } });
  if (!court) throw notFound('Court not found');
  await loadOwnedClub(court.clubId, actorId, actorRole);
  const updated = await prisma.court.update({ where: { id: courtId }, data: input });
  return toCourtDto(updated);
}

export async function deleteCourt(courtId: string, actorId: string, actorRole: UserRole) {
  const court = await prisma.court.findUnique({ where: { id: courtId } });
  if (!court) throw notFound('Court not found');
  await loadOwnedClub(court.clubId, actorId, actorRole);
  await prisma.court.delete({ where: { id: courtId } });
}
