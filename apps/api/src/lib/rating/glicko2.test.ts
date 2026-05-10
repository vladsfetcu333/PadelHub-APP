/**
 * Glicko-2 algorithm tests.
 *
 * The headline test reproduces the fully-worked numerical example from
 * Glickman (2012, Section "Example calculation"). Matching it to within
 * 1e-2 is the safety net for the whole rating system.
 */

import { describe, it, expect } from 'vitest';
import {
  updateRating,
  teamRating,
  updateDoublesMatch,
  initialRatingFromLevel,
  ratingToLevel,
  g,
  expectedScore,
  toGlicko2Scale,
  fromGlicko2Scale,
  type Rating,
} from './glicko2.js';

describe('Glicko-2 — scale conversions', () => {
  it('toGlicko2Scale and fromGlicko2Scale are inverses', () => {
    const r: Rating = { rating: 1487.6, rd: 178.4, volatility: 0.05993 };
    const g2 = toGlicko2Scale(r);
    const back = fromGlicko2Scale({ ...g2, sigma: r.volatility });
    expect(back.rating).toBeCloseTo(r.rating, 6);
    expect(back.rd).toBeCloseTo(r.rd, 6);
    expect(back.volatility).toBeCloseTo(r.volatility, 6);
  });

  it('g(0) = 1 (an opponent with zero uncertainty)', () => {
    expect(g(0)).toBeCloseTo(1, 6);
  });

  it('expectedScore is 0.5 for equal players with no uncertainty', () => {
    expect(expectedScore(0, 0, 0)).toBeCloseTo(0.5, 6);
  });
});

describe('Glicko-2 — Glickman 2012 worked example', () => {
  // Section: "Example calculation"
  // Player:    rating=1500, RD=200, σ=0.06
  // Opponents (rating, RD, outcome from focal player's POV):
  //   #1: 1400, 30,  win
  //   #2: 1550, 100, loss
  //   #3: 1700, 300, loss
  // τ = 0.5
  //
  // Paper's expected output (after Steps 3–8):
  //   new rating ≈ 1464.06
  //   new RD     ≈ 151.52
  //   new σ      ≈ 0.05999
  it('reproduces the paper example within 0.01', () => {
    const player: Rating = { rating: 1500, rd: 200, volatility: 0.06 };
    const opponents: Rating[] = [
      { rating: 1400, rd: 30, volatility: 0.06 },
      { rating: 1550, rd: 100, volatility: 0.06 },
      { rating: 1700, rd: 300, volatility: 0.06 },
    ];
    const updated = updateRating(player, [
      { opponent: opponents[0]!, outcome: 1 },
      { opponent: opponents[1]!, outcome: 0 },
      { opponent: opponents[2]!, outcome: 0 },
    ]);
    expect(updated.rating).toBeCloseTo(1464.06, 1);
    expect(updated.rd).toBeCloseTo(151.52, 1);
    expect(updated.volatility).toBeCloseTo(0.05999, 4);
  });
});

describe('Glicko-2 — qualitative properties', () => {
  it('empty rating period leaves rating unchanged but inflates RD', () => {
    const p: Rating = { rating: 1500, rd: 50, volatility: 0.06 };
    const after = updateRating(p, []);
    expect(after.rating).toBeCloseTo(1500, 6);
    expect(after.volatility).toBeCloseTo(0.06, 6);
    expect(after.rd).toBeGreaterThan(50);
  });

  it('a high-rated player beating a much lower one barely moves', () => {
    const high: Rating = { rating: 1900, rd: 60, volatility: 0.06 };
    const low: Rating = { rating: 1300, rd: 60, volatility: 0.06 };
    const after = updateRating(high, [{ opponent: low, outcome: 1 }]);
    expect(after.rating - 1900).toBeLessThan(5); // tiny gain
  });

  it('a low-rated player beating a much higher one moves a lot', () => {
    const high: Rating = { rating: 1900, rd: 60, volatility: 0.06 };
    const low: Rating = { rating: 1300, rd: 60, volatility: 0.06 };
    const after = updateRating(low, [{ opponent: high, outcome: 1 }]);
    expect(after.rating - 1300).toBeGreaterThan(20); // large jump
  });

  it("RD decreases after a played match (we're more certain now)", () => {
    const p: Rating = { rating: 1500, rd: 200, volatility: 0.06 };
    const opp: Rating = { rating: 1500, rd: 100, volatility: 0.06 };
    const after = updateRating(p, [{ opponent: opp, outcome: 1 }]);
    expect(after.rd).toBeLessThan(p.rd);
  });
});

describe('Glicko-2 — doubles adaptation', () => {
  it('teamRating averages rating and combines RD via quadratic mean', () => {
    const t = teamRating(
      { rating: 1500, rd: 100, volatility: 0.06 },
      { rating: 1700, rd: 100, volatility: 0.06 },
    );
    expect(t.rating).toBeCloseTo(1600, 6);
    // sqrt((100^2 + 100^2)/2) = 100
    expect(t.rd).toBeCloseTo(100, 6);
  });

  it('winning team gains, losing team loses', () => {
    const r: Rating = { rating: 1500, rd: 100, volatility: 0.06 };
    const out = updateDoublesMatch({ p1: r, p2: r }, { p1: r, p2: r }, true);
    expect(out.team1.p1.rating).toBeGreaterThan(r.rating);
    expect(out.team1.p2.rating).toBeGreaterThan(r.rating);
    expect(out.team2.p1.rating).toBeLessThan(r.rating);
    expect(out.team2.p2.rating).toBeLessThan(r.rating);
  });

  it('rating-conservation: when all 4 start equal, team1 gain ≈ team2 loss', () => {
    const r: Rating = { rating: 1500, rd: 100, volatility: 0.06 };
    const out = updateDoublesMatch({ p1: r, p2: r }, { p1: r, p2: r }, true);
    const team1Delta = out.team1.p1.rating - r.rating + (out.team1.p2.rating - r.rating);
    const team2Delta = out.team2.p1.rating - r.rating + (out.team2.p2.rating - r.rating);
    expect(team1Delta + team2Delta).toBeCloseTo(0, 1);
  });

  it('higher-RD teammate moves more than lower-RD teammate', () => {
    const certain: Rating = { rating: 1500, rd: 50, volatility: 0.06 };
    const uncertain: Rating = { rating: 1500, rd: 200, volatility: 0.06 };
    const opp: Rating = { rating: 1500, rd: 80, volatility: 0.06 };
    const out = updateDoublesMatch({ p1: certain, p2: uncertain }, { p1: opp, p2: opp }, true);
    const certainDelta = out.team1.p1.rating - certain.rating;
    const uncertainDelta = out.team1.p2.rating - uncertain.rating;
    expect(Math.abs(uncertainDelta)).toBeGreaterThan(Math.abs(certainDelta));
  });
});

describe('Glicko-2 — initial rating from declared level', () => {
  it('maps anchor levels to exact anchor ratings', () => {
    expect(initialRatingFromLevel(3.5).rating).toBeCloseTo(1500, 6);
    expect(initialRatingFromLevel(5.0).rating).toBeCloseTo(1800, 6);
    expect(initialRatingFromLevel(6.0).rating).toBeCloseTo(2000, 6);
  });

  it('linearly interpolates between anchors', () => {
    // Halfway between 3.5 (1500) and 4.0 (1600) → 1550
    expect(initialRatingFromLevel(3.75).rating).toBeCloseTo(1550, 6);
  });

  it('RD is lower for advanced players (more confident)', () => {
    expect(initialRatingFromLevel(2.0).rd).toBeGreaterThan(initialRatingFromLevel(6.0).rd);
  });

  it('ratingToLevel inverts initialRatingFromLevel at anchors', () => {
    expect(ratingToLevel(1500)).toBeCloseTo(3.5, 6);
    expect(ratingToLevel(1800)).toBeCloseTo(5.0, 6);
    expect(ratingToLevel(2000)).toBeCloseTo(6.0, 6);
  });

  it('clamps below the lowest anchor and above the highest', () => {
    expect(initialRatingFromLevel(0.5).rating).toBeCloseTo(1100, 6);
    expect(initialRatingFromLevel(8.0).rating).toBeCloseTo(2200, 6);
  });
});
