import { z } from 'zod';
import { MatchStatus } from '../constants/enums';

/**
 * A single set in a padel match. Standard padel uses best-of-3 sets,
 * games to 6 with a deciding tie-break. We store the games per team and
 * optional tie-break points (only used in 7-6 / 6-7 sets).
 */
export const SetScoreSchema = z
  .object({
    team1Games: z.number().int().min(0).max(7),
    team2Games: z.number().int().min(0).max(7),
    team1TiebreakPoints: z.number().int().min(0).optional(),
    team2TiebreakPoints: z.number().int().min(0).optional(),
  })
  .refine(
    (s) => {
      const max = Math.max(s.team1Games, s.team2Games);
      const min = Math.min(s.team1Games, s.team2Games);
      // Valid endings: 6-0..6-4 ; 7-5 ; 7-6 (tie-break)
      if (max === 6 && min <= 4) return true;
      if (max === 7 && min === 5) return true;
      if (max === 7 && min === 6) return true;
      return false;
    },
    { message: 'Invalid set score (must end 6-0..6-4, 7-5, or 7-6)' },
  );
export type SetScore = z.infer<typeof SetScoreSchema>;

export const MatchScoreSchema = z
  .object({
    sets: z.array(SetScoreSchema).min(2).max(3),
  })
  .refine(
    (data) => {
      // The winner of >= 2 sets wins the match
      let s1 = 0;
      let s2 = 0;
      for (const s of data.sets) {
        if (s.team1Games > s.team2Games) s1++;
        else s2++;
      }
      return s1 >= 2 || s2 >= 2;
    },
    { message: 'Match must have a winner (≥2 sets won by one team)' },
  );
export type MatchScoreInput = z.infer<typeof MatchScoreSchema>;

export const MatchDisputeSchema = z.object({
  reason: z.string().min(5).max(500),
});
export type MatchDisputeInput = z.infer<typeof MatchDisputeSchema>;

export const MyMatchesQuerySchema = z.object({
  status: z.enum(MatchStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type MyMatchesQuery = z.infer<typeof MyMatchesQuerySchema>;
