/**
 * Glicko-2 algorithm constants.
 * Reference: Glickman, M.E. (2012). "Example of the Glicko-2 system."
 * http://www.glicko.net/glicko/glicko2.pdf
 */

/** Scale factor between the Glicko (rating, RD) display scale and the Glicko-2
 *  internal (μ, φ) scale. The paper uses 173.7178 ≈ 400 / ln(10). */
export const GLICKO2_SCALE = 173.7178;

/** Anchor rating for Glicko/Glicko-2 conversion (the rating around which the
 *  internal μ scale is centred). */
export const GLICKO_ANCHOR_RATING = 1500;

/** System constant τ: governs how volatile the volatility parameter is.
 *  Glickman recommends a value between 0.3 and 1.2; we follow the paper's
 *  example value of 0.5 for stable rating evolution. */
export const TAU = 0.5;

/** Convergence tolerance ε for the iterative volatility computation
 *  (Glickman 2012, Step 5, iteration loop). */
export const CONVERGENCE_EPSILON = 1e-6;

/** Max iterations safety guard for the volatility loop. */
export const VOLATILITY_MAX_ITER = 1000;

/** Default initial rating, RD, and volatility for a fresh player when no
 *  declared level is available. */
export const DEFAULT_RATING = 1500;
export const DEFAULT_RD = 350;
export const DEFAULT_VOLATILITY = 0.06;
