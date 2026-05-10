/**
 * Compatibility scoring algorithm between two padel players.
 *
 * The function follows a Multi-Criteria Decision Analysis (MCDA) weighted-sum
 * model with one hard-filter stage. Six components are scored independently
 * on a 0–100 scale and then combined:
 *
 *    raw = Σ wᵢ · scoreᵢ      where Σ wᵢ = 1
 *
 * Components and weights (with-history vs cold-start):
 *
 *    Component       | with-history | cold-start (no history rows yet)
 *    ────────────────|──────────────|──────────────────────────────────
 *    Level (skill)   |    30 %      |    31.6 %
 *    Side (L / R / B)|    20 %      |    21.1 %
 *    Availability    |    20 %      |    21.1 %
 *    Clubs / distance|    15 %      |    15.8 %
 *    Objectives      |    10 %      |    10.5 %
 *    History         |     5 %      |     —
 *
 * After the weighted sum, three multiplicative soft penalties may apply
 * (preferred level diff, age-range, strict-goal-match), and the result is
 * clamped to [0, 100].
 *
 * Design notes for the thesis:
 *  • Hard filter (gender preference) returns score 0 immediately; this is a
 *    constraint, not a soft factor, so it cannot be overridden by other
 *    components.
 *  • The "effective level" used in the level component depends on rating
 *    stability: once a player's RD is below STABLE_RD_THRESHOLD we trust the
 *    Glicko-derived level over their self-declaration. This gives the
 *    self-declared level the role of a Bayesian prior that the actual
 *    match record progressively overrides.
 *  • The cold-start weights are the with-history weights with the 5 %
 *    "history" slice proportionally redistributed: w'ᵢ = wᵢ / (1 - 0.05).
 *  • Distance handling lives outside this function — callers pass
 *    `options.distanceKm` if both players have known coordinates. This
 *    keeps the function pure and trivially testable.
 *
 * The function is pure (input → output) and side-effect-free. Tests in
 * `compatibilityScore.test.ts` cover the perfect-match, worst-match,
 * cold-start, soft-penalty, and edge cases the spec calls out.
 */

import {
  AGE_PREF_PENALTY,
  AVAILABILITY_NEUTRAL,
  AVAILABILITY_WEIGHT,
  CLUBS_FAR,
  CLUBS_MEDIUM,
  CLUBS_MEDIUM_DISTANCE_KM,
  CLUBS_NEAR,
  CLUBS_NEAR_DISTANCE_KM,
  CLUBS_SAME_CITY,
  CLUBS_SHARED_FAVORITE,
  CLUBS_WEIGHT,
  COLD_START_AVAILABILITY_WEIGHT,
  COLD_START_CLUBS_WEIGHT,
  COLD_START_LEVEL_WEIGHT,
  COLD_START_OBJECTIVES_WEIGHT,
  COLD_START_SIDE_WEIGHT,
  GOAL_REQUIRED_PENALTY,
  HISTORY_WEIGHT,
  LEVEL_DIFF_ABOVE,
  LEVEL_DIFF_EXACT,
  LEVEL_DIFF_HALF,
  LEVEL_DIFF_ONE,
  LEVEL_DIFF_ONE_HALF,
  LEVEL_PREF_PENALTY,
  LEVEL_WEIGHT,
  OBJECTIVES_WEIGHT,
  OBJ_MIXED_BRIDGE,
  OBJ_OPPOSED,
  OBJ_SAME,
  SIDE_BOTH,
  SIDE_COMPLEMENT,
  SIDE_SAME,
  SIDE_WEIGHT,
  STABLE_RD_THRESHOLD,
} from './constants.js';
import { LEVEL_TO_RATING_ANCHORS } from '../rating/glicko2.js';

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY';
export type PreferredSide = 'LEFT' | 'RIGHT' | 'BOTH';
export type PlayerGoal = 'RECREATIONAL' | 'COMPETITIVE' | 'MIXED';
export type GenderFilter = 'ANY' | 'MALE_ONLY' | 'FEMALE_ONLY';

export interface MatchingPlayer {
  id: string;
  gender: Gender;
  dateOfBirth: Date;
  city: string;
  /** Self-declared Playtomic-style level 1.0–7.0. */
  padelLevel: number;
  preferredSide: PreferredSide;
  /** Current Glicko rating (display scale). */
  glickoRating: number;
  /** Current Glicko RD; used to decide whether the rating is "stable". */
  glickoRD: number;
  goal: PlayerGoal;
  prefMaxLevelDiff: number | null;
  prefGenderFilter: GenderFilter;
  prefAgeMin: number | null;
  prefAgeMax: number | null;
  prefRequireGoalMatch: boolean;
  availabilities: Array<{ dayOfWeek: number; startTime: string; endTime: string }>;
  favoriteClubIds: string[];
  /** Optional home coordinates — the function itself uses
   *  `options.distanceKm` rather than computing distance here. */
  homeLat?: number;
  homeLng?: number;
}

export interface CompatibilityBreakdown {
  level: number;
  side: number;
  availability: number;
  clubs: number;
  objectives: number;
  history: number;
}

export interface CompatibilityResult {
  /** Final compatibility on a 0–100 scale, post-penalties, clamped. */
  score: number;
  breakdown: CompatibilityBreakdown;
  /** Set if the hard filter blocked this pair (then score = 0 and breakdown is zeroed). */
  hardFiltered: boolean;
  /** Human-readable reasons each soft penalty fired (English; UI translates if needed). */
  softPenalties: string[];
  /** The "effective level" actually used in the level component for each player. */
  effectiveLevel: { a: number; b: number };
}

export interface CompatibilityOptions {
  /** Past matches between A and B — each balanceScore in [0, 100] (higher = more balanced). */
  historyData?: Array<{ matchId: string; balanceScore: number }>;
  /** Pre-computed Haversine distance between A and B's known coords, if both have them. */
  distanceKm?: number;
}

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

const ANCHORS = LEVEL_TO_RATING_ANCHORS;

/**
 * Step 2 — Convert a Glicko rating to a Playtomic-style padel level using
 * piecewise linear interpolation against {@link LEVEL_TO_RATING_ANCHORS}.
 *
 * Only invoked when the player's rating is considered stable
 * (RD < {@link STABLE_RD_THRESHOLD}); otherwise the self-declared level
 * stands.
 */
export function ratingToLevel(rating: number): number {
  if (rating <= ANCHORS[0]![1]) return ANCHORS[0]![0];
  if (rating >= ANCHORS[ANCHORS.length - 1]![1]) return ANCHORS[ANCHORS.length - 1]![0];
  for (let i = 1; i < ANCHORS.length; i++) {
    const [lv1, r1] = ANCHORS[i - 1]!;
    const [lv2, r2] = ANCHORS[i]!;
    if (rating <= r2) {
      const t = (rating - r1) / (r2 - r1);
      return lv1 + t * (lv2 - lv1);
    }
  }
  /* unreachable */ return ANCHORS[ANCHORS.length - 1]![0];
}

function effectiveLevel(p: MatchingPlayer): number {
  return p.glickoRD < STABLE_RD_THRESHOLD ? ratingToLevel(p.glickoRating) : p.padelLevel;
}

function ageYears(dob: Date, now = new Date()): number {
  const ms = now.getTime() - dob.getTime();
  return ms / (365.25 * 24 * 60 * 60 * 1000);
}

// ─────────────────────────────────────────────────────────────────────
// Step 3 — Component scores
// ─────────────────────────────────────────────────────────────────────

/** 3a — level difference. */
export function levelScore(diff: number): number {
  if (diff === 0) return LEVEL_DIFF_EXACT;
  if (diff <= 0.5) return LEVEL_DIFF_HALF;
  if (diff <= 1.0) return LEVEL_DIFF_ONE;
  if (diff <= 1.5) return LEVEL_DIFF_ONE_HALF;
  return LEVEL_DIFF_ABOVE;
}

/** 3b — preferred-side complementarity. */
export function sideScore(a: PreferredSide, b: PreferredSide): number {
  if ((a === 'LEFT' && b === 'RIGHT') || (a === 'RIGHT' && b === 'LEFT')) return SIDE_COMPLEMENT;
  if (a === 'BOTH' || b === 'BOTH') return SIDE_BOTH;
  return SIDE_SAME; // LEFT/LEFT or RIGHT/RIGHT
}

/** Convert "HH:mm" → minutes since midnight. */
function hhmmToMinutes(s: string): number {
  const [h, m] = s.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function totalAvailableMinutes(slots: MatchingPlayer['availabilities']): number {
  let total = 0;
  for (const s of slots) {
    total += Math.max(0, hhmmToMinutes(s.endTime) - hhmmToMinutes(s.startTime));
  }
  return total;
}

function overlapMinutesBetween(
  a: MatchingPlayer['availabilities'],
  b: MatchingPlayer['availabilities'],
): number {
  // Group by day-of-week to avoid the all-pairs cross product when slots are many.
  const byDayA = new Map<number, Array<[number, number]>>();
  for (const s of a) {
    const arr = byDayA.get(s.dayOfWeek) ?? [];
    arr.push([hhmmToMinutes(s.startTime), hhmmToMinutes(s.endTime)]);
    byDayA.set(s.dayOfWeek, arr);
  }
  let total = 0;
  for (const sb of b) {
    const list = byDayA.get(sb.dayOfWeek);
    if (!list) continue;
    const bStart = hhmmToMinutes(sb.startTime);
    const bEnd = hhmmToMinutes(sb.endTime);
    for (const [aStart, aEnd] of list) {
      const lo = Math.max(aStart, bStart);
      const hi = Math.min(aEnd, bEnd);
      if (hi > lo) total += hi - lo;
    }
  }
  return total;
}

/** 3c — availability overlap. */
export function availabilityScore(a: MatchingPlayer, b: MatchingPlayer): number {
  const aTotal = totalAvailableMinutes(a.availabilities);
  const bTotal = totalAvailableMinutes(b.availabilities);
  if (aTotal === 0 || bTotal === 0) return AVAILABILITY_NEUTRAL;
  const overlap = overlapMinutesBetween(a.availabilities, b.availabilities);
  const maxPossible = Math.min(aTotal, bTotal);
  return clamp((overlap / maxPossible) * 100, 0, 100);
}

/** 3d — clubs / location proximity. */
export function clubsScore(a: MatchingPlayer, b: MatchingPlayer, distanceKm?: number): number {
  const aSet = new Set(a.favoriteClubIds);
  for (const id of b.favoriteClubIds) if (aSet.has(id)) return CLUBS_SHARED_FAVORITE;
  if (distanceKm != null && distanceKm < CLUBS_NEAR_DISTANCE_KM) return CLUBS_NEAR;
  if (a.city === b.city) return CLUBS_SAME_CITY;
  if (distanceKm != null && distanceKm < CLUBS_MEDIUM_DISTANCE_KM) return CLUBS_MEDIUM;
  return CLUBS_FAR;
}

/** 3e — goals alignment. */
export function objectivesScore(a: PlayerGoal, b: PlayerGoal): number {
  if (a === b) return OBJ_SAME;
  if (a === 'MIXED' || b === 'MIXED') return OBJ_MIXED_BRIDGE;
  return OBJ_OPPOSED;
}

/** 3f — history balance average. Returns null when no history rows. */
export function historyScore(
  history: Array<{ matchId: string; balanceScore: number }> | undefined,
): number | null {
  if (!history || history.length === 0) return null;
  let sum = 0;
  for (const h of history) sum += h.balanceScore;
  return sum / history.length;
}

// ─────────────────────────────────────────────────────────────────────
// Steps 1, 4, 5, 6 — main entrypoint
// ─────────────────────────────────────────────────────────────────────

function genderHardFilter(a: MatchingPlayer, b: MatchingPlayer): boolean {
  if (a.prefGenderFilter === 'MALE_ONLY' && b.gender !== 'MALE') return true;
  if (a.prefGenderFilter === 'FEMALE_ONLY' && b.gender !== 'FEMALE') return true;
  if (b.prefGenderFilter === 'MALE_ONLY' && a.gender !== 'MALE') return true;
  if (b.prefGenderFilter === 'FEMALE_ONLY' && a.gender !== 'FEMALE') return true;
  return false;
}

const zeroBreakdown = (): CompatibilityBreakdown => ({
  level: 0,
  side: 0,
  availability: 0,
  clubs: 0,
  objectives: 0,
  history: 0,
});

/**
 * Compute the compatibility score between two players.
 *
 * @param a first player
 * @param b second player
 * @param options optional history rows and pre-computed inter-player distance
 */
export function compatibilityScore(
  a: MatchingPlayer,
  b: MatchingPlayer,
  options: CompatibilityOptions = {},
): CompatibilityResult {
  // Step 1 — hard filter
  if (genderHardFilter(a, b)) {
    return {
      score: 0,
      breakdown: zeroBreakdown(),
      hardFiltered: true,
      softPenalties: [],
      effectiveLevel: { a: effectiveLevel(a), b: effectiveLevel(b) },
    };
  }

  // Step 2 — effective levels
  const effA = effectiveLevel(a);
  const effB = effectiveLevel(b);
  const levelDiff = Math.abs(effA - effB);

  // Step 3 — components
  const sLevel = levelScore(levelDiff);
  const sSide = sideScore(a.preferredSide, b.preferredSide);
  const sAvail = availabilityScore(a, b);
  const sClubs = clubsScore(a, b, options.distanceKm);
  const sObj = objectivesScore(a.goal, b.goal);
  const sHist = historyScore(options.historyData); // null = cold start

  // Step 4 — weighted sum
  let raw: number;
  if (sHist === null) {
    raw =
      COLD_START_LEVEL_WEIGHT * sLevel +
      COLD_START_SIDE_WEIGHT * sSide +
      COLD_START_AVAILABILITY_WEIGHT * sAvail +
      COLD_START_CLUBS_WEIGHT * sClubs +
      COLD_START_OBJECTIVES_WEIGHT * sObj;
  } else {
    raw =
      LEVEL_WEIGHT * sLevel +
      SIDE_WEIGHT * sSide +
      AVAILABILITY_WEIGHT * sAvail +
      CLUBS_WEIGHT * sClubs +
      OBJECTIVES_WEIGHT * sObj +
      HISTORY_WEIGHT * sHist;
  }

  // Step 5 — soft penalties
  const softPenalties: string[] = [];
  if (a.prefMaxLevelDiff != null && levelDiff > a.prefMaxLevelDiff) {
    raw *= LEVEL_PREF_PENALTY;
    softPenalties.push(`Level diff ${levelDiff.toFixed(1)} exceeds A.prefMaxLevelDiff`);
  }
  if (b.prefMaxLevelDiff != null && levelDiff > b.prefMaxLevelDiff) {
    raw *= LEVEL_PREF_PENALTY;
    softPenalties.push(`Level diff ${levelDiff.toFixed(1)} exceeds B.prefMaxLevelDiff`);
  }
  const ageA = ageYears(a.dateOfBirth);
  const ageB = ageYears(b.dateOfBirth);
  const ageOut = (target: MatchingPlayer, otherAge: number): boolean =>
    (target.prefAgeMin != null && otherAge < target.prefAgeMin) ||
    (target.prefAgeMax != null && otherAge > target.prefAgeMax);
  if (ageOut(a, ageB)) {
    raw *= AGE_PREF_PENALTY;
    softPenalties.push(`B age ${ageB.toFixed(0)} outside A's age preference`);
  }
  if (ageOut(b, ageA)) {
    raw *= AGE_PREF_PENALTY;
    softPenalties.push(`A age ${ageA.toFixed(0)} outside B's age preference`);
  }
  const recCompPair =
    (a.goal === 'RECREATIONAL' && b.goal === 'COMPETITIVE') ||
    (a.goal === 'COMPETITIVE' && b.goal === 'RECREATIONAL');
  if (a.prefRequireGoalMatch && recCompPair) {
    raw *= GOAL_REQUIRED_PENALTY;
    softPenalties.push(`A requires same goal; RECREATIONAL/COMPETITIVE pair`);
  }
  if (b.prefRequireGoalMatch && recCompPair) {
    raw *= GOAL_REQUIRED_PENALTY;
    softPenalties.push(`B requires same goal; RECREATIONAL/COMPETITIVE pair`);
  }

  // Step 6 — clamp and return
  return {
    score: clamp(raw, 0, 100),
    breakdown: {
      level: sLevel,
      side: sSide,
      availability: sAvail,
      clubs: sClubs,
      objectives: sObj,
      history: sHist ?? 0,
    },
    hardFiltered: false,
    softPenalties,
    effectiveLevel: { a: effA, b: effB },
  };
}
