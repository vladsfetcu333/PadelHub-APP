import { describe, it, expect } from 'vitest';
import {
  generateBracketRoundOne,
  bracketRoundsCount,
  type BracketTeam,
} from './eliminationBracket.js';

const team = (seed: number): BracketTeam => ({
  id: `t${seed}`,
  p1: `p${seed * 2 - 1}`,
  p2: `p${seed * 2}`,
  seed,
});

describe('generateBracketRoundOne', () => {
  it('throws on fewer than 2 teams', () => {
    expect(() => generateBracketRoundOne([team(1)])).toThrow();
  });

  it('produces 4 matches for an 8-team bracket', () => {
    const teams = [team(1), team(2), team(3), team(4), team(5), team(6), team(7), team(8)];
    const matches = generateBracketRoundOne(teams);
    expect(matches).toHaveLength(4);
  });

  it('seeds the bracket so #1 plays #N and #2 plays #N-1', () => {
    const teams = [team(1), team(2), team(3), team(4), team(5), team(6), team(7), team(8)];
    const matches = generateBracketRoundOne(teams);
    // Standard 8-bracket ordering: (1v8, 4v5, 2v7, 3v6)
    expect(matches[0]!.team1.seed).toBe(1);
    expect(matches[0]!.team2.seed).toBe(8);
    expect(matches[1]!.team1.seed).toBe(4);
    expect(matches[1]!.team2.seed).toBe(5);
    expect(matches[2]!.team1.seed).toBe(2);
    expect(matches[2]!.team2.seed).toBe(7);
    expect(matches[3]!.team1.seed).toBe(3);
    expect(matches[3]!.team2.seed).toBe(6);
  });

  it('adds bye teams when count is not a power of 2', () => {
    const teams = [team(1), team(2), team(3), team(4), team(5), team(6)];
    const matches = generateBracketRoundOne(teams);
    // 6 teams → padded to 8 → top 2 seeds get byes
    expect(matches).toHaveLength(4);
    // #1 should be paired with a bye
    expect(matches.some((m) => m.team1.seed === 1 && m.team2.isBye)).toBe(true);
    // #2 should also have a bye
    expect(matches.some((m) => m.team1.seed === 2 && m.team2.isBye)).toBe(true);
  });
});

describe('bracketRoundsCount', () => {
  it('logarithmic in team count', () => {
    expect(bracketRoundsCount(2)).toBe(1);
    expect(bracketRoundsCount(4)).toBe(2);
    expect(bracketRoundsCount(8)).toBe(3);
    expect(bracketRoundsCount(16)).toBe(4);
    expect(bracketRoundsCount(5)).toBe(3); // padded to 8
    expect(bracketRoundsCount(9)).toBe(4); // padded to 16
  });
});
