/**
 * Single-elimination bracket generation.
 *
 * Input: an ordered list of teams (highest seed first). Each "team" is
 * represented by two `TournamentPlayer.id` strings.
 *
 * Algorithm: pad to the next power of 2 with bye-teams, then apply the
 * standard bracket folding so the highest seed never faces another top
 * seed before the final.
 *
 *   8-team bracket seedings → matchups
 *     1 vs 8
 *     4 vs 5
 *     3 vs 6
 *     2 vs 7
 *
 * Byes are auto-advanced — the seeded team plays a "WALKOVER" match in
 * round 1 that the engine records as a win without score.
 */

export interface BracketTeam {
  id: string; // synthetic team id; not a TournamentPlayer id
  p1: string; // TournamentPlayer.id
  p2: string; // TournamentPlayer.id
  seed: number;
  isBye?: boolean;
}

export interface BracketMatch {
  round: number; // 1 = first round, increases each round
  matchIndex: number; // within the round (0-based)
  team1: BracketTeam;
  team2: BracketTeam;
}

function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

/**
 * Bracket folding: given seeds 1..N (N power of 2), produce the round-1
 * pairings in the standard order. Recursive doubling:
 *   N=2:  [1, 2]
 *   N=4:  [1, 4, 2, 3]
 *   N=8:  [1, 8, 4, 5, 2, 7, 3, 6]
 */
function bracketOrder(size: number): number[] {
  if (size === 2) return [1, 2];
  const half = bracketOrder(size / 2);
  const result: number[] = [];
  for (const s of half) {
    result.push(s);
    result.push(size + 1 - s);
  }
  return result;
}

/**
 * Builds the round-1 matchups for a single-elimination bracket. Teams
 * are paired so #1 meets #N, #2 meets #N-1, etc., with byes added to
 * the lowest seeds when team count is not a power of 2.
 */
export function generateBracketRoundOne(teams: BracketTeam[]): BracketMatch[] {
  if (teams.length < 2) throw new Error('Need at least 2 teams for an elimination bracket');

  const sorted = [...teams].sort((a, b) => a.seed - b.seed);
  const size = nextPow2(sorted.length);

  // Pad with bye teams at the bottom seeds
  const padded: BracketTeam[] = [...sorted];
  for (let i = sorted.length; i < size; i++) {
    padded.push({
      id: `__BYE_${i}__`,
      p1: '',
      p2: '',
      seed: i + 1,
      isBye: true,
    });
  }

  const order = bracketOrder(size); // 1-indexed seeds
  const matches: BracketMatch[] = [];
  for (let i = 0; i < order.length; i += 2) {
    const team1 = padded[order[i]! - 1]!;
    const team2 = padded[order[i + 1]! - 1]!;
    matches.push({
      round: 1,
      matchIndex: i / 2,
      team1,
      team2,
    });
  }
  return matches;
}

/**
 * Number of rounds in a bracket for N teams (= ceil(log2(N))).
 */
export function bracketRoundsCount(numTeams: number): number {
  let r = 0;
  let p = 1;
  while (p < numTeams) {
    p <<= 1;
    r++;
  }
  return r;
}
