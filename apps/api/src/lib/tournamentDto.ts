import type {
  Tournament,
  TournamentPlayer,
  TournamentRound,
  TournamentMatch,
  User,
  Club,
  Court,
} from '@prisma/client';
import type {
  TournamentDto,
  TournamentPlayerDto,
  TournamentRoundDto,
  TournamentMatchDto,
  TournamentFormat,
  TournamentStatus,
  AmericanoPairingMode,
  MatchStatus,
} from '@padel/shared';
import { toPublicUser } from './userDto.js';
import { toClubDto } from './clubDto.js';

export function toTournamentPlayerDto(
  p: TournamentPlayer & { user: User | null },
): TournamentPlayerDto {
  const displayName = p.user ? `${p.user.firstName} ${p.user.lastName}` : (p.guestName ?? 'Guest');
  const displayLevel = p.user ? p.user.padelLevel : p.guestLevel;
  return {
    id: p.id,
    userId: p.userId,
    guestName: p.guestName,
    guestLevel: p.guestLevel,
    user: p.user ? toPublicUser(p.user) : null,
    seed: p.seed,
    totalGamesWon: p.totalGamesWon,
    totalGamesLost: p.totalGamesLost,
    totalPoints: p.totalPoints,
    finalRank: p.finalRank,
    joinedAt: p.joinedAt.toISOString(),
    displayName,
    displayLevel,
  };
}

type FullMatch = TournamentMatch & {
  team1Player1: TournamentPlayer & { user: User | null };
  team1Player2: TournamentPlayer & { user: User | null };
  team2Player1: TournamentPlayer & { user: User | null };
  team2Player2: TournamentPlayer & { user: User | null };
};

export function toTournamentMatchDto(m: FullMatch): TournamentMatchDto {
  return {
    id: m.id,
    roundId: m.roundId,
    courtNumber: m.courtNumber,
    team1Player1: toTournamentPlayerDto(m.team1Player1),
    team1Player2: toTournamentPlayerDto(m.team1Player2),
    team2Player1: toTournamentPlayerDto(m.team2Player1),
    team2Player2: toTournamentPlayerDto(m.team2Player2),
    team1Score: m.team1Score,
    team2Score: m.team2Score,
    status: m.status as MatchStatus,
    startedAt: m.startedAt?.toISOString() ?? null,
    completedAt: m.completedAt?.toISOString() ?? null,
    generalMatchId: m.generalMatchId,
  };
}

export function toTournamentRoundDto(
  r: TournamentRound & { matches: FullMatch[] },
): TournamentRoundDto {
  return {
    id: r.id,
    roundNumber: r.roundNumber,
    startedAt: r.startedAt?.toISOString() ?? null,
    completedAt: r.completedAt?.toISOString() ?? null,
    matches: r.matches.map(toTournamentMatchDto),
  };
}

type FullTournament = Tournament & {
  club: Club & { courts?: Court[] };
  organizer: User;
  players: Array<TournamentPlayer & { user: User | null }>;
  rounds: Array<TournamentRound & { matches: FullMatch[] }>;
};

export function toTournamentDto(t: FullTournament): TournamentDto {
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    format: t.format as TournamentFormat,
    clubId: t.clubId,
    organizerId: t.organizerId,
    startDate: t.startDate.toISOString(),
    endDate: t.endDate?.toISOString() ?? null,
    maxPlayers: t.maxPlayers,
    numberOfRounds: t.numberOfRounds,
    pointsPerGame: t.pointsPerGame,
    matchDurationMinutes: t.matchDurationMinutes,
    numberOfCourts: t.numberOfCourts,
    pairingMode: t.pairingMode as AmericanoPairingMode,
    winPoints: t.winPoints,
    drawPoints: t.drawPoints,
    lossPoints: t.lossPoints,
    isPublic: t.isPublic,
    requiresApproval: t.requiresApproval,
    minLevel: t.minLevel,
    maxLevel: t.maxLevel,
    entryFee: t.entryFee,
    allowGuests: t.allowGuests,
    status: t.status as TournamentStatus,
    currentRound: t.currentRound,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    club: toClubDto(t.club),
    organizer: toPublicUser(t.organizer),
    players: t.players.map(toTournamentPlayerDto),
    rounds: t.rounds.map(toTournamentRoundDto),
  };
}
