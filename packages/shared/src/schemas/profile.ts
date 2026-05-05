import { z } from 'zod';
import {
  Gender,
  PreferredSide,
  DominantHand,
  PlayStyle,
  PlayFrequency,
  PlayerGoal,
  GenderFilter,
  ProfileVisibility,
  BIO_MAX_CHARS,
  MIN_AGE_YEARS,
} from '../constants/enums';
import { PadelLevelSchema } from './auth';

export const UpdateProfileSchema = z
  .object({
    username: z
      .string()
      .min(3)
      .max(20)
      .regex(/^[A-Za-z0-9_]+$/),
    phone: z.string().max(30).nullable(),
    avatarUrl: z.string().url().nullable(),
    firstName: z.string().min(1).max(50),
    lastName: z.string().min(1).max(50),
    city: z.string().min(1).max(80),
    bio: z.string().max(BIO_MAX_CHARS).nullable(),

    padelLevel: PadelLevelSchema,
    preferredSide: z.enum(PreferredSide),
    dominantHand: z.enum(DominantHand),
    playStyle: z.enum(PlayStyle).nullable(),
    playFrequency: z.enum(PlayFrequency),
    goal: z.enum(PlayerGoal),
    gender: z.enum(Gender),

    prefMaxLevelDiff: z.number().min(0).max(6).nullable(),
    prefGenderFilter: z.enum(GenderFilter),
    prefAgeMin: z.number().int().min(MIN_AGE_YEARS).max(120).nullable(),
    prefAgeMax: z.number().int().min(MIN_AGE_YEARS).max(120).nullable(),
    prefRequireGoalMatch: z.boolean(),

    notifyByEmail: z.boolean(),
    notifyInApp: z.boolean(),
    profileVisibility: z.enum(ProfileVisibility),
  })
  .partial()
  .refine(
    (data) =>
      data.prefAgeMin == null || data.prefAgeMax == null || data.prefAgeMin <= data.prefAgeMax,
    { message: 'Vârsta minimă nu poate depăși vârsta maximă', path: ['prefAgeMin'] },
  );

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export const AvailabilitySchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(HHMM, 'Format invalid (HH:mm)'),
    endTime: z.string().regex(HHMM, 'Format invalid (HH:mm)'),
  })
  .refine((v) => v.startTime < v.endTime, {
    message: 'Ora de început trebuie să fie înaintea orei de sfârșit',
    path: ['endTime'],
  });

export type AvailabilityInput = z.infer<typeof AvailabilitySchema>;
