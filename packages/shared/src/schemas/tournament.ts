import { z } from 'zod';
import { TournamentFormat, TournamentStatus, AmericanoPairingMode } from '../constants/enums';

export const TournamentCreateSchema = z
  .object({
    name: z.string().min(2).max(120),
    description: z.string().max(2000).nullable().optional(),
    format: z.enum(TournamentFormat),
    clubId: z.string().min(1),
    startDate: z.coerce.date(),
    endDate: z.coerce.date().nullable().optional(),
    maxPlayers: z.number().int().min(4).max(64),
    numberOfRounds: z.number().int().min(1).max(50).nullable().optional(),
    pointsPerGame: z.number().int().min(1).max(10).default(1),
    matchDurationMinutes: z.number().int().min(10).max(120).default(20),
    numberOfCourts: z.number().int().min(1).max(20).default(1),
    pairingMode: z.enum(AmericanoPairingMode).default('ROTATION'),
    winPoints: z.number().int().min(0).max(10).default(3),
    drawPoints: z.number().int().min(0).max(10).default(1),
    lossPoints: z.number().int().min(0).max(10).default(0),
    isPublic: z.boolean().default(true),
    requiresApproval: z.boolean().default(false),
    minLevel: z.number().min(1).max(7).nullable().optional(),
    maxLevel: z.number().min(1).max(7).nullable().optional(),
    entryFee: z.number().min(0).max(10000).nullable().optional(),
    allowGuests: z.boolean().default(true),
  })
  .refine((v) => v.minLevel == null || v.maxLevel == null || v.minLevel <= v.maxLevel, {
    message: 'minLevel must be ≤ maxLevel',
    path: ['maxLevel'],
  });
export type TournamentCreateInput = z.infer<typeof TournamentCreateSchema>;

export const TournamentListQuerySchema = z.object({
  clubId: z.string().optional(),
  status: z.enum(TournamentStatus).optional(),
  format: z.enum(TournamentFormat).optional(),
  dateFrom: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type TournamentListQuery = z.infer<typeof TournamentListQuerySchema>;

export const GuestPlayerSchema = z.object({
  name: z.string().min(2).max(80),
  level: z.number().min(1).max(7).nullable().optional(),
});
export type GuestPlayerInput = z.infer<typeof GuestPlayerSchema>;

export const TournamentMatchScoreSchema = z
  .object({
    team1Score: z.number().int().min(0).max(99),
    team2Score: z.number().int().min(0).max(99),
  })
  .refine((v) => v.team1Score >= 0 && v.team2Score >= 0, {
    message: 'Scores must be non-negative',
  });
export type TournamentMatchScoreInput = z.infer<typeof TournamentMatchScoreSchema>;
