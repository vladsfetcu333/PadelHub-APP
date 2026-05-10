/**
 * Match recording service — score entry, confirmation, dispute, list/detail,
 * and the Glicko-2 rating update triggered on full validation.
 *
 * Flow:
 *
 *    SCHEDULED ─► (any participant enters score) ─► PENDING_CONFIRMATION
 *       ▲                                              │
 *       │                                              ▼ (all 4 confirm)
 *       └──── (creator cancels — not implemented)   VALIDATED
 *                                                      │
 *                                              (rating applied in tx)
 *
 *    PENDING_CONFIRMATION ─► (>48h since scoreEnteredAt) ─► EXPIRED
 *
 * The 48h expiry is handled by a single setInterval in startMatchExpiryJob;
 * the guard `expiryStarted` prevents `tsx watch` from spawning a duplicate
 * during hot reload.
 */

import type { Prisma } from '@prisma/client';
import type {
  MatchDto,
  MatchScoreInput,
  MyMatchesQuery,
  SetScore,
  MatchRatingChange,
} from '@padel/shared';
import { prisma } from '../lib/prisma.js';
import { toMatchDto } from '../lib/matchDto.js';
import { logger } from '../lib/logger.js';
import { conflict, forbidden, notFound } from '../lib/httpError.js';
import { updateDoublesMatch, type Rating } from '../lib/rating/glicko2.js';

const FULL_INCLUDE = {
  team1Player1: true,
  team1Player2: true,
  team2Player1: true,
  team2Player2: true,
  club: { include: { courts: true } },
} as const;

const EIGHT_DAYS_MS = 8 * 24 * 60 * 60 * 1000;
const FORTY_EIGHT_HOURS_MS = 48 * 60 * 60 * 1000;

// ─────────────────────────────────────────────────────────────────────
// Player-position helpers
// ─────────────────────────────────────────────────────────────────────

type Position = 'T1P1' | 'T1P2' | 'T2P1' | 'T2P2';

function positionOf(
  match: {
    team1Player1Id: string;
    team1Player2Id: string;
    team2Player1Id: string;
    team2Player2Id: string;
  },
  userId: string,
): Position | null {
  if (match.team1Player1Id === userId) return 'T1P1';
  if (match.team1Player2Id === userId) return 'T1P2';
  if (match.team2Player1Id === userId) return 'T2P1';
  if (match.team2Player2Id === userId) return 'T2P2';
  return null;
}

function confirmFieldFor(pos: Position): keyof Prisma.MatchUpdateInput {
  switch (pos) {
    case 'T1P1':
      return 'confirmedT1P1';
    case 'T1P2':
      return 'confirmedT1P2';
    case 'T2P1':
      return 'confirmedT2P1';
    case 'T2P2':
      return 'confirmedT2P2';
  }
}

function winnerFromSets(sets: SetScore[]): 1 | 2 {
  let s1 = 0;
  let s2 = 0;
  for (const s of sets) {
    if (s.team1Games > s.team2Games) s1++;
    else s2++;
  }
  return s1 > s2 ? 1 : 2;
}

// ─────────────────────────────────────────────────────────────────────
// Score entry
// ─────────────────────────────────────────────────────────────────────

export async function enterScore(
  matchId: string,
  userId: string,
  input: MatchScoreInput,
): Promise<MatchDto> {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) throw notFound('Match not found');
  const pos = positionOf(match, userId);
  if (!pos) throw forbidden('Only match participants can enter the score');

  if (match.status === 'VALIDATED') throw conflict('Score is already validated');
  if (match.status === 'EXPIRED') throw conflict('Match has expired — score cannot be entered');
  if (match.status === 'CANCELLED') throw conflict('Match was cancelled');

  if (match.scoreSets) {
    // Allow overwriting only by the same user who entered, while still pending,
    // and only if no other player has confirmed yet.
    if (match.scoreEnteredBy !== userId) {
      throw conflict('Another participant has already entered the score; raise a dispute instead.');
    }
    const someoneElseConfirmed =
      (match.confirmedT1P1 && match.team1Player1Id !== userId) ||
      (match.confirmedT1P2 && match.team1Player2Id !== userId) ||
      (match.confirmedT2P1 && match.team2Player1Id !== userId) ||
      (match.confirmedT2P2 && match.team2Player2Id !== userId);
    if (someoneElseConfirmed) {
      throw conflict('Cannot overwrite — another participant has already confirmed');
    }
  }

  const winnerTeam = winnerFromSets(input.sets);

  // Reset all confirmations except the entering user (auto-confirm them)
  const confirmField = confirmFieldFor(pos);
  const updated = await prisma.match.update({
    where: { id: matchId },
    data: {
      scoreSets: JSON.stringify(input.sets),
      winnerTeam,
      scoreEnteredAt: new Date(),
      scoreEnteredBy: userId,
      status: 'PENDING_CONFIRMATION',
      confirmedT1P1: false,
      confirmedT1P2: false,
      confirmedT2P1: false,
      confirmedT2P2: false,
      [confirmField]: true,
    },
    include: FULL_INCLUDE,
  });
  return toMatchDto(updated);
}

// ─────────────────────────────────────────────────────────────────────
// Confirm / dispute
// ─────────────────────────────────────────────────────────────────────

export async function confirmScore(matchId: string, userId: string): Promise<MatchDto> {
  const result = await prisma.$transaction(async (tx) => {
    const match = await tx.match.findUnique({ where: { id: matchId } });
    if (!match) throw notFound('Match not found');
    const pos = positionOf(match, userId);
    if (!pos) throw forbidden('Only match participants can confirm');
    if (match.status !== 'PENDING_CONFIRMATION') {
      throw conflict('Match is not awaiting confirmation');
    }
    const confirmField = confirmFieldFor(pos);

    const updated = await tx.match.update({
      where: { id: matchId },
      data: { [confirmField]: true },
    });

    // Did this push us to all 4 confirmed?
    if (
      updated.confirmedT1P1 &&
      updated.confirmedT1P2 &&
      updated.confirmedT2P1 &&
      updated.confirmedT2P2
    ) {
      await applyMatchRating(tx, matchId);
    }

    return tx.match.findUnique({ where: { id: matchId }, include: FULL_INCLUDE });
  });

  return toMatchDto(result!);
}

export async function disputeMatch(
  matchId: string,
  userId: string,
  reason: string,
): Promise<MatchDto> {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) throw notFound('Match not found');
  if (!positionOf(match, userId)) throw forbidden('Only match participants can dispute');
  if (match.status === 'VALIDATED') {
    throw conflict('Match is already validated — admin intervention required');
  }
  if (match.status === 'EXPIRED' || match.status === 'CANCELLED') {
    throw conflict('Match is no longer active');
  }
  const updated = await prisma.match.update({
    where: { id: matchId },
    data: {
      isDisputed: true,
      disputeReason: reason,
      disputeRaisedBy: userId,
    },
    include: FULL_INCLUDE,
  });
  return toMatchDto(updated);
}

// ─────────────────────────────────────────────────────────────────────
// Rating update (called within the confirm transaction)
// ─────────────────────────────────────────────────────────────────────

type Tx = Prisma.TransactionClient;

async function applyMatchRating(tx: Tx, matchId: string): Promise<void> {
  const match = await tx.match.findUnique({ where: { id: matchId }, include: FULL_INCLUDE });
  if (!match || match.winnerTeam == null) {
    logger.warn({ matchId }, 'applyMatchRating called without a winner');
    return;
  }

  const ratingOf = (u: {
    glickoRating: number;
    glickoRD: number;
    glickoVolatility: number;
  }): Rating => ({
    rating: u.glickoRating,
    rd: u.glickoRD,
    volatility: u.glickoVolatility,
  });

  const t1 = {
    p1: ratingOf(match.team1Player1),
    p2: ratingOf(match.team1Player2),
  };
  const t2 = {
    p1: ratingOf(match.team2Player1),
    p2: ratingOf(match.team2Player2),
  };
  const team1Won = match.winnerTeam === 1;
  const updated = updateDoublesMatch(t1, t2, team1Won);

  const before = {
    [match.team1Player1Id]: t1.p1,
    [match.team1Player2Id]: t1.p2,
    [match.team2Player1Id]: t2.p1,
    [match.team2Player2Id]: t2.p2,
  };
  const after = {
    [match.team1Player1Id]: updated.team1.p1,
    [match.team1Player2Id]: updated.team1.p2,
    [match.team2Player1Id]: updated.team2.p1,
    [match.team2Player2Id]: updated.team2.p2,
  };

  const changes: Record<string, MatchRatingChange> = {};
  for (const id of Object.keys(before)) {
    const b = before[id]!;
    const a = after[id]!;
    changes[id] = {
      before: { rating: b.rating, rd: b.rd, volatility: b.volatility },
      after: { rating: a.rating, rd: a.rd, volatility: a.volatility },
      delta: a.rating - b.rating,
    };
  }

  // Apply ratings to all 4 users + flag the match
  for (const id of Object.keys(after)) {
    const a = after[id]!;
    await tx.user.update({
      where: { id },
      data: { glickoRating: a.rating, glickoRD: a.rd, glickoVolatility: a.volatility },
    });
  }
  await tx.match.update({
    where: { id: matchId },
    data: {
      status: 'VALIDATED',
      isValidated: true,
      ratingApplied: true,
      ratingChanges: JSON.stringify(changes),
      completedAt: new Date(),
    },
  });

  // Mark the originating OpenMatchPost as COMPLETED
  if (match.openMatchId) {
    await tx.openMatchPost.update({
      where: { id: match.openMatchId },
      data: { status: 'COMPLETED' },
    });
  }
}

// ─────────────────────────────────────────────────────────────────────
// Listing
// ─────────────────────────────────────────────────────────────────────

export async function listMyMatches(userId: string, query: MyMatchesQuery) {
  const where: Prisma.MatchWhereInput = {
    OR: [
      { team1Player1Id: userId },
      { team1Player2Id: userId },
      { team2Player1Id: userId },
      { team2Player2Id: userId },
    ],
  };
  if (query.status) where.status = query.status;

  const skip = (query.page - 1) * query.pageSize;
  const [rows, total] = await Promise.all([
    prisma.match.findMany({
      where,
      include: FULL_INCLUDE,
      orderBy: { scheduledAt: 'desc' },
      skip,
      take: query.pageSize,
    }),
    prisma.match.count({ where }),
  ]);
  return {
    items: rows.map(toMatchDto),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export async function getMatchById(matchId: string, viewerId: string | null): Promise<MatchDto> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: FULL_INCLUDE,
  });
  if (!match) throw notFound('Match not found');
  // Currently no privacy guard on matches — all matches are visible to
  // logged-in users (which is fine for a thesis app). Friendships-aware
  // visibility can come later. viewerId is parameter-only for now.
  void viewerId;
  return toMatchDto(match);
}

// ─────────────────────────────────────────────────────────────────────
// 48h expiry cron
// ─────────────────────────────────────────────────────────────────────

let expiryStarted = false;

export function startMatchExpiryJob(): void {
  if (expiryStarted) return; // guard against tsx-watch double-spawn
  expiryStarted = true;

  const ONE_HOUR = 60 * 60 * 1000;
  const tick = async () => {
    try {
      const cutoff = new Date(Date.now() - FORTY_EIGHT_HOURS_MS);
      const result = await prisma.match.updateMany({
        where: {
          status: 'PENDING_CONFIRMATION',
          scoreEnteredAt: { lte: cutoff },
        },
        data: { status: 'EXPIRED' },
      });
      if (result.count > 0) {
        logger.info(`Expired ${result.count} unconfirmed match(es)`);
      }
    } catch (err) {
      logger.error({ err }, 'Match expiry job failed');
    }
  };
  // Fire once on startup so testers don't have to wait an hour
  void tick();
  setInterval(tick, ONE_HOUR);
}

// Avoid unused-warning on EIGHT_DAYS_MS (reserved for future "schedule a match
// > 1 week out" guard — see Phase 3 plans).
void EIGHT_DAYS_MS;
