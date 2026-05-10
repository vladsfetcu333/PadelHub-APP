import type { MatchStatus, MatchType } from '../constants/enums';
import type { PublicUserDto, ClubDto } from './api';
import type { SetScore } from '../schemas/match';

export interface MatchRatingChange {
  before: { rating: number; rd: number; volatility: number };
  after: { rating: number; rd: number; volatility: number };
  delta: number;
}

export interface MatchDto {
  id: string;
  type: MatchType;
  status: MatchStatus;
  openMatchId: string | null;
  team1Player1: PublicUserDto;
  team1Player2: PublicUserDto;
  team2Player1: PublicUserDto;
  team2Player2: PublicUserDto;
  club: ClubDto;
  courtId: string | null;
  scheduledAt: string;
  startedAt: string | null;
  completedAt: string | null;

  scoreSets: SetScore[] | null;
  winnerTeam: 1 | 2 | null;

  scoreEnteredAt: string | null;
  scoreEnteredBy: string | null;
  confirmedT1P1: boolean;
  confirmedT1P2: boolean;
  confirmedT2P1: boolean;
  confirmedT2P2: boolean;
  isValidated: boolean;

  ratingApplied: boolean;
  /** Keyed by userId */
  ratingChanges: Record<string, MatchRatingChange> | null;

  isDisputed: boolean;
  disputeReason: string | null;
  disputeRaisedBy: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface MatchListResponse {
  items: MatchDto[];
  total: number;
  page: number;
  pageSize: number;
}
