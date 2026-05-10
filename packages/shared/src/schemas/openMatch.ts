import { z } from 'zod';
import { PreferredSide, GenderFilter, PlayerGoal, OpenMatchStatus } from '../constants/enums';

export const OpenMatchCreateSchema = z
  .object({
    clubId: z.string().min(1),
    scheduledAt: z.coerce.date(),
    durationMinutes: z.number().int().min(30).max(240).default(90),
    levelMin: z.number().min(1).max(7).nullable().optional(),
    levelMax: z.number().min(1).max(7).nullable().optional(),
    sideNeeded: z.enum(PreferredSide).nullable().optional(),
    genderRequired: z.enum(GenderFilter).default('ANY'),
    goalRequired: z.enum(PlayerGoal).nullable().optional(),
    notes: z.string().max(1000).nullable().optional(),
  })
  .refine((v) => v.levelMin == null || v.levelMax == null || v.levelMin <= v.levelMax, {
    message: 'levelMin must be ≤ levelMax',
    path: ['levelMax'],
  })
  .refine((v) => v.scheduledAt.getTime() > Date.now(), {
    message: 'scheduledAt must be in the future',
    path: ['scheduledAt'],
  });
export type OpenMatchCreateInput = z.infer<typeof OpenMatchCreateSchema>;

export const OpenMatchListQuerySchema = z.object({
  city: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  levelMin: z.coerce.number().min(1).max(7).optional(),
  levelMax: z.coerce.number().min(1).max(7).optional(),
  status: z.enum(OpenMatchStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type OpenMatchListQuery = z.infer<typeof OpenMatchListQuerySchema>;
