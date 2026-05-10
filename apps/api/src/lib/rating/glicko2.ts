/**
 * Glicko-2 rating system implementation.
 *
 * Reference:
 *   Glickman, M.E. (2012). "Example of the Glicko-2 system."
 *   http://www.glicko.net/glicko/glicko2.pdf
 *
 * The implementation follows Glickman's numerical example exactly so the
 * test in `glicko2.test.ts` can reproduce his worked numbers within 1e-2
 * tolerance. The algorithm has two scales:
 *
 *   • Display scale (rating, RD)  — what users see, anchored around 1500
 *   • Internal scale (μ, φ)       — used during the update, centred at 0
 *
 * Conversions: μ = (rating - 1500) / 173.7178,  φ = RD / 173.7178.
 *
 * Doubles adaptation (see {@link updateDoublesMatch}) is a documented
 * practical extension: there is no standard Glicko-2 doubles theory, but
 * the "virtual team rating" approach has appeared in the literature
 * (see e.g. Lasek et al., 2013) and is straightforward to reason about.
 */

import {
  CONVERGENCE_EPSILON,
  DEFAULT_RATING,
  DEFAULT_RD,
  DEFAULT_VOLATILITY,
  GLICKO2_SCALE,
  GLICKO_ANCHOR_RATING,
  TAU,
  VOLATILITY_MAX_ITER,
} from './constants.js';

/** A player's rating on the public (Glicko) display scale. */
export interface Rating {
  /** Glicko rating, e.g. 1500. */
  rating: number;
  /** Rating Deviation. Lower = more confident. Starts at 350. */
  rd: number;
  /** Volatility σ. Starts at 0.06; varies with rating instability. */
  volatility: number;
}

/** Outcome of a single game from the perspective of the focal player. */
export type Outcome = 0 | 0.5 | 1;

/** A single opponent encounter for the rating update. */
export interface MatchResult {
  opponent: Rating;
  /** 1 = win, 0.5 = draw (unused for padel), 0 = loss. */
  outcome: Outcome;
}

/** Public default — useful when initialising a brand-new player. */
export const DEFAULT_RATING_VALUE: Rating = {
  rating: DEFAULT_RATING,
  rd: DEFAULT_RD,
  volatility: DEFAULT_VOLATILITY,
};

// ─────────────────────────────────────────────────────────────────────
// Scale conversions
// ─────────────────────────────────────────────────────────────────────

/** Convert public-scale (rating, RD) → internal-scale (μ, φ). */
export function toGlicko2Scale(r: Rating): { mu: number; phi: number } {
  return {
    mu: (r.rating - GLICKO_ANCHOR_RATING) / GLICKO2_SCALE,
    phi: r.rd / GLICKO2_SCALE,
  };
}

/** Convert internal-scale (μ, φ, σ) → public-scale (rating, RD, volatility). */
export function fromGlicko2Scale(g2: { mu: number; phi: number; sigma: number }): Rating {
  return {
    rating: g2.mu * GLICKO2_SCALE + GLICKO_ANCHOR_RATING,
    rd: g2.phi * GLICKO2_SCALE,
    volatility: g2.sigma,
  };
}

// ─────────────────────────────────────────────────────────────────────
// Glicko-2 core math (paper eq. notation in JSDoc references)
// ─────────────────────────────────────────────────────────────────────

/**
 * g(φ) — the function that scales the impact of an opponent's uncertainty.
 * Paper, Step 3, function g.
 */
export function g(phi: number): number {
  return 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));
}

/**
 * E(μ, μⱼ, φⱼ) — expected outcome of the focal player against opponent j.
 * Paper, Step 3, function E.
 */
export function expectedScore(mu: number, muOpponent: number, phiOpponent: number): number {
  return 1 / (1 + Math.exp(-g(phiOpponent) * (mu - muOpponent)));
}

/**
 * Computes the estimated variance v of the focal player's rating, based
 * on the variance of game outcomes seen this rating period.
 * Paper, Step 3, equation for v.
 */
function computeVariance(mu: number, opps: Array<{ muJ: number; phiJ: number }>): number {
  let sum = 0;
  for (const o of opps) {
    const gPhi = g(o.phiJ);
    const e = 1 / (1 + Math.exp(-gPhi * (mu - o.muJ)));
    sum += gPhi * gPhi * e * (1 - e);
  }
  return 1 / sum;
}

/**
 * Δ — estimated improvement in rating (in internal scale), Step 4.
 */
function computeDelta(
  v: number,
  mu: number,
  results: Array<{ muJ: number; phiJ: number; outcome: Outcome }>,
): number {
  let sum = 0;
  for (const r of results) {
    const gPhi = g(r.phiJ);
    const e = 1 / (1 + Math.exp(-gPhi * (mu - r.muJ)));
    sum += gPhi * (r.outcome - e);
  }
  return v * sum;
}

/**
 * Iterative volatility update — Step 5 of the paper. Uses Illinois algorithm
 * (a regula-falsi variant Glickman specifies) to find the root of f(x).
 *
 * Returns the new internal volatility σ′.
 */
function computeNewVolatility(
  sigma: number,
  phi: number,
  v: number,
  delta: number,
  tau: number,
): number {
  const a = Math.log(sigma * sigma);

  const f = (x: number): number => {
    const ex = Math.exp(x);
    const num = ex * (delta * delta - phi * phi - v - ex);
    const den = 2 * (phi * phi + v + ex) ** 2;
    return num / den - (x - a) / (tau * tau);
  };

  // Initial bracket [A, B] per the paper
  let A = a;
  let B: number;
  if (delta * delta > phi * phi + v) {
    B = Math.log(delta * delta - phi * phi - v);
  } else {
    let k = 1;
    while (f(a - k * tau) < 0) {
      k++;
      if (k > VOLATILITY_MAX_ITER) throw new Error('Glicko-2: volatility bracket diverged');
    }
    B = a - k * tau;
  }

  let fA = f(A);
  let fB = f(B);
  let iter = 0;

  while (Math.abs(B - A) > CONVERGENCE_EPSILON) {
    if (iter++ > VOLATILITY_MAX_ITER) {
      throw new Error('Glicko-2: volatility iteration did not converge');
    }
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);
    if (fC * fB <= 0) {
      A = B;
      fA = fB;
    } else {
      fA = fA / 2;
    }
    B = C;
    fB = fC;
  }

  return Math.exp(A / 2);
}

/**
 * Updates a player's rating after a rating period containing zero or more
 * games. Outputs a new {@link Rating} on the public scale.
 *
 * If `results` is empty, only the RD is inflated by the volatility (no
 * games means we're less sure where the player stands). This corresponds
 * to Step 6 of the paper applied with the empty-game rule.
 *
 * @param player  current rating of the focal player
 * @param results games played this rating period
 * @param tau     system constant τ; defaults to 0.5 (paper's example)
 */
export function updateRating(player: Rating, results: MatchResult[], tau: number = TAU): Rating {
  const { mu, phi } = toGlicko2Scale(player);
  const sigma = player.volatility;

  // Empty rating period — Step 6 special case: rating and volatility unchanged,
  // RD grows: φ* = sqrt(φ² + σ²).
  if (results.length === 0) {
    const phiStar = Math.sqrt(phi * phi + sigma * sigma);
    return fromGlicko2Scale({ mu, phi: phiStar, sigma });
  }

  const opps = results.map((r) => {
    const g2 = toGlicko2Scale(r.opponent);
    return { muJ: g2.mu, phiJ: g2.phi, outcome: r.outcome };
  });

  // Step 3: v
  const v = computeVariance(
    mu,
    opps.map(({ muJ, phiJ }) => ({ muJ, phiJ })),
  );

  // Step 4: Δ
  const delta = computeDelta(v, mu, opps);

  // Step 5: new volatility σ′
  const sigmaPrime = computeNewVolatility(sigma, phi, v, delta, tau);

  // Step 6: φ*
  const phiStar = Math.sqrt(phi * phi + sigmaPrime * sigmaPrime);

  // Step 7: φ′ and μ′
  const phiPrime = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
  let sum = 0;
  for (const o of opps) {
    const gPhi = g(o.phiJ);
    const e = 1 / (1 + Math.exp(-gPhi * (mu - o.muJ)));
    sum += gPhi * (o.outcome - e);
  }
  const muPrime = mu + phiPrime * phiPrime * sum;

  return fromGlicko2Scale({ mu: muPrime, phi: phiPrime, sigma: sigmaPrime });
}

// ─────────────────────────────────────────────────────────────────────
// Doubles adaptation
// ─────────────────────────────────────────────────────────────────────

/**
 * Build a "virtual team rating" from two player ratings.
 *
 * Choices and trade-offs (defensible for the thesis):
 *   • rating: arithmetic mean — preserves expected-skill linearity
 *   • rd:     quadratic mean √((rd₁² + rd₂²) / 2) — uncertainties add in
 *             quadrature when treated as independent variances, then we
 *             scale back so a team of two equally-uncertain players has
 *             the same RD as each individual (not 2×)
 *   • volatility: arithmetic mean — keeps σ in the same regime as a player
 */
export function teamRating(p1: Rating, p2: Rating): Rating {
  return {
    rating: (p1.rating + p2.rating) / 2,
    rd: Math.sqrt((p1.rd ** 2 + p2.rd ** 2) / 2),
    volatility: (p1.volatility + p2.volatility) / 2,
  };
}

/**
 * Update the four players of a doubles match given the team outcome.
 *
 * Each individual player is updated by calling {@link updateRating} once,
 * treating them as having played a single game against the opposing
 * team's virtual rating. This is the same adaptation used by several
 * sport-rating implementations (e.g. paddle-ranker, ELO2 doubles ports).
 *
 * Notes for the thesis:
 *   • A player's two teammates do NOT appear as opponents — only the
 *     opposing team's virtual rating. This avoids the team-against-itself
 *     contradiction and matches how Bradley-Terry doubles models are
 *     usually fit.
 *   • Because each player is updated independently against the same
 *     opposing virtual rating, the two teammates get the same direction
 *     of change but slightly different magnitudes (driven by their own
 *     RD and volatility) — that's the desired behaviour: the more
 *     uncertain player moves more.
 */
export function updateDoublesMatch(
  team1: { p1: Rating; p2: Rating },
  team2: { p1: Rating; p2: Rating },
  team1Won: boolean,
): { team1: { p1: Rating; p2: Rating }; team2: { p1: Rating; p2: Rating } } {
  const team1Virtual = teamRating(team1.p1, team1.p2);
  const team2Virtual = teamRating(team2.p1, team2.p2);

  const team1Outcome: Outcome = team1Won ? 1 : 0;
  const team2Outcome: Outcome = team1Won ? 0 : 1;

  return {
    team1: {
      p1: updateRating(team1.p1, [{ opponent: team2Virtual, outcome: team1Outcome }]),
      p2: updateRating(team1.p2, [{ opponent: team2Virtual, outcome: team1Outcome }]),
    },
    team2: {
      p1: updateRating(team2.p1, [{ opponent: team1Virtual, outcome: team2Outcome }]),
      p2: updateRating(team2.p2, [{ opponent: team1Virtual, outcome: team2Outcome }]),
    },
  };
}

// ─────────────────────────────────────────────────────────────────────
// Initial rating from declared level
// ─────────────────────────────────────────────────────────────────────

/**
 * Anchor mapping: declared padel level (Playtomic-style 1.0–7.0) → Glicko
 * rating. Used by {@link initialRatingFromLevel} via linear interpolation.
 *
 * Identical to the Step-2 mapping in `compatibilityScore` so that scoring
 * and rating share one source of truth.
 */
export const LEVEL_TO_RATING_ANCHORS: ReadonlyArray<readonly [level: number, rating: number]> = [
  [1.0, 1100],
  [2.0, 1250],
  [2.5, 1350],
  [3.0, 1450],
  [3.5, 1500],
  [4.0, 1600],
  [4.5, 1700],
  [5.0, 1800],
  [5.5, 1900],
  [6.0, 2000],
  [6.5, 2100],
  [7.0, 2200],
];

function interpolate(x: number, anchors: ReadonlyArray<readonly [number, number]>): number {
  if (x <= anchors[0]![0]) return anchors[0]![1];
  if (x >= anchors[anchors.length - 1]![0]) return anchors[anchors.length - 1]![1];
  for (let i = 1; i < anchors.length; i++) {
    const [x1, y1] = anchors[i - 1]!;
    const [x2, y2] = anchors[i]!;
    if (x <= x2) {
      const t = (x - x1) / (x2 - x1);
      return y1 + t * (y2 - y1);
    }
  }
  /* unreachable */ return anchors[anchors.length - 1]![1];
}

/** RD by declared level — confidence floor for new self-declared accounts. */
function initialRdFromLevel(level: number): number {
  if (level >= 6.0) return 280;
  if (level >= 5.5) return 300;
  if (level >= 5.0) return 320;
  return 350;
}

/**
 * Build a starting Glicko rating from a declared padel level (1.0–7.0).
 * Used during user registration.
 */
export function initialRatingFromLevel(level: number): Rating {
  return {
    rating: interpolate(level, LEVEL_TO_RATING_ANCHORS),
    rd: initialRdFromLevel(level),
    volatility: DEFAULT_VOLATILITY,
  };
}

/**
 * Inverse mapping — Glicko rating → declared-equivalent padel level.
 * Used by the matching algorithm (Step 2: "effective level") and the
 * profile rating display to convert rating back to a human-readable level.
 */
export function ratingToLevel(rating: number): number {
  // Use the same anchors in reverse
  const inverse: ReadonlyArray<readonly [number, number]> = LEVEL_TO_RATING_ANCHORS.map(
    ([lv, r]) => [r, lv] as const,
  );
  const sorted = [...inverse].sort((a, b) => a[0] - b[0]);
  return interpolate(rating, sorted);
}
