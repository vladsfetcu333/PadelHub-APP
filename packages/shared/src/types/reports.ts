/**
 * Report DTOs — three reports required by the thesis advisor.
 */

import type { PublicUserDto, ClubDto } from './api';
import type { TournamentFormat } from '../constants/enums';

type MatchTypeKey = 'OPEN_MATCH' | 'TOURNAMENT' | 'FRIENDLY';

// ─────────────────────────────────────────────────────────────────────
// 1. Player Report
// ─────────────────────────────────────────────────────────────────────

export interface PlayerReportDto {
  user: PublicUserDto;
  matches: {
    total: number;
    last30Days: number;
    last90Days: number;
    winRate: number;
    winRateLast30Days: number;
    byMatchType: Partial<Record<MatchTypeKey, { played: number; won: number }>>;
  };
  rating: {
    current: number;
    currentLevel: number;
    rd: number;
    history: Array<{ date: string; rating: number; rd: number }>;
  };
  clubs: {
    visited: Array<{ club: ClubDto; matchCount: number }>;
  };
  partners: {
    top5: Array<{ partner: PublicUserDto; matchesPlayed: number; winRate: number }>;
  };
  opponents: {
    top5: Array<{ opponent: PublicUserDto; matchesPlayed: number; winRate: number }>;
  };
  comparedToPlatform: {
    avgWinRateAtSameLevel: number;
    avgMatchesPlayedPerMonth: number;
    yourPercentile: number;
  };
  tournaments: {
    participated: number;
    won: number;
    podiumed: number;
  };
}

// ─────────────────────────────────────────────────────────────────────
// 2. Club Report
// ─────────────────────────────────────────────────────────────────────

export interface ClubReportDto {
  club: ClubDto;
  period: { from: string; to: string };
  courts: {
    total: number;
    utilizationByDay: Array<{ courtId: string; courtName: string; utilization: number }>;
  };
  activePlayers: {
    monthly: number;
    new: number;
    returning: number;
  };
  events: {
    tournamentsHeld: number;
    matchesPlayed: number;
  };
  topLocalPlayers: Array<{ user: PublicUserDto; matchCount: number }>;
  levelDistribution: Array<{ levelBucket: string; count: number }>;
  trends: {
    matchesPerWeek: Array<{ week: string; count: number }>;
  };
}

// ─────────────────────────────────────────────────────────────────────
// 3. Admin Report
// ─────────────────────────────────────────────────────────────────────

export interface AdminReportDto {
  period: { from: string; to: string };
  users: {
    total: number;
    activeMonthly: number;
    activeDaily: number;
    newRegistrations: Array<{ date: string; count: number }>;
    levelDistribution: Array<{ levelBucket: string; count: number }>;
    cityDistribution: Array<{ city: string; count: number }>;
    genderDistribution: Array<{ gender: string; count: number }>;
    ageDistribution: Array<{ ageBucket: string; count: number }>;
  };
  matches: {
    total: number;
    byType: Partial<Record<MatchTypeKey, number>>;
    byClub: Array<{ clubId: string; clubName: string; count: number }>;
  };
  tournaments: {
    total: number;
    byFormat: Partial<Record<TournamentFormat, number>>;
  };
  conversionFunnel: {
    registered: number;
    completedProfile: number;
    firstMatchPlayed: number;
    secondMatchPlayed: number;
    activeUsers: number;
  };
}
