/**
 * Matching service — orchestrates the compatibility scoring algorithm against
 * the player database. Three use-cases, all read-only:
 *
 *   A — findPartners(userId, opts)             — list candidates for a 1:1 partner
 *   B — suggestFullMatches(userId, opts)       — pick top-N partners and propose 2v2 formations
 *   C — recommendForOpenMatch(matchId, limit)  — slot fillers for an open match
 *
 * All three use the same `TtlCache` instance with a 60-second TTL. Cache keys
 * include the inputs so changes to filters invalidate the cache implicitly.
 */

import type { Prisma } from '@prisma/client';
import type { PublicUserDto, UserRole } from '@padel/shared';
import { prisma } from '../lib/prisma.js';
import { toPublicUser } from '../lib/userDto.js';
import { TtlCache } from '../lib/cache.js';
import { notFound } from '../lib/httpError.js';
import { haversineKm } from '../lib/geo.js';
import {
  compatibilityScore,
  type CompatibilityResult,
  type MatchingPlayer,
} from '../lib/matching/compatibilityScore.js';
import { DEFAULT_MIN_SCORE } from '../lib/matching/constants.js';

const ONE_MINUTE = 60_000;

interface CacheEntry {
  kind: 'partners' | 'full-match' | 'open-match';
  payload: unknown;
}
const cache = new TtlCache<string, CacheEntry>(ONE_MINUTE);

export function clearMatchingCache(): void {
  cache.clear();
}

// ─────────────────────────────────────────────────────────────────────
// Loading helpers
// ─────────────────────────────────────────────────────────────────────

type LoadedUser = Awaited<ReturnType<typeof loadMatchingPlayer>>;

async function loadMatchingPlayer(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: {
      availabilities: true,
      favoriteClubs: { select: { clubId: true } },
    },
  });
}

function toMatchingPlayer(u: NonNullable<LoadedUser>): MatchingPlayer {
  return {
    id: u.id,
    gender: u.gender as MatchingPlayer['gender'],
    dateOfBirth: u.dateOfBirth,
    city: u.city,
    padelLevel: u.padelLevel,
    preferredSide: u.preferredSide as MatchingPlayer['preferredSide'],
    glickoRating: u.glickoRating,
    glickoRD: u.glickoRD,
    goal: u.goal as MatchingPlayer['goal'],
    prefMaxLevelDiff: u.prefMaxLevelDiff,
    prefGenderFilter: u.prefGenderFilter as MatchingPlayer['prefGenderFilter'],
    prefAgeMin: u.prefAgeMin,
    prefAgeMax: u.prefAgeMax,
    prefRequireGoalMatch: u.prefRequireGoalMatch,
    availabilities: u.availabilities.map((a) => ({
      dayOfWeek: a.dayOfWeek,
      startTime: a.startTime,
      endTime: a.endTime,
    })),
    favoriteClubIds: u.favoriteClubs.map((f) => f.clubId),
  };
}

// ─────────────────────────────────────────────────────────────────────
// Use-case A — Find partners
// ─────────────────────────────────────────────────────────────────────

export interface FindPartnersOptions {
  minScore?: number;
  limit?: number;
  filters?: {
    clubId?: string;
    cityOnly?: boolean;
    levelRange?: [number, number];
  };
}

export interface PartnerSuggestion {
  player: PublicUserDto;
  score: number;
  breakdown: CompatibilityResult['breakdown'];
  effectiveLevel: number;
  softPenalties: string[];
}

export async function findPartners(
  userId: string,
  opts: FindPartnersOptions = {},
): Promise<PartnerSuggestion[]> {
  const key = `partners:${userId}:${JSON.stringify(opts)}`;
  const cached = cache.get(key);
  if (cached?.kind === 'partners') return cached.payload as PartnerSuggestion[];

  const minScore = opts.minScore ?? DEFAULT_MIN_SCORE;
  const limit = opts.limit ?? 20;

  const me = await loadMatchingPlayer(userId);
  if (!me) throw notFound('User not found');

  const where: Prisma.UserWhereInput = {
    isActive: true,
    id: { not: userId },
    profileVisibility: { in: ['PUBLIC', 'FRIENDS_ONLY'] },
  };

  if (opts.filters?.clubId) {
    where.favoriteClubs = { some: { clubId: opts.filters.clubId } };
  }
  if (opts.filters?.cityOnly) {
    where.city = me.city;
  }
  if (opts.filters?.levelRange) {
    const [lo, hi] = opts.filters.levelRange;
    where.padelLevel = { gte: lo, lte: hi };
  }

  const candidates = await prisma.user.findMany({
    where,
    include: {
      availabilities: true,
      favoriteClubs: { select: { clubId: true } },
    },
  });

  const meMatching = toMatchingPlayer(me);
  const scored: PartnerSuggestion[] = [];
  for (const c of candidates) {
    const candidate = toMatchingPlayer(c);
    const result = compatibilityScore(meMatching, candidate);
    if (result.hardFiltered) continue;
    if (result.score < minScore) continue;
    scored.push({
      player: toPublicUser(c),
      score: Math.round(result.score * 100) / 100,
      breakdown: result.breakdown,
      effectiveLevel: result.effectiveLevel.b,
      softPenalties: result.softPenalties,
    });
  }
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, limit);

  cache.set(key, { kind: 'partners', payload: top });
  return top;
}

// ─────────────────────────────────────────────────────────────────────
// Use-case B — Suggest full 2v2 matches
// ─────────────────────────────────────────────────────────────────────

export interface SuggestFullMatchOptions {
  topPartnersLimit?: number;
  numSuggestions?: number;
}

export interface FullMatchSuggestion {
  formation: {
    team1: [PublicUserDto, PublicUserDto];
    team2: [PublicUserDto, PublicUserDto];
  };
  matchQuality: number;
  avgCompatibility: number;
  teamBalance: number;
}

interface PoolEntry {
  player: MatchingPlayer;
  publicDto: PublicUserDto;
  scoreWithMe: number;
}

function teamLevelBalance(
  t1: [MatchingPlayer, MatchingPlayer],
  t2: [MatchingPlayer, MatchingPlayer],
): number {
  const effLevel = (p: MatchingPlayer) => (p.glickoRD < 200 ? p.glickoRating : p.padelLevel);
  // Use the effective-level proxy from compatibilityScore (same anchor table)
  // — but for team balance we want a single linear quantity; the level is
  // already on the same Playtomic 1.0–7.0 scale once mapped, so we just use
  // padelLevel here as a stable proxy. Refinement (Glicko-derived effective
  // level) can come later if matches show systematic bias.
  const avg = (arr: number[]) => arr.reduce((s, x) => s + x, 0) / arr.length;
  void effLevel; // intentionally unused — see comment above
  const avg1 = avg([t1[0].padelLevel, t1[1].padelLevel]);
  const avg2 = avg([t2[0].padelLevel, t2[1].padelLevel]);
  const levelDiff = Math.abs(avg1 - avg2);
  const levelBalance = Math.max(0, 100 - levelDiff * 60);

  const sideBonus = (a: MatchingPlayer, b: MatchingPlayer): number => {
    const hasL = a.preferredSide === 'LEFT' || b.preferredSide === 'LEFT';
    const hasR = a.preferredSide === 'RIGHT' || b.preferredSide === 'RIGHT';
    const hasBoth = a.preferredSide === 'BOTH' || b.preferredSide === 'BOTH';
    return (hasL && hasR) || hasBoth ? 20 : 0;
  };

  return Math.max(
    0,
    Math.min(100, levelBalance + sideBonus(t1[0], t1[1]) + sideBonus(t2[0], t2[1])),
  );
}

export async function suggestFullMatches(
  userId: string,
  opts: SuggestFullMatchOptions = {},
): Promise<FullMatchSuggestion[]> {
  const topPartnersLimit = opts.topPartnersLimit ?? 20;
  const numSuggestions = opts.numSuggestions ?? 5;

  const key = `full-match:${userId}:${topPartnersLimit}:${numSuggestions}`;
  const cached = cache.get(key);
  if (cached?.kind === 'full-match') return cached.payload as FullMatchSuggestion[];

  // 1. Pull top partners
  const partners = await findPartners(userId, { limit: topPartnersLimit, minScore: 30 });
  if (partners.length < 3) {
    cache.set(key, { kind: 'full-match', payload: [] });
    return [];
  }

  const meRecord = await loadMatchingPlayer(userId);
  if (!meRecord) throw notFound('User not found');
  const meMatching = toMatchingPlayer(meRecord);
  const mePublic = toPublicUser(meRecord);

  // Re-load full MatchingPlayer rows for the pool so we can run compatibility
  // pairwise (partner-to-partner) and the side-bonus check.
  const ids = partners.map((p) => p.player.id);
  const rows = await prisma.user.findMany({
    where: { id: { in: ids } },
    include: { availabilities: true, favoriteClubs: { select: { clubId: true } } },
  });
  const byId = new Map<string, PoolEntry>();
  for (const r of rows) {
    const partner = partners.find((p) => p.player.id === r.id)!;
    byId.set(r.id, {
      player: toMatchingPlayer(r),
      publicDto: toPublicUser(r),
      scoreWithMe: partner.score,
    });
  }
  const pool: PoolEntry[] = ids.map((id) => byId.get(id)!).filter(Boolean);

  // 2. Generate all C(N,3) triples; for each, score the 3 possible formations.
  type Eval = {
    teamA: [MatchingPlayer, MatchingPlayer];
    teamB: [MatchingPlayer, MatchingPlayer];
    avgCompatibility: number;
    teamBalance: number;
    matchQuality: number;
    publicA: [PublicUserDto, PublicUserDto];
    publicB: [PublicUserDto, PublicUserDto];
  };
  const evals: Eval[] = [];

  // Precompute pairwise compatibility for all distinct pairs in the pool ∪ {me}
  const pairCache = new Map<string, number>();
  const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`);
  const pairScore = (a: MatchingPlayer, b: MatchingPlayer): number => {
    const k = pairKey(a.id, b.id);
    const hit = pairCache.get(k);
    if (hit != null) return hit;
    const v = compatibilityScore(a, b).score;
    pairCache.set(k, v);
    return v;
  };

  const n = pool.length;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      for (let k = j + 1; k < n; k++) {
        const Y1 = pool[i]!;
        const Y2 = pool[j]!;
        const Y3 = pool[k]!;
        const formations: Array<{
          t1: [MatchingPlayer, MatchingPlayer];
          t2: [MatchingPlayer, MatchingPlayer];
          publicT1: [PublicUserDto, PublicUserDto];
          publicT2: [PublicUserDto, PublicUserDto];
        }> = [
          {
            t1: [meMatching, Y1.player],
            t2: [Y2.player, Y3.player],
            publicT1: [mePublic, Y1.publicDto],
            publicT2: [Y2.publicDto, Y3.publicDto],
          },
          {
            t1: [meMatching, Y2.player],
            t2: [Y1.player, Y3.player],
            publicT1: [mePublic, Y2.publicDto],
            publicT2: [Y1.publicDto, Y3.publicDto],
          },
          {
            t1: [meMatching, Y3.player],
            t2: [Y1.player, Y2.player],
            publicT1: [mePublic, Y3.publicDto],
            publicT2: [Y1.publicDto, Y2.publicDto],
          },
        ];

        let best: Eval | null = null;
        for (const f of formations) {
          const c12 = pairScore(f.t1[0], f.t1[1]);
          const c34 = pairScore(f.t2[0], f.t2[1]);
          const c13 = pairScore(f.t1[0], f.t2[0]);
          const c14 = pairScore(f.t1[0], f.t2[1]);
          const c23 = pairScore(f.t1[1], f.t2[0]);
          const c24 = pairScore(f.t1[1], f.t2[1]);
          const avgCompatibility = (c12 + c34 + c13 + c14 + c23 + c24) / 6;
          const teamBalance = teamLevelBalance(f.t1, f.t2);
          const matchQuality = 0.6 * avgCompatibility + 0.4 * teamBalance;
          if (!best || matchQuality > best.matchQuality) {
            best = {
              teamA: f.t1,
              teamB: f.t2,
              publicA: f.publicT1,
              publicB: f.publicT2,
              avgCompatibility,
              teamBalance,
              matchQuality,
            };
          }
        }
        if (best) evals.push(best);
      }
    }
  }

  evals.sort((a, b) => b.matchQuality - a.matchQuality);
  const top: FullMatchSuggestion[] = evals.slice(0, numSuggestions).map((e) => ({
    formation: { team1: e.publicA, team2: e.publicB },
    matchQuality: Math.round(e.matchQuality * 100) / 100,
    avgCompatibility: Math.round(e.avgCompatibility * 100) / 100,
    teamBalance: Math.round(e.teamBalance * 100) / 100,
  }));

  cache.set(key, { kind: 'full-match', payload: top });
  return top;
}

// ─────────────────────────────────────────────────────────────────────
// Use-case C — Recommend players for an open match
// ─────────────────────────────────────────────────────────────────────

export interface OpenMatchRecommendation {
  player: PublicUserDto;
  score: number;
}

const KM_OPEN_MATCH_REACH = 25;

export async function recommendForOpenMatch(
  matchId: string,
  limit = 10,
): Promise<OpenMatchRecommendation[]> {
  const key = `open-match:${matchId}:${limit}`;
  const cached = cache.get(key);
  if (cached?.kind === 'open-match') return cached.payload as OpenMatchRecommendation[];

  const post = await prisma.openMatchPost.findUnique({
    where: { id: matchId },
    include: {
      club: true,
      participants: {
        include: {
          user: {
            include: { availabilities: true, favoriteClubs: { select: { clubId: true } } },
          },
        },
      },
    },
  });
  if (!post) throw notFound('Open match not found');

  const currentIds = new Set(post.participants.map((p) => p.userId));
  if (currentIds.size >= 4) {
    cache.set(key, { kind: 'open-match', payload: [] });
    return [];
  }

  const currentPlayers = post.participants.map((p) => toMatchingPlayer(p.user));

  // Eligibility filter at DB level — these are hard requirements
  const dbWhere: Prisma.UserWhereInput = {
    isActive: true,
    id: { notIn: [...currentIds] },
  };
  if (post.levelMin != null && post.levelMax != null) {
    dbWhere.padelLevel = { gte: post.levelMin, lte: post.levelMax };
  } else if (post.levelMin != null) {
    dbWhere.padelLevel = { gte: post.levelMin };
  } else if (post.levelMax != null) {
    dbWhere.padelLevel = { lte: post.levelMax };
  }
  if (post.genderRequired === 'MALE_ONLY') dbWhere.gender = 'MALE';
  if (post.genderRequired === 'FEMALE_ONLY') dbWhere.gender = 'FEMALE';
  if (post.goalRequired) dbWhere.goal = post.goalRequired;
  if (post.sideNeeded) dbWhere.preferredSide = { in: [post.sideNeeded, 'BOTH'] };

  const candidates = await prisma.user.findMany({
    where: dbWhere,
    include: {
      availabilities: true,
      favoriteClubs: { select: { clubId: true } },
    },
  });

  // Time availability: candidate must have a slot on the same day-of-week
  // overlapping with scheduledAt..scheduledAt+duration. This is a soft check
  // (we keep candidates without explicit availability — they may still be
  // free) but used to boost score.
  const scheduledDay = post.scheduledAt.getDay();
  const startMin = post.scheduledAt.getHours() * 60 + post.scheduledAt.getMinutes();
  const endMin = startMin + post.durationMinutes;

  // Reach filter: same city, or distance from club < 25 km when home coords
  // present. We don't store user home coords yet (Phase 1 limitation), so we
  // approximate via city. The KM_OPEN_MATCH_REACH constant and club lat/lng
  // remain available for when user.homeLat/homeLng is added (see PHASE2_REPORT).
  const reachable = (u: { city: string }): boolean => u.city === post.club.city;

  const scored: OpenMatchRecommendation[] = [];
  for (const c of candidates) {
    if (!reachable(c)) continue;

    // Time availability check — at least one slot must overlap window
    const matchesTime = c.availabilities.some((s) => {
      if (s.dayOfWeek !== scheduledDay) return false;
      const [sh, sm] = s.startTime.split(':').map(Number);
      const [eh, em] = s.endTime.split(':').map(Number);
      const sMin = (sh ?? 0) * 60 + (sm ?? 0);
      const eMin = (eh ?? 0) * 60 + (em ?? 0);
      return sMin <= startMin && eMin >= endMin;
    });
    // If candidate declared no slots at all we don't penalise — keep them.
    if (c.availabilities.length > 0 && !matchesTime) continue;

    const candMatching = toMatchingPlayer(c);
    // Avg compatibility with current players
    let sumComp = 0;
    let hardOut = false;
    for (const p of currentPlayers) {
      const r = compatibilityScore(candMatching, p);
      if (r.hardFiltered) {
        hardOut = true;
        break;
      }
      sumComp += r.score;
    }
    if (hardOut) continue;
    const avgComp = currentPlayers.length > 0 ? sumComp / currentPlayers.length : 50;

    // Projected team balance: if we pick this candidate + a current player as
    // team1 vs the remaining two as team2, what's the best balance? Cheap
    // approximation: average teamLevelBalance across the 3 ways to pair the
    // candidate with one current player, when we have ≥ 3 current players.
    let projectedBalance = 50;
    if (currentPlayers.length >= 3) {
      const balances: number[] = [];
      for (let i = 0; i < 3; i++) {
        const teammate = currentPlayers[i]!;
        const opp1 = currentPlayers[(i + 1) % 3]!;
        const opp2 = currentPlayers[(i + 2) % 3]!;
        balances.push(teamLevelBalance([candMatching, teammate], [opp1, opp2]));
      }
      projectedBalance = balances.reduce((s, x) => s + x, 0) / balances.length;
    } else if (currentPlayers.length === 2) {
      projectedBalance = teamLevelBalance(
        [candMatching, currentPlayers[0]!],
        [currentPlayers[1]!, currentPlayers[1]!],
      );
    }

    const finalScore = 0.6 * avgComp + 0.4 * projectedBalance;
    scored.push({
      player: toPublicUser(c),
      score: Math.round(finalScore * 100) / 100,
    });
  }

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, limit);
  cache.set(key, { kind: 'open-match', payload: top });
  return top;
}

// Suppress unused warnings (these are intentionally available for future use
// when User home coords are added — see Phase 1 limitation note).
void haversineKm;
void KM_OPEN_MATCH_REACH;

// Re-exports for caller convenience
export type { CompatibilityResult, UserRole };
