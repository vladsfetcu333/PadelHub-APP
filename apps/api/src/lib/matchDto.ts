import type { Match, User, Club, Court } from '@prisma/client';
import type { MatchDto, MatchRatingChange, MatchStatus, MatchType, SetScore } from '@padel/shared';
import { toPublicUser } from './userDto.js';
import { toClubDto } from './clubDto.js';

type FullMatch = Match & {
  team1Player1: User;
  team1Player2: User;
  team2Player1: User;
  team2Player2: User;
  club: Club & { courts?: Court[] };
};

function parseSets(raw: string | null): SetScore[] | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    if (!Array.isArray(v)) return null;
    return v as SetScore[];
  } catch {
    return null;
  }
}

function parseRatingChanges(raw: string | null): Record<string, MatchRatingChange> | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw);
    if (v && typeof v === 'object') return v as Record<string, MatchRatingChange>;
    return null;
  } catch {
    return null;
  }
}

export function toMatchDto(m: FullMatch): MatchDto {
  return {
    id: m.id,
    type: m.type as MatchType,
    status: m.status as MatchStatus,
    openMatchId: m.openMatchId,
    team1Player1: toPublicUser(m.team1Player1),
    team1Player2: toPublicUser(m.team1Player2),
    team2Player1: toPublicUser(m.team2Player1),
    team2Player2: toPublicUser(m.team2Player2),
    club: toClubDto(m.club),
    courtId: m.courtId,
    scheduledAt: m.scheduledAt.toISOString(),
    startedAt: m.startedAt?.toISOString() ?? null,
    completedAt: m.completedAt?.toISOString() ?? null,
    scoreSets: parseSets(m.scoreSets),
    winnerTeam: m.winnerTeam === 1 ? 1 : m.winnerTeam === 2 ? 2 : null,
    scoreEnteredAt: m.scoreEnteredAt?.toISOString() ?? null,
    scoreEnteredBy: m.scoreEnteredBy,
    confirmedT1P1: m.confirmedT1P1,
    confirmedT1P2: m.confirmedT1P2,
    confirmedT2P1: m.confirmedT2P1,
    confirmedT2P2: m.confirmedT2P2,
    isValidated: m.isValidated,
    ratingApplied: m.ratingApplied,
    ratingChanges: parseRatingChanges(m.ratingChanges),
    isDisputed: m.isDisputed,
    disputeReason: m.disputeReason,
    disputeRaisedBy: m.disputeRaisedBy,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };
}
