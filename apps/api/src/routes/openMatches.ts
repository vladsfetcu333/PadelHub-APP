import { Router } from 'express';
import { OpenMatchCreateSchema, OpenMatchListQuerySchema } from '@padel/shared';
import { validate, valid } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import * as openMatchService from '../services/openMatchService.js';
import type { OpenMatchListQuery, OpenMatchCreateInput } from '@padel/shared';

const router = Router();

router.get('/', validate(OpenMatchListQuerySchema, 'query'), async (req, res, next) => {
  try {
    const q = valid<OpenMatchListQuery>(req, 'query');
    const result = await openMatchService.listOpenMatches(q);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const post = await openMatchService.getOpenMatchById(String(req.params['id']));
    res.json(post);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, validate(OpenMatchCreateSchema), async (req, res, next) => {
  try {
    const post = await openMatchService.createOpenMatch(
      req.user!.userId,
      req.body as OpenMatchCreateInput,
    );
    res.status(201).json(post);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/join', requireAuth, async (req, res, next) => {
  try {
    const updated = await openMatchService.joinOpenMatch(
      String(req.params['id']),
      req.user!.userId,
    );
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id/leave', requireAuth, async (req, res, next) => {
  try {
    const updated = await openMatchService.leaveOpenMatch(
      String(req.params['id']),
      req.user!.userId,
    );
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    await openMatchService.cancelOpenMatch(String(req.params['id']), req.user!.userId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
