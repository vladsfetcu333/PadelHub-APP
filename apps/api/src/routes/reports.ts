import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as reportsService from '../services/reportsService.js';
import { buildPlayerReportCsv } from '../services/playerReportCsv.js';

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

// CSV export — same auth as the JSON player report; the service layer
// throws forbidden() if the caller is neither the target user nor an
// admin. Filename uses RFC 6266 disposition with both `filename=` (ASCII
// fallback) and `filename*=UTF-8''…` for diacritics.
router.get('/player/:userId/export.csv', requireAuth, async (req, res, next) => {
  try {
    const { filename, body } = await buildPlayerReportCsv(
      String(req.params['userId']),
      req.user!.userId,
      req.user!.role,
    );
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
    );
    res.send(body);
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
