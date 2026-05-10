import { Router } from 'express';
import { MatchScoreSchema, MatchDisputeSchema, MyMatchesQuerySchema } from '@padel/shared';
import type { MyMatchesQuery } from '@padel/shared';
import { validate, valid } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import * as matchService from '../services/matchService.js';

const router = Router();

router.get('/me', requireAuth, validate(MyMatchesQuerySchema, 'query'), async (req, res, next) => {
  try {
    const q = valid<MyMatchesQuery>(req, 'query');
    const result = await matchService.listMyMatches(req.user!.userId, q);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const match = await matchService.getMatchById(
      String(req.params['id']),
      req.user?.userId ?? null,
    );
    res.json(match);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/score', requireAuth, validate(MatchScoreSchema), async (req, res, next) => {
  try {
    const match = await matchService.enterScore(
      String(req.params['id']),
      req.user!.userId,
      req.body,
    );
    res.json(match);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/confirm', requireAuth, async (req, res, next) => {
  try {
    const match = await matchService.confirmScore(String(req.params['id']), req.user!.userId);
    res.json(match);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/dispute', requireAuth, validate(MatchDisputeSchema), async (req, res, next) => {
  try {
    const match = await matchService.disputeMatch(
      String(req.params['id']),
      req.user!.userId,
      (req.body as { reason: string }).reason,
    );
    res.json(match);
  } catch (err) {
    next(err);
  }
});

export default router;
