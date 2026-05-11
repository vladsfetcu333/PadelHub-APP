/**
 * Tournament service — port of the original Padel Hub tournament logic into
 * our TypeScript/Prisma stack, using persistent User profiles + guest slots.
 *
 * State machine:
 *
 *   DRAFT ─► REGISTRATION ─► IN_PROGRESS ─► COMPLETED
 *                          │                    │
 *                          └─────► CANCELLED ◄──┘
 *
 * Scoring (Americano/Mexicano):
 *   - Each TournamentMatch records games won/lost per team.
 *   - Each player's totalPoints is the cumulative win/draw/loss points from
 *     all matches they played in, plus per-game points.
 *   - Leaderboard: order by (totalPoints desc, totalGamesWon desc).
 *
 * Tournament-to-Match bridge (Glicko-2 integration):
 *   - When a match is between FOUR registered users (no guests), entering
 *     a score also creates a Phase-2 `Match` row that is AUTO-VALIDATED
 *     (organizer is the source of truth — no 4-confirm needed) and the
 *     Glicko-2 update is applied in the same transaction.
 */

import type { Prisma } from '@prisma/client';
import type {
  TournamentCreateInput,
  TournamentListQuery,
  TournamentMatchScoreInput,
  GuestPlayerInput,
  TournamentDto,
  TournamentDisplayDto,
  TournamentLeaderboardEntry,
} from '@padel/shared';
import { prisma } from '../lib/prisma.js';
import {
  toTournamentDto,
  toTournamentPlayerDto,
  toTournamentMatchDto,
} from '../lib/tournamentDto.js';
import { badRequest, conflict, forbidden, notFound } from '../lib/httpError.js';
import {
  generateAmericanoRounds,
  generateMexicanoNextRound,
  type PairingMode,
} from '../lib/tournaments/americanoRotation.js';
import {
  generateBracketRoundOne,
  bracketRoundsCount,
  type BracketTeam,
} from '../lib/tournaments/eliminationBracket.js';
import { applyTournamentMatchRating } from './tournamentRatingBridge.js';

const FULL_INCLUDE = {
  club: { include: { courts: true } },
  organizer: true,
  players: { include: { user: true } },
  rounds: {
    include: {
      matches: {
        include: {
          team1Player1: { include: { user: true } },
          team1Player2: { include: { user: true } },
          team2Player1: { include: { user: true } },
          team2Player2: { include: { user: true } },
        },
      },
    },
    orderBy: { roundNumber: 'asc' },
  },
} as const;

// ─────────────────────────────────────────────────────────────────────
// Create / list / detail
// ─────────────────────────────────────────────────────────────────────

export async function createTournament(
  organizerId: string,
  input: TournamentCreateInput,
): Promise<TournamentDto> {
  const club = await prisma.club.findUnique({ where: { id: input.clubId } });
  if (!club) throw badRequest('Club not found');

  const created = await prisma.tournament.create({
    data: {
      name: input.name,
      description: input.description ?? null,
      format: input.format,
      clubId: input.clubId,
      organizerId,
      startDate: input.startDate,
      endDate: input.endDate ?? null,
      maxPlayers: input.maxPlayers,
      numberOfRounds: input.numberOfRounds ?? null,
      pointsPerGame: input.pointsPerGame,
      matchDurationMinutes: input.matchDurationMinutes,
      numberOfCourts: input.numberOfCourts,
      pairingMode: input.pairingMode,
      winPoints: input.winPoints,
      drawPoints: input.drawPoints,
      lossPoints: input.lossPoints,
      isPublic: input.isPublic,
      requiresApproval: input.requiresApproval,
      minLevel: input.minLevel ?? null,
      maxLevel: input.maxLevel ?? null,
      entryFee: input.entryFee ?? null,
      allowGuests: input.allowGuests,
      status: 'REGISTRATION',
    },
    include: FULL_INCLUDE,
  });
  return toTournamentDto(created);
}

export async function listTournaments(query: TournamentListQuery) {
  const where: Prisma.TournamentWhereInput = {};
  if (query.clubId) where.clubId = query.clubId;
  if (query.status) where.status = query.status;
  if (query.format) where.format = query.format;
  if (query.dateFrom) where.startDate = { gte: query.dateFrom };

  const skip = (query.page - 1) * query.pageSize;
  const [rows, total] = await Promise.all([
    prisma.tournament.findMany({
      where,
      include: FULL_INCLUDE,
      orderBy: { startDate: 'asc' },
      skip,
      take: query.pageSize,
    }),
    prisma.tournament.count({ where }),
  ]);
  return {
    items: rows.map(toTournamentDto),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export async function getTournamentById(id: string): Promise<TournamentDto> {
  const t = await prisma.tournament.findUnique({ where: { id }, include: FULL_INCLUDE });
  if (!t) throw notFound('Tournament not found');
  return toTournamentDto(t);
}

// ─────────────────────────────────────────────────────────────────────
// Player registration / guests
// ─────────────────────────────────────────────────────────────────────

async function assertOrganizer(tournamentId: string, userId: string): Promise<void> {
  const t = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!t) throw notFound('Tournament not found');
  if (t.organizerId !== userId) throw forbidden('Only the organizer can perform this action');
}

export async function registerSelf(tournamentId: string, userId: string): Promise<TournamentDto> {
  const t = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { players: true },
  });
  if (!t) throw notFound('Tournament not found');
  if (t.status !== 'REGISTRATION' && t.status !== 'DRAFT') {
    throw conflict('Tournament is not accepting new players');
  }
  if (t.players.length >= t.maxPlayers) throw conflict('Tournament is full');
  if (t.players.some((p) => p.userId === userId)) throw conflict('Already registered');

  await prisma.tournamentPlayer.create({
    data: { tournamentId, userId },
  });
  return getTournamentById(tournamentId);
}

export async function addGuestPlayer(
  tournamentId: string,
  organizerId: string,
  input: GuestPlayerInput,
): Promise<TournamentDto> {
  await assertOrganizer(tournamentId, organizerId);
  const t = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { players: true },
  });
  if (!t) throw notFound('Tournament not found');
  if (!t.allowGuests) throw badRequest('This tournament does not allow guests');
  if (t.status !== 'REGISTRATION' && t.status !== 'DRAFT') {
    throw conflict('Tournament is not accepting new players');
  }
  if (t.players.length >= t.maxPlayers) throw conflict('Tournament is full');

  await prisma.tournamentPlayer.create({
    data: {
      tournamentId,
      guestName: input.name,
      guestLevel: input.level ?? null,
    },
  });
  return getTournamentById(tournamentId);
}

export async function removePlayer(
  tournamentId: string,
  playerId: string,
  callerId: string,
): Promise<TournamentDto> {
  const t = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { players: true },
  });
  if (!t) throw notFound('Tournament not found');
  const target = t.players.find((p) => p.id === playerId);
  if (!target) throw notFound('Player not found');
  const isSelf = target.userId === callerId;
  const isOrganizer = t.organizerId === callerId;
  if (!isSelf && !isOrganizer) throw forbidden();
  if (t.status === 'IN_PROGRESS' || t.status === 'COMPLETED') {
    throw conflict('Cannot remove players after the tournament has started');
  }
  await prisma.tournamentPlayer.delete({ where: { id: playerId } });
  return getTournamentById(tournamentId);
}

// ─────────────────────────────────────────────────────────────────────
// Start tournament — generate schedule
// ─────────────────────────────────────────────────────────────────────

export async function startTournament(
  tournamentId: string,
  organizerId: string,
): Promise<TournamentDto> {
  await assertOrganizer(tournamentId, organizerId);
  const t = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { players: true },
  });
  if (!t) throw notFound('Tournament not found');
  if (t.status === 'IN_PROGRESS' || t.status === 'COMPLETED') {
    throw conflict('Tournament has already started');
  }
  if (t.players.length < 4) throw badRequest('Need at least 4 players to start');

  if (t.format === 'AMERICANO') {
    return startAmericano(t, t.players);
  }
  if (t.format === 'MEXICANO') {
    return startMexicano(t, t.players);
  }
  if (t.format === 'ELIMINATION') {
    return startElimination(t, t.players);
  }
  throw badRequest('Unknown tournament format');
}

async function startAmericano(
  t: { id: string; numberOfRounds: number | null; numberOfCourts: number; pairingMode: string },
  players: Array<{ id: string }>,
): Promise<TournamentDto> {
  const playerIds = players.map((p) => p.id);
  const rounds = generateAmericanoRounds(
    playerIds,
    t.numberOfRounds ?? Math.min(playerIds.length - 1, 7),
    t.numberOfCourts,
    t.pairingMode as PairingMode,
  );

  await prisma.$transaction(async (tx) => {
    for (let r = 0; r < rounds.length; r++) {
      const round = await tx.tournamentRound.create({
        data: { tournamentId: t.id, roundNumber: r + 1 },
      });
      for (const m of rounds[r]!) {
        await tx.tournamentMatch.create({
          data: {
            roundId: round.id,
            courtNumber: m.courtNumber,
            team1Player1Id: m.team1[0],
            team1Player2Id: m.team1[1],
            team2Player1Id: m.team2[0],
            team2Player2Id: m.team2[1],
          },
        });
      }
    }
    await tx.tournament.update({
      where: { id: t.id },
      data: { status: 'IN_PROGRESS', currentRound: 1 },
    });
  });

  return getTournamentById(t.id);
}

async function startMexicano(
  t: { id: string; numberOfCourts: number },
  players: Array<{ id: string }>,
): Promise<TournamentDto> {
  // Mexicano: only generate round 1 here. Subsequent rounds are produced
  // by completeRound() based on standings.
  const playerIds = players.map((p) => p.id);
  const firstRound = generateMexicanoNextRound(playerIds, new Set(), t.numberOfCourts);

  await prisma.$transaction(async (tx) => {
    const round = await tx.tournamentRound.create({
      data: { tournamentId: t.id, roundNumber: 1 },
    });
    for (const m of firstRound) {
      await tx.tournamentMatch.create({
        data: {
          roundId: round.id,
          courtNumber: m.courtNumber,
          team1Player1Id: m.team1[0],
          team1Player2Id: m.team1[1],
          team2Player1Id: m.team2[0],
          team2Player2Id: m.team2[1],
        },
      });
    }
    await tx.tournament.update({
      where: { id: t.id },
      data: { status: 'IN_PROGRESS', currentRound: 1 },
    });
  });
  return getTournamentById(t.id);
}

async function startElimination(
  t: { id: string; numberOfCourts: number },
  players: Array<{ id: string }>,
): Promise<TournamentDto> {
  // Elimination requires even number of players (=2*teams). Pair by seed
  // (input order = seed order for now).
  if (players.length % 2 !== 0) {
    throw badRequest('Elimination requires an even number of players (2 per team)');
  }
  const teams: BracketTeam[] = [];
  for (let i = 0; i < players.length; i += 2) {
    teams.push({
      id: `team_${i / 2 + 1}`,
      p1: players[i]!.id,
      p2: players[i + 1]!.id,
      seed: i / 2 + 1,
    });
  }
  const round1 = generateBracketRoundOne(teams);

  await prisma.$transaction(async (tx) => {
    const round = await tx.tournamentRound.create({
      data: { tournamentId: t.id, roundNumber: 1 },
    });
    let courtIdx = 0;
    for (const m of round1) {
      // Skip matches with a bye team — auto-advance (no match row created)
      if (m.team1.isBye || m.team2.isBye) continue;
      await tx.tournamentMatch.create({
        data: {
          roundId: round.id,
          courtNumber: (courtIdx % t.numberOfCourts) + 1,
          team1Player1Id: m.team1.p1,
          team1Player2Id: m.team1.p2,
          team2Player1Id: m.team2.p1,
          team2Player2Id: m.team2.p2,
        },
      });
      courtIdx++;
    }
    await tx.tournament.update({
      where: { id: t.id },
      data: {
        status: 'IN_PROGRESS',
        currentRound: 1,
        numberOfRounds: bracketRoundsCount(teams.length),
      },
    });
  });
  return getTournamentById(t.id);
}

// ─────────────────────────────────────────────────────────────────────
// Score entry
// ─────────────────────────────────────────────────────────────────────

export async function enterMatchScore(
  tournamentId: string,
  matchId: string,
  callerId: string,
  input: TournamentMatchScoreInput,
): Promise<TournamentDto> {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) throw notFound('Tournament not found');

  const match = await prisma.tournamentMatch.findUnique({
    where: { id: matchId },
    include: {
      team1Player1: { include: { user: true } },
      team1Player2: { include: { user: true } },
      team2Player1: { include: { user: true } },
      team2Player2: { include: { user: true } },
      round: true,
    },
  });
  if (!match || match.round.tournamentId !== tournamentId) throw notFound('Match not found');

  // Authorization: organizer or one of the 4 players (registered user only)
  const isOrganizer = tournament.organizerId === callerId;
  const playerUsers = [
    match.team1Player1.userId,
    match.team1Player2.userId,
    match.team2Player1.userId,
    match.team2Player2.userId,
  ];
  if (!isOrganizer && !playerUsers.includes(callerId)) {
    throw forbidden('Only the organizer or a match participant can enter the score');
  }

  const previousT1 = match.team1Score;
  const previousT2 = match.team2Score;

  await prisma.$transaction(async (tx) => {
    await tx.tournamentMatch.update({
      where: { id: matchId },
      data: {
        team1Score: input.team1Score,
        team2Score: input.team2Score,
        status: 'VALIDATED',
        completedAt: new Date(),
      },
    });

    // Recompute the 4 players' standings from this match's delta.
    // We support edits: subtract previous values first, then add new.
    await applyScoreDelta(tx, tournament, match, previousT1, previousT2, input);
  });

  // Glicko-2 bridge — only if all 4 players are registered users (no guests).
  const allRegistered =
    match.team1Player1.userId &&
    match.team1Player2.userId &&
    match.team2Player1.userId &&
    match.team2Player2.userId;
  if (allRegistered) {
    await applyTournamentMatchRating(matchId);
  }

  return getTournamentById(tournamentId);
}

async function applyScoreDelta(
  tx: Prisma.TransactionClient,
  tournament: { winPoints: number; drawPoints: number; lossPoints: number },
  match: {
    team1Player1Id: string;
    team1Player2Id: string;
    team2Player1Id: string;
    team2Player2Id: string;
  },
  prevT1: number | null,
  prevT2: number | null,
  next: TournamentMatchScoreInput,
): Promise<void> {
  // Subtract previous contribution (if any)
  if (prevT1 !== null && prevT2 !== null) {
    const prevDelta = computeDelta(tournament, prevT1, prevT2);
    await bumpPlayer(tx, match.team1Player1Id, -prevDelta.t1Points, -prevT1, -prevT2);
    await bumpPlayer(tx, match.team1Player2Id, -prevDelta.t1Points, -prevT1, -prevT2);
    await bumpPlayer(tx, match.team2Player1Id, -prevDelta.t2Points, -prevT2, -prevT1);
    await bumpPlayer(tx, match.team2Player2Id, -prevDelta.t2Points, -prevT2, -prevT1);
  }
  const nextDelta = computeDelta(tournament, next.team1Score, next.team2Score);
  await bumpPlayer(tx, match.team1Player1Id, nextDelta.t1Points, next.team1Score, next.team2Score);
  await bumpPlayer(tx, match.team1Player2Id, nextDelta.t1Points, next.team1Score, next.team2Score);
  await bumpPlayer(tx, match.team2Player1Id, nextDelta.t2Points, next.team2Score, next.team1Score);
  await bumpPlayer(tx, match.team2Player2Id, nextDelta.t2Points, next.team2Score, next.team1Score);
}

function computeDelta(
  tournament: { winPoints: number; drawPoints: number; lossPoints: number },
  t1Score: number,
  t2Score: number,
): { t1Points: number; t2Points: number } {
  if (t1Score > t2Score) return { t1Points: tournament.winPoints, t2Points: tournament.lossPoints };
  if (t1Score < t2Score) return { t1Points: tournament.lossPoints, t2Points: tournament.winPoints };
  return { t1Points: tournament.drawPoints, t2Points: tournament.drawPoints };
}

async function bumpPlayer(
  tx: Prisma.TransactionClient,
  playerId: string,
  pointsDelta: number,
  gamesWonDelta: number,
  gamesLostDelta: number,
): Promise<void> {
  await tx.tournamentPlayer.update({
    where: { id: playerId },
    data: {
      totalPoints: { increment: pointsDelta },
      totalGamesWon: { increment: gamesWonDelta },
      totalGamesLost: { increment: gamesLostDelta },
    },
  });
}

// ─────────────────────────────────────────────────────────────────────
// Round lifecycle + Mexicano dynamic next round
// ─────────────────────────────────────────────────────────────────────

export async function completeRound(
  tournamentId: string,
  roundNumber: number,
  organizerId: string,
): Promise<TournamentDto> {
  await assertOrganizer(tournamentId, organizerId);
  const t = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { players: true, rounds: { include: { matches: true } } },
  });
  if (!t) throw notFound('Tournament not found');
  const round = t.rounds.find((r) => r.roundNumber === roundNumber);
  if (!round) throw notFound('Round not found');

  await prisma.tournamentRound.update({
    where: { id: round.id },
    data: { completedAt: new Date() },
  });

  // For Mexicano: generate the next round dynamically from current standings.
  if (t.format === 'MEXICANO') {
    const totalRounds = t.numberOfRounds ?? 4;
    if (roundNumber < totalRounds) {
      const ranked = [...t.players].sort(
        (a, b) => b.totalPoints - a.totalPoints || b.totalGamesWon - a.totalGamesWon,
      );
      const previousPairs = collectPreviousPairs(t.rounds);
      const next = generateMexicanoNextRound(
        ranked.map((p) => p.id),
        previousPairs,
        t.numberOfCourts,
      );
      await prisma.$transaction(async (tx) => {
        const newRound = await tx.tournamentRound.create({
          data: { tournamentId: t.id, roundNumber: roundNumber + 1 },
        });
        for (const m of next) {
          await tx.tournamentMatch.create({
            data: {
              roundId: newRound.id,
              courtNumber: m.courtNumber,
              team1Player1Id: m.team1[0],
              team1Player2Id: m.team1[1],
              team2Player1Id: m.team2[0],
              team2Player2Id: m.team2[1],
            },
          });
        }
        await tx.tournament.update({
          where: { id: t.id },
          data: { currentRound: roundNumber + 1 },
        });
      });
    }
  }

  return getTournamentById(tournamentId);
}

function collectPreviousPairs(
  rounds: Array<{
    matches: Array<{
      team1Player1Id: string;
      team1Player2Id: string;
      team2Player1Id: string;
      team2Player2Id: string;
    }>;
  }>,
): Set<string> {
  const set = new Set<string>();
  const key = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  for (const r of rounds) {
    for (const m of r.matches) {
      set.add(key(m.team1Player1Id, m.team1Player2Id));
      set.add(key(m.team2Player1Id, m.team2Player2Id));
    }
  }
  return set;
}

// ─────────────────────────────────────────────────────────────────────
// Complete tournament — final standings
// ─────────────────────────────────────────────────────────────────────

export async function completeTournament(
  tournamentId: string,
  organizerId: string,
): Promise<TournamentDto> {
  await assertOrganizer(tournamentId, organizerId);
  const t = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { players: true },
  });
  if (!t) throw notFound('Tournament not found');

  const ranked = [...t.players].sort(
    (a, b) => b.totalPoints - a.totalPoints || b.totalGamesWon - a.totalGamesWon,
  );

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < ranked.length; i++) {
      await tx.tournamentPlayer.update({
        where: { id: ranked[i]!.id },
        data: { finalRank: i + 1 },
      });
    }
    await tx.tournament.update({
      where: { id: tournamentId },
      data: { status: 'COMPLETED', endDate: t.endDate ?? new Date() },
    });
  });

  return getTournamentById(tournamentId);
}

// ─────────────────────────────────────────────────────────────────────
// Leaderboard + TV display
// ─────────────────────────────────────────────────────────────────────

export async function getLeaderboard(tournamentId: string): Promise<TournamentLeaderboardEntry[]> {
  const players = await prisma.tournamentPlayer.findMany({
    where: { tournamentId },
    include: { user: true },
    orderBy: [{ totalPoints: 'desc' }, { totalGamesWon: 'desc' }],
  });
  return players.map((p, i) => ({
    rank: i + 1,
    player: toTournamentPlayerDto(p),
  }));
}

export async function getDisplayPayload(tournamentId: string): Promise<TournamentDisplayDto> {
  const t = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: FULL_INCLUDE,
  });
  if (!t) throw notFound('Tournament not found');

  const currentRound = t.rounds.find((r) => r.roundNumber === t.currentRound);
  const nextRound = t.rounds.find((r) => r.roundNumber === t.currentRound + 1);
  const leaderboard = await getLeaderboard(tournamentId);

  return {
    tournament: {
      id: t.id,
      name: t.name,
      format: t.format as TournamentDto['format'],
      currentRound: t.currentRound,
      status: t.status as TournamentDto['status'],
    },
    currentRoundMatches: currentRound?.matches.map(toTournamentMatchDto) ?? [],
    nextRoundPreview: nextRound ? nextRound.matches.map(toTournamentMatchDto) : null,
    leaderboardTop10: leaderboard.slice(0, 10),
  };
}
