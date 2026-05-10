/**
 * Compatibility scoring tests — these are the algorithm's safety net.
 *
 * Covers everything the spec calls out:
 *   1. Hard filter triggers correctly
 *   2. Perfect match → close to 100
 *   3. Worst match → close to 0
 *   4. Cold-start weights redistribute proportionally
 *   5. Soft penalties apply multiplicatively
 *   6. Zero availability for both → uses 50 neutral
 *   7. Component-level unit tests (level, side, availability, clubs, goals, history)
 */

import { describe, it, expect } from 'vitest';
import {
  compatibilityScore,
  levelScore,
  sideScore,
  availabilityScore,
  clubsScore,
  objectivesScore,
  historyScore,
  ratingToLevel,
  type MatchingPlayer,
} from './compatibilityScore.js';
import {
  AVAILABILITY_NEUTRAL,
  CLUBS_FAR,
  CLUBS_MEDIUM,
  CLUBS_NEAR,
  CLUBS_SAME_CITY,
  CLUBS_SHARED_FAVORITE,
  HISTORY_WEIGHT,
  LEVEL_DIFF_EXACT,
  LEVEL_DIFF_HALF,
  LEVEL_DIFF_ONE,
  LEVEL_DIFF_ONE_HALF,
  LEVEL_PREF_PENALTY,
  LEVEL_WEIGHT,
  OBJ_MIXED_BRIDGE,
  OBJ_OPPOSED,
  OBJ_SAME,
  SIDE_BOTH,
  SIDE_COMPLEMENT,
  SIDE_SAME,
} from './constants.js';

// ─────────────────────────────────────────────────────────────────────
// Test helpers
// ─────────────────────────────────────────────────────────────────────

const baseFor = (overrides: Partial<MatchingPlayer>): MatchingPlayer => ({
  id: 'X',
  gender: 'MALE',
  // 30 years old — well inside any sensible age preference
  dateOfBirth: new Date(Date.now() - 30 * 365.25 * 24 * 60 * 60 * 1000),
  city: 'București',
  padelLevel: 3.5,
  preferredSide: 'BOTH',
  glickoRating: 1500,
  glickoRD: 350, // unstable → uses self-declared level
  goal: 'RECREATIONAL',
  prefMaxLevelDiff: null,
  prefGenderFilter: 'ANY',
  prefAgeMin: null,
  prefAgeMax: null,
  prefRequireGoalMatch: false,
  availabilities: [],
  favoriteClubIds: [],
  ...overrides,
});

// ─────────────────────────────────────────────────────────────────────
// Component-level tests
// ─────────────────────────────────────────────────────────────────────

describe('levelScore', () => {
  it('returns the discrete-tier values per the spec', () => {
    expect(levelScore(0)).toBe(LEVEL_DIFF_EXACT); // 100
    expect(levelScore(0.5)).toBe(LEVEL_DIFF_HALF); // 80
    expect(levelScore(1.0)).toBe(LEVEL_DIFF_ONE); // 50
    expect(levelScore(1.5)).toBe(LEVEL_DIFF_ONE_HALF); // 20
    expect(levelScore(2.0)).toBe(0);
    expect(levelScore(3.5)).toBe(0);
  });
});

describe('sideScore', () => {
  it('LEFT + RIGHT (and RIGHT + LEFT) are perfectly complementary', () => {
    expect(sideScore('LEFT', 'RIGHT')).toBe(SIDE_COMPLEMENT);
    expect(sideScore('RIGHT', 'LEFT')).toBe(SIDE_COMPLEMENT);
  });
  it('BOTH + anything is the flexible bridge', () => {
    expect(sideScore('BOTH', 'LEFT')).toBe(SIDE_BOTH);
    expect(sideScore('RIGHT', 'BOTH')).toBe(SIDE_BOTH);
    expect(sideScore('BOTH', 'BOTH')).toBe(SIDE_BOTH);
  });
  it('LEFT + LEFT or RIGHT + RIGHT is the worst case', () => {
    expect(sideScore('LEFT', 'LEFT')).toBe(SIDE_SAME);
    expect(sideScore('RIGHT', 'RIGHT')).toBe(SIDE_SAME);
  });
});

describe('availabilityScore', () => {
  it('returns the neutral 50 when either player has no declared slots', () => {
    const a = baseFor({ availabilities: [] });
    const b = baseFor({ availabilities: [{ dayOfWeek: 1, startTime: '18:00', endTime: '20:00' }] });
    expect(availabilityScore(a, b)).toBe(AVAILABILITY_NEUTRAL);
    expect(availabilityScore(b, a)).toBe(AVAILABILITY_NEUTRAL);
  });
  it('returns 100 when the smaller schedule is fully covered by the larger', () => {
    const a = baseFor({ availabilities: [{ dayOfWeek: 1, startTime: '17:00', endTime: '22:00' }] });
    const b = baseFor({ availabilities: [{ dayOfWeek: 1, startTime: '18:00', endTime: '20:00' }] });
    expect(availabilityScore(a, b)).toBeCloseTo(100, 5);
  });
  it('returns the correct ratio for partial overlap', () => {
    // A: 18:00–20:00 (120 min), B: 19:00–21:00 (120 min), overlap 19:00–20:00 (60 min)
    // 60 / min(120, 120) = 50
    const a = baseFor({ availabilities: [{ dayOfWeek: 2, startTime: '18:00', endTime: '20:00' }] });
    const b = baseFor({ availabilities: [{ dayOfWeek: 2, startTime: '19:00', endTime: '21:00' }] });
    expect(availabilityScore(a, b)).toBeCloseTo(50, 5);
  });
  it('returns 0 when slots are on disjoint days', () => {
    const a = baseFor({ availabilities: [{ dayOfWeek: 1, startTime: '18:00', endTime: '20:00' }] });
    const b = baseFor({ availabilities: [{ dayOfWeek: 3, startTime: '18:00', endTime: '20:00' }] });
    expect(availabilityScore(a, b)).toBe(0);
  });
});

describe('clubsScore', () => {
  const a = baseFor({ city: 'București', favoriteClubIds: ['c1', 'c2'] });
  it('shared favorite club → 100', () => {
    const b = baseFor({ city: 'Cluj-Napoca', favoriteClubIds: ['c2', 'c9'] });
    expect(clubsScore(a, b)).toBe(CLUBS_SHARED_FAVORITE);
  });
  it('no shared club but within 10 km → 70', () => {
    const b = baseFor({ city: 'Cluj-Napoca', favoriteClubIds: ['c9'] });
    expect(clubsScore(a, b, 5)).toBe(CLUBS_NEAR);
  });
  it('no distance + same city → 50', () => {
    const b = baseFor({ city: 'București', favoriteClubIds: ['c9'] });
    expect(clubsScore(a, b)).toBe(CLUBS_SAME_CITY);
  });
  it('different city but within 50 km → 50', () => {
    const b = baseFor({ city: 'Ploiești', favoriteClubIds: ['c9'] });
    expect(clubsScore(a, b, 40)).toBe(CLUBS_MEDIUM);
  });
  it('different city + unknown or far distance → 20', () => {
    const b = baseFor({ city: 'Iași', favoriteClubIds: ['c9'] });
    expect(clubsScore(a, b)).toBe(CLUBS_FAR);
    expect(clubsScore(a, b, 200)).toBe(CLUBS_FAR);
  });
});

describe('objectivesScore', () => {
  it('same goal → 100', () => {
    expect(objectivesScore('COMPETITIVE', 'COMPETITIVE')).toBe(OBJ_SAME);
    expect(objectivesScore('RECREATIONAL', 'RECREATIONAL')).toBe(OBJ_SAME);
  });
  it('one is MIXED → 80', () => {
    expect(objectivesScore('MIXED', 'COMPETITIVE')).toBe(OBJ_MIXED_BRIDGE);
    expect(objectivesScore('RECREATIONAL', 'MIXED')).toBe(OBJ_MIXED_BRIDGE);
  });
  it('RECREATIONAL vs COMPETITIVE → 30', () => {
    expect(objectivesScore('RECREATIONAL', 'COMPETITIVE')).toBe(OBJ_OPPOSED);
    expect(objectivesScore('COMPETITIVE', 'RECREATIONAL')).toBe(OBJ_OPPOSED);
  });
});

describe('historyScore', () => {
  it('returns null for missing / empty history (cold start)', () => {
    expect(historyScore(undefined)).toBeNull();
    expect(historyScore([])).toBeNull();
  });
  it('averages balance scores', () => {
    expect(
      historyScore([
        { matchId: 'm1', balanceScore: 80 },
        { matchId: 'm2', balanceScore: 100 },
      ]),
    ).toBeCloseTo(90, 6);
  });
});

describe('ratingToLevel', () => {
  it('hits the anchors exactly', () => {
    expect(ratingToLevel(1500)).toBeCloseTo(3.5, 6);
    expect(ratingToLevel(1800)).toBeCloseTo(5.0, 6);
    expect(ratingToLevel(2000)).toBeCloseTo(6.0, 6);
  });
});

// ─────────────────────────────────────────────────────────────────────
// End-to-end / spec acceptance tests
// ─────────────────────────────────────────────────────────────────────

describe('compatibilityScore — hard filter', () => {
  it('MALE_ONLY blocks a non-male candidate', () => {
    const a = baseFor({ prefGenderFilter: 'MALE_ONLY' });
    const b = baseFor({ gender: 'FEMALE' });
    const r = compatibilityScore(a, b);
    expect(r.hardFiltered).toBe(true);
    expect(r.score).toBe(0);
    expect(r.breakdown).toEqual({
      level: 0,
      side: 0,
      availability: 0,
      clubs: 0,
      objectives: 0,
      history: 0,
    });
  });
  it('FEMALE_ONLY on the other side blocks too', () => {
    const a = baseFor({ gender: 'MALE' });
    const b = baseFor({ prefGenderFilter: 'FEMALE_ONLY' });
    const r = compatibilityScore(a, b);
    expect(r.hardFiltered).toBe(true);
  });
  it('ANY + ANY lets things through', () => {
    const a = baseFor({});
    const b = baseFor({});
    const r = compatibilityScore(a, b);
    expect(r.hardFiltered).toBe(false);
  });
});

describe('compatibilityScore — perfect match', () => {
  it('same level + complementary sides + full overlap + shared club + same goal returns close to 100', () => {
    const slots = [{ dayOfWeek: 2, startTime: '18:00', endTime: '21:00' }];
    const a = baseFor({
      padelLevel: 4.0,
      preferredSide: 'LEFT',
      goal: 'COMPETITIVE',
      availabilities: slots,
      favoriteClubIds: ['c1'],
    });
    const b = baseFor({
      id: 'Y',
      padelLevel: 4.0,
      preferredSide: 'RIGHT',
      goal: 'COMPETITIVE',
      availabilities: slots,
      favoriteClubIds: ['c1', 'c2'],
    });
    const r = compatibilityScore(a, b, {
      historyData: [{ matchId: 'm1', balanceScore: 100 }],
    });
    expect(r.score).toBeGreaterThanOrEqual(99);
    expect(r.breakdown.level).toBe(100);
    expect(r.breakdown.side).toBe(100);
    expect(r.breakdown.availability).toBe(100);
    expect(r.breakdown.clubs).toBe(100);
    expect(r.breakdown.objectives).toBe(100);
    expect(r.breakdown.history).toBe(100);
    expect(r.softPenalties).toEqual([]);
  });
});

describe('compatibilityScore — worst match', () => {
  it('large level diff + same side + no overlap + far city + opposed goals → near 0', () => {
    const a = baseFor({
      padelLevel: 2.0,
      preferredSide: 'LEFT',
      goal: 'RECREATIONAL',
      availabilities: [{ dayOfWeek: 1, startTime: '08:00', endTime: '10:00' }],
      favoriteClubIds: ['cA'],
      city: 'București',
    });
    const b = baseFor({
      id: 'Y',
      padelLevel: 6.0,
      preferredSide: 'LEFT',
      goal: 'COMPETITIVE',
      availabilities: [{ dayOfWeek: 5, startTime: '22:00', endTime: '23:00' }],
      favoriteClubIds: ['cB'],
      city: 'Iași',
    });
    const r = compatibilityScore(a, b);
    expect(r.score).toBeLessThanOrEqual(25);
    expect(r.breakdown.level).toBe(0);
    expect(r.breakdown.side).toBe(SIDE_SAME);
    expect(r.breakdown.availability).toBe(0);
    expect(r.breakdown.clubs).toBe(CLUBS_FAR);
    expect(r.breakdown.objectives).toBe(OBJ_OPPOSED);
  });
});

describe('compatibilityScore — cold start (no history)', () => {
  it('cold-start score equals the with-history score when all components score 100', () => {
    // Hand-built "all 100" setup: same level, LEFT+RIGHT, full overlap, shared
    // club, same goal. With perfect history, raw == 100. Without history,
    // the 5% history slice is redistributed proportionally, but since every
    // remaining component is also 100, the cold-start raw is also 100.
    const slots = [{ dayOfWeek: 2, startTime: '18:00', endTime: '20:00' }];
    const a = baseFor({
      padelLevel: 4.0,
      preferredSide: 'LEFT',
      goal: 'COMPETITIVE',
      availabilities: slots,
      favoriteClubIds: ['c1'],
    });
    const b = baseFor({
      id: 'Y',
      padelLevel: 4.0,
      preferredSide: 'RIGHT',
      goal: 'COMPETITIVE',
      availabilities: slots,
      favoriteClubIds: ['c1'],
    });
    const withHist = compatibilityScore(a, b, {
      historyData: [{ matchId: 'm', balanceScore: 100 }],
    });
    const noHist = compatibilityScore(a, b);
    expect(withHist.breakdown.history).toBe(100);
    expect(noHist.breakdown.history).toBe(0);
    expect(withHist.score).toBeGreaterThanOrEqual(99.5);
    // Cold start: 0.316+0.211+0.211+0.158+0.105 = 1.001 (rounded) → ≈ 100.1
    expect(noHist.score).toBeGreaterThanOrEqual(99);
    expect(noHist.score).toBeLessThanOrEqual(100.5);
  });

  it('cold-start weights sum to 1 (within rounding)', () => {
    // We construct a scenario where each component returns a known value
    // and verify the cold-start weights collapse to ~1.001 (rounded constants).
    // Use BOTH+BOTH → 80, no clubs match → 20, same city → 50 (but distance unset, so clubs = same city + we set city same)
    const a = baseFor({ padelLevel: 3.0, preferredSide: 'BOTH', goal: 'MIXED', city: 'X' });
    const b = baseFor({
      id: 'Y',
      padelLevel: 3.0,
      preferredSide: 'BOTH',
      goal: 'MIXED',
      city: 'X',
    });
    const r = compatibilityScore(a, b); // cold start
    // Components: level=100, side=80, avail=50, clubs=50, obj=100
    // Weighted: 0.316*100 + 0.211*80 + 0.211*50 + 0.158*50 + 0.105*100 = 76.16 (approx)
    const expected = 0.316 * 100 + 0.211 * 80 + 0.211 * 50 + 0.158 * 50 + 0.105 * 100;
    expect(r.score).toBeCloseTo(expected, 1);
  });
});

describe('compatibilityScore — soft penalties', () => {
  it('level pref penalty applied once per side', () => {
    const a = baseFor({ padelLevel: 3.0, prefMaxLevelDiff: 0.5 });
    const b = baseFor({ id: 'Y', padelLevel: 4.5, prefMaxLevelDiff: 0.5 });
    const r = compatibilityScore(a, b);
    // levelDiff=1.5 > 0.5 → triggered for both A and B → 0.6 * 0.6 = 0.36
    expect(r.softPenalties).toHaveLength(2);
    // Pre-penalty raw ≤ 100, so the multiplicative effect must drop the score
    expect(r.score).toBeLessThan(100 * LEVEL_PREF_PENALTY * LEVEL_PREF_PENALTY + 0.5);
  });

  it('age pref penalty applies when the other player is outside the range', () => {
    const tooYoung = baseFor({
      id: 'Y',
      // 16 years old
      dateOfBirth: new Date(Date.now() - 16 * 365.25 * 24 * 60 * 60 * 1000),
    });
    const restrictive = baseFor({ prefAgeMin: 21, prefAgeMax: 40 });
    const r = compatibilityScore(restrictive, tooYoung);
    expect(r.softPenalties.some((p) => p.includes('age'))).toBe(true);
  });

  it('goal-required + opposed goals halves the score', () => {
    const a = baseFor({ goal: 'COMPETITIVE', prefRequireGoalMatch: true });
    const b = baseFor({ id: 'Y', goal: 'RECREATIONAL' });
    const withFlag = compatibilityScore(a, b);
    const withoutFlag = compatibilityScore({ ...a, prefRequireGoalMatch: false }, b);
    expect(withFlag.score).toBeLessThan(withoutFlag.score);
    expect(withFlag.softPenalties.some((p) => p.includes('goal'))).toBe(true);
  });
});

describe('compatibilityScore — effective level branching', () => {
  it('stable rating (RD<200) uses computed level instead of self-declared', () => {
    const a = baseFor({ padelLevel: 3.0, glickoRating: 1800, glickoRD: 80 });
    // Self-declared 3.0, but rating 1800 → effective level ≈ 5.0
    const b = baseFor({ id: 'Y', padelLevel: 5.0, glickoRating: 1800, glickoRD: 80 });
    const r = compatibilityScore(a, b);
    expect(r.effectiveLevel.a).toBeCloseTo(5.0, 1);
    expect(r.breakdown.level).toBe(100); // no diff → 100
  });

  it('unstable rating (RD≥200) falls back to self-declared level', () => {
    const a = baseFor({ padelLevel: 3.0, glickoRating: 1800, glickoRD: 350 });
    const b = baseFor({ id: 'Y', padelLevel: 3.0, glickoRating: 1800, glickoRD: 350 });
    const r = compatibilityScore(a, b);
    expect(r.effectiveLevel.a).toBeCloseTo(3.0, 1);
  });
});

describe('compatibilityScore — sanity weights', () => {
  it('with-history weights sum to 1', () => {
    const sum =
      LEVEL_WEIGHT +
      0.2 /* side */ +
      0.2 /* avail */ +
      0.15 /* clubs */ +
      0.1 /* obj */ +
      HISTORY_WEIGHT;
    expect(sum).toBeCloseTo(1.0, 6);
  });
});
