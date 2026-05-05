// Public DTO shapes returned by the API. The backend is responsible for
// stripping passwordHash and other sensitive fields before serializing.

import type {
  Gender,
  PreferredSide,
  DominantHand,
  PlayStyle,
  PlayFrequency,
  PlayerGoal,
  UserRole,
  GenderFilter,
  ProfileVisibility,
  CourtType,
  CourtLocation,
} from '../constants/enums';

export interface PublicUserDto {
  id: string;
  username: string;
  avatarUrl: string | null;
  firstName: string;
  lastName: string;
  city: string;
  bio: string | null;
  gender: Gender;
  padelLevel: number;
  preferredSide: PreferredSide;
  dominantHand: DominantHand;
  playStyle: PlayStyle | null;
  playFrequency: PlayFrequency;
  goal: PlayerGoal;
  glickoRating: number;
  isCoach: boolean;
  role: UserRole;
  profileVisibility: ProfileVisibility;
  createdAt: string;
}

// Self view adds private fields
export interface SelfUserDto extends PublicUserDto {
  email: string;
  phone: string | null;
  dateOfBirth: string;
  prefMaxLevelDiff: number | null;
  prefGenderFilter: GenderFilter;
  prefAgeMin: number | null;
  prefAgeMax: number | null;
  prefRequireGoalMatch: boolean;
  notifyByEmail: boolean;
  notifyInApp: boolean;
  isVerified: boolean;
  emailVerifiedAt: string | null;
  glickoRD: number;
  glickoVolatility: number;
}

export interface AvailabilityDto {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface CourtDto {
  id: string;
  clubId: string;
  name: string;
  type: CourtType;
  location: CourtLocation;
  surface: string | null;
  pricePerHour: number | null;
  pricePerHourPeak: number | null;
  isActive: boolean;
}

export interface ClubDto {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  email: string | null;
  website: string | null;
  photos: string[];
  hasLockerRoom: boolean;
  hasShowers: boolean;
  hasCafe: boolean;
  hasParking: boolean;
  hasShop: boolean;
  hasSchool: boolean;
  hasRacketRental: boolean;
  businessHours: Record<string, { open: string; close: string } | null>;
  isVerified: boolean;
  ownerId: string | null;
  createdAt: string;
  courts: CourtDto[];
  distanceKm?: number; // present when query includes lat/lng
}

export interface ClubListResponse {
  items: ClubDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuthResponse {
  token: string;
  user: SelfUserDto;
}

export interface ApiError {
  error: { message: string; details?: unknown };
}
