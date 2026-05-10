import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validate, valid } from '../middleware/validate.js';
import * as matchingService from '../services/matchingService.js';

const router = Router();

const PartnersQuerySchema = z.object({
  minScore: z.coerce.number().min(0).max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  clubId: z.string().optional(),
  cityOnly: z.coerce.boolean().optional(),
  levelMin: z.coerce.number().min(1).max(7).optional(),
  levelMax: z.coerce.number().min(1).max(7).optional(),
});
type PartnersQuery = z.infer<typeof PartnersQuerySchema>;

router.get(
  '/partners',
  requireAuth,
  validate(PartnersQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const q = valid<PartnersQuery>(req, 'query');
      const opts: matchingService.FindPartnersOptions = {
        ...(q.minScore != null ? { minScore: q.minScore } : {}),
        ...(q.limit != null ? { limit: q.limit } : {}),
        filters: {
          ...(q.clubId ? { clubId: q.clubId } : {}),
          ...(q.cityOnly ? { cityOnly: true } : {}),
          ...(q.levelMin != null && q.levelMax != null
            ? { levelRange: [q.levelMin, q.levelMax] as [number, number] }
            : {}),
        },
      };
      const results = await matchingService.findPartners(req.user!.userId, opts);
      res.json(results);
    } catch (err) {
      next(err);
    }
  },
);

const FullMatchQuerySchema = z.object({
  topPartnersLimit: z.coerce.number().int().min(4).max(50).optional(),
  numSuggestions: z.coerce.number().int().min(1).max(20).optional(),
});
type FullMatchQuery = z.infer<typeof FullMatchQuerySchema>;

router.get(
  '/full-match',
  requireAuth,
  validate(FullMatchQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const q = valid<FullMatchQuery>(req, 'query');
      const results = await matchingService.suggestFullMatches(req.user!.userId, {
        ...(q.topPartnersLimit != null ? { topPartnersLimit: q.topPartnersLimit } : {}),
        ...(q.numSuggestions != null ? { numSuggestions: q.numSuggestions } : {}),
      });
      res.json(results);
    } catch (err) {
      next(err);
    }
  },
);

const OpenMatchRecQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
});
type OpenMatchRecQuery = z.infer<typeof OpenMatchRecQuerySchema>;

router.get(
  '/open-match/:id/recommendations',
  requireAuth,
  validate(OpenMatchRecQuerySchema, 'query'),
  async (req, res, next) => {
    try {
      const q = valid<OpenMatchRecQuery>(req, 'query');
      const results = await matchingService.recommendForOpenMatch(
        String(req.params['id']),
        q.limit ?? 10,
      );
      res.json(results);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
