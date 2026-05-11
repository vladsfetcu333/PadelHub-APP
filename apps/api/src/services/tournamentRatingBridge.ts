/**
 * Tournament → Glicko-2 bridge.
 *
 * When a tournament match has FOUR registered users (no guests) and the
 * organizer enters a score, we create a corresponding Phase-2 `Match` row
 * and apply the Glicko-2 rating update. Unlike peer Open Match scores
 * (which require 4-confirm validation), tournament matches AUTO-VALIDATE
 * because the organizer is the canonical source of truth.
 *
 * The TournamentMatch.generalMatchId @unique field links the two rows.
 * Repeated calls to applyTournamentMatchRating() for the same match are
 * a no-op (we short-circuit if the link already exists).
 */

import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { updateDoublesMatch, type Rating } from '../lib/rating/glicko2.js';
import type { MatchRatingChange } from '@padel/shared';

export async function applyTournamentMatchRating(tmId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const tm = await tx.tournamentMatch.findUnique({
      where: { id: tmId },
      include: {
        team1Player1: { include: { user: true } },
        team1Player2: { include: { user: true } },
        team2Player1: { include: { user: true } },
        team2Player2: { include: { user: true } },
        round: {
          include: { tournament: { include: { club: true } } },
        },
      },
    });
    if (!tm) return;
    if (tm.generalMatchId) return; // already applied
    if (tm.team1Score == null || tm.team2Score == null) return;

    // Must have 4 registered users
    const u1 = tm.team1Player1.user;
    const u2 = tm.team1Player2.user;
    const u3 = tm.team2Player1.user;
    const u4 = tm.team2Player2.user;
    if (!u1 || !u2 || !u3 || !u4) return;

    const ratingOf = (u: {
      glickoRating: number;
      glickoRD: number;
      glickoVolatility: number;
    }): Rating => ({
      rating: u.glickoRating,
      rd: u.glickoRD,
      volatility: u.glickoVolatility,
    });

    const team1Won = tm.team1Score > tm.team2Score;
    const winnerTeam = team1Won ? 1 : tm.team1Score < tm.team2Score ? 2 : null;
    if (winnerTeam === null) return; // ties don't move ratings in our model

    const before = {
      [u1.id]: ratingOf(u1),
      [u2.id]: ratingOf(u2),
      [u3.id]: ratingOf(u3),
      [u4.id]: ratingOf(u4),
    };

    const updated = updateDoublesMatch(
      { p1: before[u1.id]!, p2: before[u2.id]! },
      { p1: before[u3.id]!, p2: before[u4.id]! },
      team1Won,
    );

    const after = {
      [u1.id]: updated.team1.p1,
      [u2.id]: updated.team1.p2,
      [u3.id]: updated.team2.p1,
      [u4.id]: updated.team2.p2,
    };

    const changes: Record<string, MatchRatingChange> = {};
    for (const id of Object.keys(before)) {
      changes[id] = {
        before: {
          rating: before[id]!.rating,
          rd: before[id]!.rd,
          volatility: before[id]!.volatility,
        },
        after: {
          rating: after[id]!.rating,
          rd: after[id]!.rd,
          volatility: after[id]!.volatility,
        },
        delta: after[id]!.rating - before[id]!.rating,
      };
    }

    // Create the auto-validated Match
    const generalMatch = await tx.match.create({
      data: {
        type: 'TOURNAMENT',
        tournamentMatchId: tmId,
        team1Player1Id: u1.id,
        team1Player2Id: u2.id,
        team2Player1Id: u3.id,
        team2Player2Id: u4.id,
        clubId: tm.round.tournament.clubId,
        scheduledAt: tm.round.tournament.startDate,
        startedAt: tm.startedAt ?? null,
        completedAt: tm.completedAt ?? new Date(),
        status: 'VALIDATED',
        scoreSets: JSON.stringify([{ team1Games: tm.team1Score, team2Games: tm.team2Score }]),
        winnerTeam,
        scoreEnteredAt: new Date(),
        scoreEnteredBy: tm.round.tournament.organizerId,
        confirmedT1P1: true,
        confirmedT1P2: true,
        confirmedT2P1: true,
        confirmedT2P2: true,
        isValidated: true,
        ratingApplied: true,
        ratingChanges: JSON.stringify(changes),
      },
    });

    // Apply ratings
    for (const id of Object.keys(after)) {
      const a = after[id]!;
      await tx.user.update({
        where: { id },
        data: { glickoRating: a.rating, glickoRD: a.rd, glickoVolatility: a.volatility },
      });
    }

    // Link
    await tx.tournamentMatch.update({
      where: { id: tmId },
      data: { generalMatchId: generalMatch.id },
    });
  });
}

// Re-export the Prisma type so the matchService file doesn't import from here circularly
export type { Prisma };
