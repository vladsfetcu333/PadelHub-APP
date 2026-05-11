/**
 * Americano tournament rotation algorithms.
 *
 * Background
 * ──────────
 * The original Padel Hub project (the user's prior work, github:
 * vladsfetcu333/Padel-Americana-Tournament-Manager) ran three pairing
 * strategies — BALANCED, TOP_TOGETHER, RANDOM — each implemented as a
 * greedy match-up generator that avoided previously-used pairs via a
 * Set lookup.
 *
 * For Phase 3 we add a fourth mode, ROTATION, which is the canonical
 * round-robin Americano schedule: every player partners with every other
 * player as evenly as possible across the tournament. ROTATION is the
 * default because it produces the most "fair" tournament; the original
 * BALANCED mode remains the recommended choice for skill-mixed groups
 * (high-with-low pairing per round keeps games competitive).
 *
 * ROTATION algorithm
 * ──────────────────
 * For n players with n divisible by 4 we generate the schedule via a
 * standard round-robin construction (the same circle algorithm used to
 * pair players in chess swiss tournaments), then split each round's
 * pairs into adjacent doubles courts.
 *
 * For n players where n % 4 != 0, we add 1–3 "bye" placeholders so the
 * count becomes a multiple of 4. Any pair containing a bye is dropped
 * (those players sit out that round). On average each real player gets
 * the same number of byes.
 *
 * All four strategies share the same return shape so the calling code
 * doesn't care which mode produced the schedule.
 */

export type PairingMode = 'ROTATION' | 'BALANCED' | 'TOP_TOGETHER' | 'RANDOM';

export interface RoundMatch {
  team1: [string, string];
  team2: [string, string];
  courtNumber: number;
}

/** Sentinel prefix used internally for bye-slot players. Real player ids
 *  must never start with this — Prisma cuid()s don't contain underscores. */
const BYE_PREFIX = '__BYE_';

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/** Pads the player list with bye slots so the count is divisible by 4. */
function padToMultipleOf4(ids: string[]): string[] {
  const padded = [...ids];
  while (padded.length % 4 !== 0) padded.push(`${BYE_PREFIX}${padded.length}`);
  return padded;
}

function isBye(id: string): boolean {
  return id.startsWith(BYE_PREFIX);
}

/** Group pairs of (player,player) into doubles matches [(A,B) vs (C,D)]. */
function pairsToMatches(pairs: Array<[string, string]>, numberOfCourts: number): RoundMatch[] {
  const matches: RoundMatch[] = [];
  for (let i = 0; i + 1 < pairs.length; i += 2) {
    const team1 = pairs[i]!;
    const team2 = pairs[i + 1]!;
    // Drop any match that includes a bye
    if (team1.some(isBye) || team2.some(isBye)) continue;
    const courtNumber = Math.min((matches.length % numberOfCourts) + 1, numberOfCourts);
    matches.push({ team1, team2, courtNumber });
  }
  return matches;
}

// ─────────────────────────────────────────────────────────────────────
// ROTATION — round-robin Americano (default)
// ─────────────────────────────────────────────────────────────────────

/**
 * Generates a single round-robin schedule of pairs using the classic
 * "circle method": fix the first player, rotate the rest. For n players
 * (n even), produces n-1 rounds, each round having n/2 pairs covering
 * every player.
 *
 * Each player partners every other player exactly once across the full
 * n-1 rounds.
 */
function circleMethodPairs(playerIds: string[]): Array<Array<[string, string]>> {
  const n = playerIds.length;
  if (n < 2 || n % 2 !== 0) throw new Error('circleMethodPairs requires an even player count');

  const fixed = playerIds[0]!;
  const rotating = playerIds.slice(1);
  const rounds: Array<Array<[string, string]>> = [];

  // Each round has n/2 pairs: one with the fixed player + (n/2 - 1) from
  // the rotating list paired head/tail inward.
  const pairsPerRound = n / 2;
  for (let round = 0; round < n - 1; round++) {
    const pairs: Array<[string, string]> = [];
    pairs.push([fixed, rotating[0]!]);
    for (let i = 1; i < pairsPerRound; i++) {
      const left = rotating[i]!;
      const right = rotating[rotating.length - i]!;
      pairs.push([left, right]);
    }
    rounds.push(pairs);
    // Rotate: move last element to front
    rotating.unshift(rotating.pop()!);
  }
  return rounds;
}

/**
 * Build a round-robin schedule of TEAMS (pairs) and MATCHES (team-vs-team).
 *
 * We use circleMethod to generate "pair rounds". Each pair round contains
 * n/2 pairs of players. We then group those n/2 pairs into n/4 matches
 * (team1 vs team2). This naturally rotates partners and opponents.
 */
function generateRotationRounds(
  playerIds: string[],
  numberOfRounds: number,
  numberOfCourts: number,
): RoundMatch[][] {
  const padded = padToMultipleOf4(playerIds);
  const pairRounds = circleMethodPairs(padded);

  // Each pair round becomes one doubles round (pairs grouped into matches)
  const allRounds: RoundMatch[][] = pairRounds.map((pairs) =>
    pairsToMatches(pairs, numberOfCourts),
  );

  // Repeat the schedule from the start if numberOfRounds > pairRounds.length
  const out: RoundMatch[][] = [];
  for (let i = 0; i < numberOfRounds; i++) {
    out.push(allRounds[i % allRounds.length]!);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────
// BALANCED / TOP_TOGETHER / RANDOM — original Padel Hub strategies
// ─────────────────────────────────────────────────────────────────────

/**
 * Greedy pairing of an ordered list of players, avoiding previously-used
 * pairs when possible. This is the algorithm from the original Padel Hub
 * `pairWithAvoidance` function, ported faithfully.
 */
function pairWithAvoidance(ordered: string[], previousPairs: Set<string>): Array<[string, string]> {
  const pairs: Array<[string, string]> = [];
  const available = [...ordered];
  while (available.length >= 2) {
    const p1 = available.shift()!;
    let bestIdx = 0;
    let bestScore = Infinity;
    for (let i = 0; i < available.length; i++) {
      const wasPaired = previousPairs.has(pairKey(p1, available[i]!));
      const score = (wasPaired ? 1000 : 0) + i; // prefer closer ranking, avoid repeats
      if (score < bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    const p2 = available.splice(bestIdx, 1)[0]!;
    pairs.push([p1, p2]);
  }
  return pairs;
}

/** BALANCED — top with bottom (1+n, 2+n-1, ...). Original PH default. */
function generateBalancedPairs(
  rankedPlayerIds: string[],
  previousPairs: Set<string>,
): Array<[string, string]> {
  const reordered: string[] = [];
  const half = Math.floor(rankedPlayerIds.length / 2);
  for (let i = 0; i < half; i++) {
    reordered.push(rankedPlayerIds[i]!);
    reordered.push(rankedPlayerIds[rankedPlayerIds.length - 1 - i]!);
  }
  return pairWithAvoidance(reordered, previousPairs);
}

/** TOP_TOGETHER — adjacent in ranking (1+2, 3+4, ...) */
function generateTopTogetherPairs(
  rankedPlayerIds: string[],
  previousPairs: Set<string>,
): Array<[string, string]> {
  return pairWithAvoidance([...rankedPlayerIds], previousPairs);
}

/** RANDOM — shuffle, then greedy with avoidance. */
function generateRandomPairs(
  playerIds: string[],
  previousPairs: Set<string>,
  random: () => number = Math.random,
): Array<[string, string]> {
  const shuffled = [...playerIds].sort(() => random() - 0.5);
  return pairWithAvoidance(shuffled, previousPairs);
}

// ─────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────

/**
 * Generates the full schedule for an Americano tournament.
 *
 * - For ROTATION: returns the precomputed circle-method schedule. Stable
 *   regardless of standings — the schedule is fixed up front.
 * - For BALANCED / TOP_TOGETHER / RANDOM: only the FIRST round is
 *   generated here (random ordering on round 1). Subsequent rounds are
 *   generated dynamically by {@link generateNextDynamicRound} once
 *   standings exist.
 */
export function generateAmericanoRounds(
  playerIds: string[],
  numberOfRounds: number,
  numberOfCourts: number,
  mode: PairingMode = 'ROTATION',
): RoundMatch[][] {
  if (playerIds.length < 4) throw new Error('Need at least 4 players for an Americano tournament');
  if (numberOfRounds < 1) throw new Error('numberOfRounds must be at least 1');
  if (numberOfCourts < 1) throw new Error('numberOfCourts must be at least 1');

  if (mode === 'ROTATION') {
    return generateRotationRounds(playerIds, numberOfRounds, numberOfCourts);
  }

  // Dynamic modes: only round 1 is deterministic; later rounds are produced
  // after the round completes (caller invokes generateNextDynamicRound).
  // Round 1: use the players in-list order, then pair via the chosen mode.
  const previousPairs = new Set<string>();
  let firstRoundPairs: Array<[string, string]>;
  switch (mode) {
    case 'BALANCED':
      firstRoundPairs = generateBalancedPairs(playerIds, previousPairs);
      break;
    case 'TOP_TOGETHER':
      firstRoundPairs = generateTopTogetherPairs(playerIds, previousPairs);
      break;
    case 'RANDOM':
      firstRoundPairs = generateRandomPairs(playerIds, previousPairs);
      break;
  }
  return [pairsToMatches(firstRoundPairs, numberOfCourts)];
}

/**
 * Build the next round for a dynamic-mode Americano (BALANCED /
 * TOP_TOGETHER / RANDOM) given the current standings (ordered by points
 * desc) and the pairs already used. Mexicano uses this exact function
 * with mode=BALANCED on every round.
 */
export function generateNextDynamicRound(
  rankedPlayerIds: string[],
  previousPairs: Set<string>,
  numberOfCourts: number,
  mode: Exclude<PairingMode, 'ROTATION'>,
): RoundMatch[] {
  let pairs: Array<[string, string]>;
  switch (mode) {
    case 'BALANCED':
      pairs = generateBalancedPairs(rankedPlayerIds, previousPairs);
      break;
    case 'TOP_TOGETHER':
      pairs = generateTopTogetherPairs(rankedPlayerIds, previousPairs);
      break;
    case 'RANDOM':
      pairs = generateRandomPairs(rankedPlayerIds, previousPairs);
      break;
  }
  return pairsToMatches(pairs, numberOfCourts);
}

/**
 * Mexicano pairing — ranks players by current totalPoints desc, then
 * pairs the 1st with 4th vs 2nd with 3rd in each group of four (i.e.
 * BALANCED order, which is the most common Mexicano variant).
 */
export function generateMexicanoNextRound(
  rankedPlayerIds: string[],
  previousPairs: Set<string>,
  numberOfCourts: number,
): RoundMatch[] {
  return generateNextDynamicRound(rankedPlayerIds, previousPairs, numberOfCourts, 'BALANCED');
}

// ─────────────────────────────────────────────────────────────────────
// Re-exports for tests
// ─────────────────────────────────────────────────────────────────────

export const __test__ = {
  circleMethodPairs,
  pairWithAvoidance,
  generateBalancedPairs,
  generateTopTogetherPairs,
  generateRandomPairs,
  pairsToMatches,
  pairKey,
  isBye,
};
