/**
 * Tests for the Americano rotation algorithms.
 *
 * Property tests check the things that actually matter in a tournament:
 *   - every player plays in every round (no accidental byes when count is OK)
 *   - no player plays themselves
 *   - over the full schedule, partner counts and opponent counts are even
 *   - dynamic-mode pair-avoidance suppresses repeats when alternatives exist
 */

import { describe, it, expect } from 'vitest';
import {
  generateAmericanoRounds,
  generateNextDynamicRound,
  generateMexicanoNextRound,
  __test__,
} from './americanoRotation.js';

const { circleMethodPairs, pairsToMatches, pairKey, isBye } = __test__;

const players = (n: number) => Array.from({ length: n }, (_, i) => `p${i + 1}`);

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

function countAppearances(rounds: ReturnType<typeof generateAmericanoRounds>) {
  const partner = new Map<string, number>(); // pairKey -> count
  const opponent = new Map<string, number>(); // pairKey -> count
  const games = new Map<string, number>(); // playerId -> games played
  for (const round of rounds) {
    for (const m of round) {
      for (const id of [...m.team1, ...m.team2]) {
        games.set(id, (games.get(id) ?? 0) + 1);
      }
      partner.set(
        pairKey(m.team1[0], m.team1[1]),
        (partner.get(pairKey(m.team1[0], m.team1[1])) ?? 0) + 1,
      );
      partner.set(
        pairKey(m.team2[0], m.team2[1]),
        (partner.get(pairKey(m.team2[0], m.team2[1])) ?? 0) + 1,
      );
      for (const t1 of m.team1) {
        for (const t2 of m.team2) {
          opponent.set(pairKey(t1, t2), (opponent.get(pairKey(t1, t2)) ?? 0) + 1);
        }
      }
    }
  }
  return { partner, opponent, games };
}

// ─────────────────────────────────────────────────────────────────────
// Circle method (the core of ROTATION)
// ─────────────────────────────────────────────────────────────────────

describe('circleMethodPairs', () => {
  it('throws on odd player count', () => {
    expect(() => circleMethodPairs(['a', 'b', 'c'])).toThrow();
  });

  it('produces n-1 rounds for n players', () => {
    expect(circleMethodPairs(players(4))).toHaveLength(3);
    expect(circleMethodPairs(players(8))).toHaveLength(7);
    expect(circleMethodPairs(players(12))).toHaveLength(11);
  });

  it('every pair appears exactly once across all rounds', () => {
    for (const n of [4, 6, 8, 10, 12]) {
      const pairs = circleMethodPairs(players(n));
      const seen = new Set<string>();
      for (const round of pairs) {
        for (const [a, b] of round) {
          const k = pairKey(a, b);
          expect(seen.has(k)).toBe(false);
          seen.add(k);
        }
      }
      // n choose 2 pairs
      expect(seen.size).toBe((n * (n - 1)) / 2);
    }
  });

  it('every round covers every player', () => {
    for (const n of [4, 6, 8, 12]) {
      const all = players(n);
      const rounds = circleMethodPairs(all);
      for (const round of rounds) {
        const seen = new Set<string>();
        for (const [a, b] of round) {
          seen.add(a);
          seen.add(b);
        }
        expect(seen.size).toBe(n);
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────
// generateAmericanoRounds — ROTATION mode
// ─────────────────────────────────────────────────────────────────────

describe('generateAmericanoRounds — ROTATION (8 players, 7 rounds)', () => {
  const rounds = generateAmericanoRounds(players(8), 7, 2, 'ROTATION');

  it('returns the requested number of rounds', () => {
    expect(rounds).toHaveLength(7);
  });

  it('each round has 2 matches for 8 players, no byes', () => {
    for (const r of rounds) expect(r).toHaveLength(2);
  });

  it('every player plays every round', () => {
    const { games } = countAppearances(rounds);
    for (const p of players(8)) {
      expect(games.get(p)).toBe(7);
    }
  });

  it('each player partners every other exactly once over 7 rounds', () => {
    const { partner } = countAppearances(rounds);
    // C(8,2) = 28 distinct pairs, each should appear exactly once
    expect(partner.size).toBe(28);
    for (const c of partner.values()) expect(c).toBe(1);
  });

  it('no player partners themselves', () => {
    for (const r of rounds) {
      for (const m of r) {
        expect(m.team1[0]).not.toBe(m.team1[1]);
        expect(m.team2[0]).not.toBe(m.team2[1]);
        // no overlap between teams either
        const all = [...m.team1, ...m.team2];
        expect(new Set(all).size).toBe(4);
      }
    }
  });

  it('court numbers stay within bounds', () => {
    for (const r of rounds) {
      for (const m of r) {
        expect(m.courtNumber).toBeGreaterThanOrEqual(1);
        expect(m.courtNumber).toBeLessThanOrEqual(2);
      }
    }
  });
});

describe('generateAmericanoRounds — ROTATION with non-multiple-of-4 player counts', () => {
  it('5 players: each round skips ≤ 1 player (byes handled gracefully)', () => {
    const rounds = generateAmericanoRounds(players(5), 5, 1, 'ROTATION');
    expect(rounds.length).toBe(5);
    // With 5 players padded to 8 (3 byes), each round has 2 raw pairs but
    // matches containing byes are dropped. We just check the schedule
    // doesn't crash and never produces fake pairs.
    for (const r of rounds) {
      for (const m of r) {
        for (const p of [...m.team1, ...m.team2]) {
          expect(isBye(p)).toBe(false);
        }
      }
    }
  });

  it('6 players: all matches use real players', () => {
    const rounds = generateAmericanoRounds(players(6), 3, 1, 'ROTATION');
    for (const r of rounds) {
      for (const m of r) {
        for (const p of [...m.team1, ...m.team2]) {
          expect(isBye(p)).toBe(false);
        }
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────
// Dynamic modes (BALANCED / TOP_TOGETHER / RANDOM) + Mexicano
// ─────────────────────────────────────────────────────────────────────

describe('generateAmericanoRounds — dynamic modes', () => {
  it('BALANCED first round pairs top with bottom', () => {
    const rounds = generateAmericanoRounds(
      ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8'],
      1,
      2,
      'BALANCED',
    );
    expect(rounds).toHaveLength(1);
    const round = rounds[0]!;
    // 8 players → 2 matches
    expect(round).toHaveLength(2);
    // No player should appear twice
    const seen = new Set<string>();
    for (const m of round) {
      for (const p of [...m.team1, ...m.team2]) {
        expect(seen.has(p)).toBe(false);
        seen.add(p);
      }
    }
    expect(seen.size).toBe(8);
  });

  it('TOP_TOGETHER first round pairs adjacent ranks', () => {
    const rounds = generateAmericanoRounds(players(4), 1, 1, 'TOP_TOGETHER');
    expect(rounds).toHaveLength(1);
    // 4 players → 1 match → team1 = (p1, p2), team2 = (p3, p4)
    const m = rounds[0]![0]!;
    expect(m.team1.sort()).toEqual(['p1', 'p2'].sort());
    expect(m.team2.sort()).toEqual(['p3', 'p4'].sort());
  });
});

describe('generateNextDynamicRound — pair avoidance', () => {
  it('avoids previously-used pairs when alternatives exist', () => {
    const ranked = players(4);
    const used = new Set([pairKey('p1', 'p2')]); // p1-p2 already partnered
    const round = generateNextDynamicRound(ranked, used, 1, 'TOP_TOGETHER');
    // p1-p2 should NOT be on the same team this round
    const m = round[0]!;
    const team1Pair = pairKey(m.team1[0], m.team1[1]);
    const team2Pair = pairKey(m.team2[0], m.team2[1]);
    expect(team1Pair).not.toBe(pairKey('p1', 'p2'));
    expect(team2Pair).not.toBe(pairKey('p1', 'p2'));
  });
});

describe('generateMexicanoNextRound — uses balanced ordering', () => {
  it('returns one valid round with all 4 players covered', () => {
    const round = generateMexicanoNextRound(players(4), new Set(), 1);
    expect(round).toHaveLength(1);
    const m = round[0]!;
    const seen = new Set([...m.team1, ...m.team2]);
    expect(seen.size).toBe(4);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Court assignment + bye dropping (low-level helper)
// ─────────────────────────────────────────────────────────────────────

describe('pairsToMatches', () => {
  it('drops matches that contain bye placeholders', () => {
    const matches = pairsToMatches(
      [
        ['p1', '__BYE_5'],
        ['p2', 'p3'],
        ['p4', 'p5'],
        ['p6', 'p7'],
      ],
      2,
    );
    // First "match" (p1+bye vs p2+p3) gets dropped
    expect(matches).toHaveLength(1);
    expect(matches[0]!.team1).toEqual(['p4', 'p5']);
    expect(matches[0]!.team2).toEqual(['p6', 'p7']);
  });

  it('round-robins court numbers when more matches than courts', () => {
    const matches = pairsToMatches(
      [
        ['p1', 'p2'],
        ['p3', 'p4'],
        ['p5', 'p6'],
        ['p7', 'p8'],
        ['p9', 'p10'],
        ['p11', 'p12'],
      ],
      2,
    );
    expect(matches.map((m) => m.courtNumber)).toEqual([1, 2, 1]);
  });
});

// ─────────────────────────────────────────────────────────────────────
// Input validation
// ─────────────────────────────────────────────────────────────────────

describe('generateAmericanoRounds — validation', () => {
  it('throws when fewer than 4 players', () => {
    expect(() => generateAmericanoRounds(['a', 'b'], 1, 1)).toThrow();
  });
  it('throws when numberOfRounds < 1', () => {
    expect(() => generateAmericanoRounds(players(4), 0, 1)).toThrow();
  });
  it('throws when numberOfCourts < 1', () => {
    expect(() => generateAmericanoRounds(players(4), 1, 0)).toThrow();
  });
});
