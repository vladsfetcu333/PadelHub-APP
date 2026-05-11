import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as reportsService from '../services/reportsService.js';

const router = Router();

router.get('/player/:userId', requireAuth, async (req, res, next) => {
  try {
    const r = await reportsService.buildPlayerReport(
      String(req.params['userId']),
      req.user!.userId,
      req.user!.role,
    );
    res.json(r);
  } catch (err) {
    next(err);
  }
});

router.get('/club/:clubId', requireAuth, async (req, res, next) => {
  try {
    const from = req.query['from'] ? new Date(String(req.query['from'])) : undefined;
    const to = req.query['to'] ? new Date(String(req.query['to'])) : undefined;
    const r = await reportsService.buildClubReport(
      String(req.params['clubId']),
      req.user!.userId,
      req.user!.role,
      from,
      to,
    );
    res.json(r);
  } catch (err) {
    next(err);
  }
});

router.get('/admin', requireAuth, async (req, res, next) => {
  try {
    const from = req.query['from'] ? new Date(String(req.query['from'])) : undefined;
    const to = req.query['to'] ? new Date(String(req.query['to'])) : undefined;
    const r = await reportsService.buildAdminReport(req.user!.role, from, to);
    res.json(r);
  } catch (err) {
    next(err);
  }
});

export default router;
