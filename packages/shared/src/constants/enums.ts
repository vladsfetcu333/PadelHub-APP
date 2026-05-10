// Mirrors the Prisma enums. Kept in sync manually since Prisma's generated
// enums are CommonJS and we want a clean cross-runtime export for both
// the backend (Node ESM) and the frontend (Vite/ESM).

export const Gender = ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'] as const;
export type Gender = (typeof Gender)[number];

export const PreferredSide = ['LEFT', 'RIGHT', 'BOTH'] as const;
export type PreferredSide = (typeof PreferredSide)[number];

export const DominantHand = ['LEFT', 'RIGHT'] as const;
export type DominantHand = (typeof DominantHand)[number];

export const PlayStyle = ['DEFENSIVE', 'OFFENSIVE', 'BALANCED', 'BUILDER'] as const;
export type PlayStyle = (typeof PlayStyle)[number];

export const PlayFrequency = ['ONCE_WEEK', 'TWO_THREE_WEEK', 'FOUR_PLUS_WEEK'] as const;
export type PlayFrequency = (typeof PlayFrequency)[number];

export const PlayerGoal = ['RECREATIONAL', 'COMPETITIVE', 'MIXED'] as const;
export type PlayerGoal = (typeof PlayerGoal)[number];

export const UserRole = ['PLAYER', 'COACH', 'CLUB_OWNER', 'ADMIN'] as const;
export type UserRole = (typeof UserRole)[number];

export const GenderFilter = ['ANY', 'MALE_ONLY', 'FEMALE_ONLY'] as const;
export type GenderFilter = (typeof GenderFilter)[number];

export const ProfileVisibility = ['PUBLIC', 'FRIENDS_ONLY', 'PRIVATE'] as const;
export type ProfileVisibility = (typeof ProfileVisibility)[number];

export const CourtType = ['PANORAMIC', 'TRADITIONAL', 'SINGLE_PADEL'] as const;
export type CourtType = (typeof CourtType)[number];

export const CourtLocation = ['INDOOR', 'OUTDOOR'] as const;
export type CourtLocation = (typeof CourtLocation)[number];

export const OpenMatchStatus = ['OPEN', 'FULL', 'CANCELLED', 'COMPLETED'] as const;
export type OpenMatchStatus = (typeof OpenMatchStatus)[number];

export const MatchType = ['OPEN_MATCH', 'TOURNAMENT', 'FRIENDLY'] as const;
export type MatchType = (typeof MatchType)[number];

export const MatchStatus = [
  'SCHEDULED',
  'IN_PROGRESS',
  'PENDING_CONFIRMATION',
  'VALIDATED',
  'EXPIRED',
  'CANCELLED',
] as const;
export type MatchStatus = (typeof MatchStatus)[number];

// Step values allowed for the Playtomic-style padel level (1.0–7.0 in 0.5 increments)
export const PADEL_LEVELS = [
  1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0,
] as const;

export const MAX_FAVORITE_CLUBS = 3;
export const MIN_AGE_YEARS = 14;
export const BIO_MAX_CHARS = 200;
