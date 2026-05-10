import type { OpenMatchPost, OpenMatchParticipant, User, Club, Court, Match } from '@prisma/client';
import type {
  OpenMatchDto,
  PreferredSide,
  GenderFilter,
  PlayerGoal,
  OpenMatchStatus,
} from '@padel/shared';
import { toPublicUser } from './userDto.js';
import { toClubDto } from './clubDto.js';

type FullPost = OpenMatchPost & {
  creator: User;
  club: Club & { courts?: Court[] };
  participants: Array<OpenMatchParticipant & { user: User }>;
  resultMatch?: Match | null;
};

export function toOpenMatchDto(p: FullPost): OpenMatchDto {
  return {
    id: p.id,
    creatorId: p.creatorId,
    clubId: p.clubId,
    scheduledAt: p.scheduledAt.toISOString(),
    durationMinutes: p.durationMinutes,
    levelMin: p.levelMin,
    levelMax: p.levelMax,
    sideNeeded: p.sideNeeded as PreferredSide | null,
    genderRequired: p.genderRequired as GenderFilter,
    goalRequired: p.goalRequired as PlayerGoal | null,
    notes: p.notes,
    status: p.status as OpenMatchStatus,
    createdAt: p.createdAt.toISOString(),
    creator: toPublicUser(p.creator),
    club: toClubDto(p.club),
    participants: p.participants.map((part) => ({
      id: part.id,
      userId: part.userId,
      joinedAt: part.joinedAt.toISOString(),
      user: toPublicUser(part.user),
    })),
    resultMatchId: p.resultMatch?.id ?? null,
  };
}
