import { z } from 'zod';
import { CourtType, CourtLocation } from '../constants/enums';

const lat = z.number().min(-90).max(90);
const lng = z.number().min(-180).max(180);

const BusinessHoursDay = z.object({
  open: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  close: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
});

const BusinessHoursSchema = z
  .object({
    monday: BusinessHoursDay.nullable(),
    tuesday: BusinessHoursDay.nullable(),
    wednesday: BusinessHoursDay.nullable(),
    thursday: BusinessHoursDay.nullable(),
    friday: BusinessHoursDay.nullable(),
    saturday: BusinessHoursDay.nullable(),
    sunday: BusinessHoursDay.nullable(),
  })
  .partial();

export type BusinessHours = z.infer<typeof BusinessHoursSchema>;

export const ClubCreateSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(2000).nullable().optional(),
  address: z.string().min(3).max(200),
  city: z.string().min(1).max(80),
  latitude: lat,
  longitude: lng,
  phone: z.string().max(30).nullable().optional(),
  email: z.string().email().nullable().optional(),
  website: z.string().url().nullable().optional(),
  photos: z.array(z.string().url()).default([]),

  hasLockerRoom: z.boolean().default(false),
  hasShowers: z.boolean().default(false),
  hasCafe: z.boolean().default(false),
  hasParking: z.boolean().default(false),
  hasShop: z.boolean().default(false),
  hasSchool: z.boolean().default(false),
  hasRacketRental: z.boolean().default(false),

  businessHours: BusinessHoursSchema.optional(),
});

export type ClubCreateInput = z.infer<typeof ClubCreateSchema>;

export const ClubUpdateSchema = ClubCreateSchema.partial();
export type ClubUpdateInput = z.infer<typeof ClubUpdateSchema>;

export const CourtCreateSchema = z.object({
  name: z.string().min(1).max(80),
  type: z.enum(CourtType),
  location: z.enum(CourtLocation),
  surface: z.string().max(80).nullable().optional(),
  pricePerHour: z.number().positive().max(10000).nullable().optional(),
  pricePerHourPeak: z.number().positive().max(10000).nullable().optional(),
  isActive: z.boolean().default(true),
});

export type CourtCreateInput = z.infer<typeof CourtCreateSchema>;

export const CourtUpdateSchema = CourtCreateSchema.partial();
export type CourtUpdateInput = z.infer<typeof CourtUpdateSchema>;

export const ClubListQuerySchema = z.object({
  city: z.string().min(1).optional(),
  type: z.enum(CourtType).optional(),
  indoor: z.coerce.boolean().optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().positive().max(500).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type ClubListQuery = z.infer<typeof ClubListQuerySchema>;
