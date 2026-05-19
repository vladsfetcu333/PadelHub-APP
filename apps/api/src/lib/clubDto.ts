import type { Club, Court } from '@prisma/client';
import type {
  ClubDto,
  ClubPhotoCategory,
  ClubPhotoDto,
  CourtDto,
  CourtType,
  CourtLocation,
} from '@padel/shared';
import { PHOTO_CATEGORIES } from '@padel/shared';

/**
 * Coerce the raw photos value (now Prisma `Json`) into a typed
 * ClubPhotoDto[]. Tolerates legacy URL strings (which were the shape
 * before the 20260519080000_photos_to_jsonb migration backfilled them)
 * and ignores entries that don't validate.
 */
const parsePhotos = (raw: unknown): ClubPhotoDto[] => {
  if (!Array.isArray(raw)) return [];
  const out: ClubPhotoDto[] = [];
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    // Tolerate legacy plain-URL strings — promote them to MAIN/order=i.
    if (typeof item === 'string') {
      out.push({ url: item, category: 'MAIN', order: i });
      continue;
    }
    if (
      typeof item === 'object' &&
      item !== null &&
      typeof (item as Record<string, unknown>)['url'] === 'string'
    ) {
      const obj = item as Record<string, unknown>;
      const category = (
        typeof obj['category'] === 'string' &&
        PHOTO_CATEGORIES.includes(obj['category'] as ClubPhotoCategory)
          ? obj['category']
          : 'MAIN'
      ) as ClubPhotoCategory;
      const photo: ClubPhotoDto = {
        url: obj['url'] as string,
        category,
        order: typeof obj['order'] === 'number' ? obj['order'] : i,
      };
      if (typeof obj['caption'] === 'string') photo.caption = obj['caption'];
      out.push(photo);
    }
  }
  return out.sort((a, b) => a.order - b.order);
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
): ClubDto => {
  const photoObjects = parsePhotos(c.photos);
  return {
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
    photos: photoObjects.map((p) => p.url),
    photoObjects,
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
  };
};
