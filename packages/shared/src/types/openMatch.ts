import type { PreferredSide, GenderFilter, PlayerGoal, OpenMatchStatus } from '../constants/enums';
import type { PublicUserDto } from './api';
import type { ClubDto } from './api';

export interface OpenMatchParticipantDto {
  id: string;
  userId: string;
  joinedAt: string;
  user: PublicUserDto;
}

export interface OpenMatchDto {
  id: string;
  creatorId: string;
  clubId: string;
  scheduledAt: string;
  durationMinutes: number;
  levelMin: number | null;
  levelMax: number | null;
  sideNeeded: PreferredSide | null;
  genderRequired: GenderFilter;
  goalRequired: PlayerGoal | null;
  notes: string | null;
  status: OpenMatchStatus;
  createdAt: string;
  creator: PublicUserDto;
  club: ClubDto;
  participants: OpenMatchParticipantDto[];
  resultMatchId: string | null;
}

export interface OpenMatchListResponse {
  items: OpenMatchDto[];
  total: number;
  page: number;
  pageSize: number;
}
