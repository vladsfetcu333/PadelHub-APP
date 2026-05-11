/**
 * Open Matches service.
 *
 * State machine:
 *
 *    OPEN ── (4th join) ──▶ FULL ── (match validated) ──▶ COMPLETED
 *      │
 *      └── (creator cancels) ──▶ CANCELLED  (only allowed while OPEN)
 *
 * When the 4th participant joins, we:
 *   1. flip status to FULL
 *   2. create a Match row in the same transaction
 *   3. assign players to teams using level-balancing (greedy: sort by
 *      effective level desc, alternate 1, 2, 2, 1 — produces the most
 *      balanced split for 4 players in O(n log n))
 *
 * Eligibility on /join enforces the criteria the creator set: level range,
 * gender, preferred side, goal. Returns 400 + a Romanian-friendly message
 * if any criterion fails.
 */

import type { Prisma } from '@prisma/client';
import type { OpenMatchCreateInput, OpenMatchListQuery, OpenMatchDto } from '@padel/shared';
import { prisma } from '../lib/prisma.js';
import { toOpenMatchDto } from '../lib/openMatchDto.js';
import { badRequest, conflict, forbidden, notFound } from '../lib/httpError.js';
import { clearMatchingCache } from './matchingService.js';
import { createNotification } from './notificationService.js';

const FULL_INCLUDE = {
  creator: true,
  club: { include: { courts: true } },
  participants: { include: { user: true } },
  resultMatch: true,
} as const;

export async function createOpenMatch(
  creatorId: string,
  input: OpenMatchCreateInput,
): Promise<OpenMatchDto> {
  const club = await prisma.club.findUnique({ where: { id: input.clubId } });
  if (!club) throw badRequest('Club not found');

  const created = await prisma.$transaction(async (tx) => {
    const post = await tx.openMatchPost.create({
      data: {
        creatorId,
        clubId: input.clubId,
        scheduledAt: input.scheduledAt,
        durationMinutes: input.durationMinutes,
        levelMin: input.levelMin ?? null,
        levelMax: input.levelMax ?? null,
        sideNeeded: input.sideNeeded ?? null,
        genderRequired: input.genderRequired,
        goalRequired: input.goalRequired ?? null,
        notes: input.notes ?? null,
      },
    });
    // Creator is automatically participant #1
    await tx.openMatchParticipant.create({
      data: { openMatchId: post.id, userId: creatorId },
    });
    const full = await tx.openMatchPost.findUnique({
      where: { id: post.id },
      include: FULL_INCLUDE,
    });
    return full!;
  });

  return toOpenMatchDto(created);
}

export async function listOpenMatches(query: OpenMatchListQuery) {
  const where: Prisma.OpenMatchPostWhereInput = {};
  if (query.status) where.status = query.status;
  if (query.city) where.club = { city: { contains: query.city } };
  if (query.dateFrom || query.dateTo) {
    where.scheduledAt = {};
    if (query.dateFrom) where.scheduledAt.gte = query.dateFrom;
    if (query.dateTo) where.scheduledAt.lte = query.dateTo;
  }
  // levelMin/levelMax filters on the post's required range — we surface posts
  // that overlap the queried band rather than strictly contain it.
  if (query.levelMin != null) {
    where.OR = [{ levelMax: null }, { levelMax: { gte: query.levelMin } }];
  }
  if (query.levelMax != null) {
    const upper = [{ levelMin: null }, { levelMin: { lte: query.levelMax } }];
    where.AND = where.AND ? [...(where.AND as object[]), { OR: upper }] : [{ OR: upper }];
  }

  const skip = (query.page - 1) * query.pageSize;
  const [rows, total] = await Promise.all([
    prisma.openMatchPost.findMany({
      where,
      include: FULL_INCLUDE,
      orderBy: { scheduledAt: 'asc' },
      skip,
      take: query.pageSize,
    }),
    prisma.openMatchPost.count({ where }),
  ]);

  return {
    items: rows.map(toOpenMatchDto),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}

export async function getOpenMatchById(id: string): Promise<OpenMatchDto> {
  const post = await prisma.openMatchPost.findUnique({
    where: { id },
    include: FULL_INCLUDE,
  });
  if (!post) throw notFound('Open match not found');
  return toOpenMatchDto(post);
}

// ─────────────────────────────────────────────────────────────────────
// Join eligibility — applies the creator's criteria to the joining user
// ─────────────────────────────────────────────────────────────────────

interface JoinerCheck {
  ok: true;
}
interface JoinerReject {
  ok: false;
  reason: string;
}

function checkEligibility(
  post: {
    levelMin: number | null;
    levelMax: number | null;
    sideNeeded: string | null;
    genderRequired: string;
    goalRequired: string | null;
  },
  user: { padelLevel: number; preferredSide: string; gender: string; goal: string },
): JoinerCheck | JoinerReject {
  if (post.levelMin != null && user.padelLevel < post.levelMin) {
    return { ok: false, reason: `Nivelul minim cerut este ${post.levelMin}` };
  }
  if (post.levelMax != null && user.padelLevel > post.levelMax) {
    return { ok: false, reason: `Nivelul maxim acceptat este ${post.levelMax}` };
  }
  if (post.sideNeeded && user.preferredSide !== post.sideNeeded && user.preferredSide !== 'BOTH') {
    return { ok: false, reason: `Se caută jucător pe partea ${post.sideNeeded}` };
  }
  if (post.genderRequired === 'MALE_ONLY' && user.gender !== 'MALE') {
    return { ok: false, reason: 'Match-ul este doar pentru bărbați' };
  }
  if (post.genderRequired === 'FEMALE_ONLY' && user.gender !== 'FEMALE') {
    return { ok: false, reason: 'Match-ul este doar pentru femei' };
  }
  if (post.goalRequired && user.goal !== post.goalRequired) {
    return { ok: false, reason: `Obiectiv cerut: ${post.goalRequired}` };
  }
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────
// Team assignment when the 4th joins
// ─────────────────────────────────────────────────────────────────────

/**
 * Greedy level-balanced assignment for 4 players.
 *
 * Sort players by effective level descending. Place them on teams in the
 * pattern T1, T2, T2, T1. This minimises the absolute difference of team
 * sums for any sorted 4-player list — easily proved by case analysis on
 * the four sorted levels (a ≥ b ≥ c ≥ d): the split (a, d) vs (b, c)
 * minimises |a + d − b − c|.
 */
function assignTeams(participants: Array<{ userId: string; user: { padelLevel: number } }>): {
  team1: [string, string];
  team2: [string, string];
} {
  const sorted = [...participants].sort((a, b) => b.user.padelLevel - a.user.padelLevel);
  return {
    team1: [sorted[0]!.userId, sorted[3]!.userId],
    team2: [sorted[1]!.userId, sorted[2]!.userId],
  };
}

export async function joinOpenMatch(matchId: string, userId: string): Promise<OpenMatchDto> {
  const result = await prisma.$transaction(async (tx) => {
    const post = await tx.openMatchPost.findUnique({
      where: { id: matchId },
      include: { participants: { include: { user: true } } },
    });
    if (!post) throw notFound('Open match not found');
    if (post.status !== 'OPEN') throw conflict('Open match is no longer accepting joiners');

    if (post.participants.some((p) => p.userId === userId)) {
      throw conflict('Already joined');
    }
    if (post.participants.length >= 4) {
      throw conflict('Match is already full');
    }

    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) throw notFound('User not found');

    const elig = checkEligibility(post, user);
    if (!elig.ok) throw badRequest(elig.reason);

    await tx.openMatchParticipant.create({
      data: { openMatchId: matchId, userId },
    });

    const newCount = post.participants.length + 1;
    if (newCount === 4) {
      // Refetch with the new participant
      const full = await tx.openMatchPost.findUnique({
        where: { id: matchId },
        include: { participants: { include: { user: true } } },
      });
      const teams = assignTeams(full!.participants);

      await tx.match.create({
        data: {
          type: 'OPEN_MATCH',
          openMatchId: matchId,
          team1Player1Id: teams.team1[0],
          team1Player2Id: teams.team1[1],
          team2Player1Id: teams.team2[0],
          team2Player2Id: teams.team2[1],
          clubId: post.clubId,
          scheduledAt: post.scheduledAt,
          status: 'SCHEDULED',
        },
      });

      await tx.openMatchPost.update({
        where: { id: matchId },
        data: { status: 'FULL' },
      });
    }

    return tx.openMatchPost.findUnique({
      where: { id: matchId },
      include: FULL_INCLUDE,
    });
  });

  clearMatchingCache(); // results may now include fewer free candidates

  // Notify all 4 participants when the match becomes full
  if (result?.status === 'FULL') {
    for (const p of result.participants) {
      void createNotification({
        userId: p.userId,
        type: 'MATCH_SCHEDULED',
        title: 'Match-ul tău este complet!',
        body: `Toți 4 jucătorii s-au înscris pentru match-ul de la ${result.club.name}.`,
        actionUrl: `/open-matches/${result.id}`,
        metadata: { openMatchId: result.id, matchId: result.resultMatch?.id ?? null },
      });
    }
  }
  return toOpenMatchDto(result!);
}

export async function leaveOpenMatch(matchId: string, userId: string): Promise<OpenMatchDto> {
  const post = await prisma.openMatchPost.findUnique({
    where: { id: matchId },
    include: { participants: true },
  });
  if (!post) throw notFound('Open match not found');
  if (post.status === 'FULL')
    throw conflict('Cannot leave a full match — cancel via the match flow');
  if (post.creatorId === userId)
    throw badRequest('Creator must cancel the match instead of leaving');

  await prisma.openMatchParticipant.deleteMany({
    where: { openMatchId: matchId, userId },
  });

  clearMatchingCache();
  const refreshed = await prisma.openMatchPost.findUnique({
    where: { id: matchId },
    include: FULL_INCLUDE,
  });
  return toOpenMatchDto(refreshed!);
}

export async function cancelOpenMatch(matchId: string, userId: string): Promise<void> {
  const post = await prisma.openMatchPost.findUnique({ where: { id: matchId } });
  if (!post) throw notFound('Open match not found');
  if (post.creatorId !== userId) throw forbidden('Only the creator can cancel');
  if (post.status === 'FULL' || post.status === 'COMPLETED') {
    throw conflict('Cannot cancel — match has already been filled or completed');
  }
  await prisma.openMatchPost.update({
    where: { id: matchId },
    data: { status: 'CANCELLED' },
  });
  clearMatchingCache();
}
