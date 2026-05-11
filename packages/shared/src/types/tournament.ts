import type {
  TournamentFormat,
  TournamentStatus,
  AmericanoPairingMode,
  MatchStatus,
} from '../constants/enums';
import type { PublicUserDto, ClubDto } from './api';

export interface TournamentPlayerDto {
  id: string;
  userId: string | null;
  guestName: string | null;
  guestLevel: number | null;
  user: PublicUserDto | null;
  seed: number | null;
  totalGamesWon: number;
  totalGamesLost: number;
  totalPoints: number;
  finalRank: number | null;
  joinedAt: string;
  displayName: string; // computed: user.firstName + lastName, or guestName
  displayLevel: number | null; // user.padelLevel or guestLevel
}

export interface TournamentMatchDto {
  id: string;
  roundId: string;
  courtNumber: number | null;
  team1Player1: TournamentPlayerDto;
  team1Player2: TournamentPlayerDto;
  team2Player1: TournamentPlayerDto;
  team2Player2: TournamentPlayerDto;
  team1Score: number | null;
  team2Score: number | null;
  status: MatchStatus;
  startedAt: string | null;
  completedAt: string | null;
  generalMatchId: string | null;
}

export interface TournamentRoundDto {
  id: string;
  roundNumber: number;
  startedAt: string | null;
  completedAt: string | null;
  matches: TournamentMatchDto[];
}

export interface TournamentDto {
  id: string;
  name: string;
  description: string | null;
  format: TournamentFormat;
  clubId: string;
  organizerId: string;
  startDate: string;
  endDate: string | null;
  maxPlayers: number;
  numberOfRounds: number | null;
  pointsPerGame: number;
  matchDurationMinutes: number;
  numberOfCourts: number;
  pairingMode: AmericanoPairingMode;
  winPoints: number;
  drawPoints: number;
  lossPoints: number;
  isPublic: boolean;
  requiresApproval: boolean;
  minLevel: number | null;
  maxLevel: number | null;
  entryFee: number | null;
  allowGuests: boolean;
  status: TournamentStatus;
  currentRound: number;
  createdAt: string;
  updatedAt: string;
  club: ClubDto;
  organizer: PublicUserDto;
  players: TournamentPlayerDto[];
  rounds: TournamentRoundDto[];
}

export interface TournamentListResponse {
  items: TournamentDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TournamentLeaderboardEntry {
  rank: number;
  player: TournamentPlayerDto;
}

export interface TournamentDisplayDto {
  tournament: {
    id: string;
    name: string;
    format: TournamentFormat;
    currentRound: number;
    status: TournamentStatus;
  };
  currentRoundMatches: TournamentMatchDto[];
  nextRoundPreview: TournamentMatchDto[] | null;
  leaderboardTop10: TournamentLeaderboardEntry[];
}
