/**
 * Compatibility-scoring algorithm constants.
 *
 * Every magic number used by `compatibilityScore.ts` lives here, named so the
 * thesis can cite it (e.g. "the LEVEL_WEIGHT (0.30) component dominates the
 * weighted sum, reflecting our hypothesis that skill compatibility is the
 * largest single driver of a satisfying padel match").
 */

// ───── Component weights (Step 4: MCDA weighted sum) ─────
// With history available
export const LEVEL_WEIGHT = 0.3;
export const SIDE_WEIGHT = 0.2;
export const AVAILABILITY_WEIGHT = 0.2;
export const CLUBS_WEIGHT = 0.15;
export const OBJECTIVES_WEIGHT = 0.1;
export const HISTORY_WEIGHT = 0.05;

// Cold-start (no history) — proportionally redistributed from the 5%
// history weight across the other components, rounded to 3 decimals.
export const COLD_START_LEVEL_WEIGHT = 0.316;
export const COLD_START_SIDE_WEIGHT = 0.211;
export const COLD_START_AVAILABILITY_WEIGHT = 0.211;
export const COLD_START_CLUBS_WEIGHT = 0.158;
export const COLD_START_OBJECTIVES_WEIGHT = 0.105;

// ───── Step 2: Glicko → padel level anchors ─────
// "Rating stable" threshold: under 200 RD, we trust the computed level over
// the user's self-declaration.
export const STABLE_RD_THRESHOLD = 200;

// ───── Step 3a: level-difference scoring ─────
export const LEVEL_DIFF_EXACT = 100;
export const LEVEL_DIFF_HALF = 80;
export const LEVEL_DIFF_ONE = 50;
export const LEVEL_DIFF_ONE_HALF = 20;
export const LEVEL_DIFF_ABOVE = 0;

// ───── Step 3b: preferred-side complementarity scoring ─────
export const SIDE_COMPLEMENT = 100; // LEFT + RIGHT
export const SIDE_BOTH = 80; // BOTH paired with anything
export const SIDE_SAME = 30; // LEFT + LEFT, RIGHT + RIGHT

// ───── Step 3c: availability ─────
export const AVAILABILITY_NEUTRAL = 50; // when either has no availability declared

// ───── Step 3d: clubs / location ─────
export const CLUBS_SHARED_FAVORITE = 100;
export const CLUBS_NEAR_DISTANCE_KM = 10;
export const CLUBS_NEAR = 70;
export const CLUBS_SAME_CITY = 50;
export const CLUBS_MEDIUM_DISTANCE_KM = 50;
export const CLUBS_MEDIUM = 50;
export const CLUBS_FAR = 20;

// ───── Step 3e: goals ─────
export const OBJ_SAME = 100;
export const OBJ_MIXED_BRIDGE = 80; // either party is MIXED
export const OBJ_OPPOSED = 30; // RECREATIONAL vs COMPETITIVE

// ───── Step 5: soft-penalty multipliers ─────
export const LEVEL_PREF_PENALTY = 0.6; // levelDiff > A.prefMaxLevelDiff or > B's
export const AGE_PREF_PENALTY = 0.7; // age outside [prefAgeMin, prefAgeMax]
export const GOAL_REQUIRED_PENALTY = 0.5; // strict-goal flag + RECREATIONAL/COMPETITIVE pair

// ───── Minimum permissive score for "show in results" ─────
export const DEFAULT_MIN_SCORE = 30;
