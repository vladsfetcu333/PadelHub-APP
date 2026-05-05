import type { Club, Court } from '@prisma/client';
import type { ClubDto, CourtDto, CourtType, CourtLocation } from '@padel/shared';

const safeJsonArray = (raw: string): string[] => {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
};

const safeJsonObject = (raw: string): Record<string, { open: string; close: string } | null> => {
  try {
    const v = JSON.parse(raw);
    return typeof v === 'object' && v !== null ? v : {};
  } catch {
    return {};
  }
};

export const toCourtDto = (c: Court): CourtDto => ({
  id: c.id,
  clubId: c.clubId,
  name: c.name,
  type: c.type as CourtType,
  location: c.location as CourtLocation,
  surface: c.surface,
  pricePerHour: c.pricePerHour,
  pricePerHourPeak: c.pricePerHourPeak,
  isActive: c.isActive,
});

export const toClubDto = (
  c: Club & { courts?: Court[] },
  extras?: { distanceKm?: number },
): ClubDto => ({
  id: c.id,
  slug: c.slug,
  name: c.name,
  description: c.description,
  address: c.address,
  city: c.city,
  latitude: c.latitude,
  longitude: c.longitude,
  phone: c.phone,
  email: c.email,
  website: c.website,
  photos: safeJsonArray(c.photos),
  hasLockerRoom: c.hasLockerRoom,
  hasShowers: c.hasShowers,
  hasCafe: c.hasCafe,
  hasParking: c.hasParking,
  hasShop: c.hasShop,
  hasSchool: c.hasSchool,
  hasRacketRental: c.hasRacketRental,
  businessHours: safeJsonObject(c.businessHours),
  isVerified: c.isVerified,
  ownerId: c.ownerId,
  createdAt: c.createdAt.toISOString(),
  courts: (c.courts ?? []).map(toCourtDto),
  ...(extras?.distanceKm != null ? { distanceKm: extras.distanceKm } : {}),
});
