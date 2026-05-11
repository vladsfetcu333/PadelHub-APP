import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import * as notificationService from '../services/notificationService.js';

const router = Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const result = await notificationService.listForUser(req.user!.userId, {
      unreadOnly: req.query['unreadOnly'] === 'true',
      page: req.query['page'] ? Number(req.query['page']) : undefined,
      pageSize: req.query['pageSize'] ? Number(req.query['pageSize']) : undefined,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/unread-count', requireAuth, async (req, res, next) => {
  try {
    const count = await notificationService.unreadCount(req.user!.userId);
    res.json({ count });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/read', requireAuth, async (req, res, next) => {
  try {
    const n = await notificationService.markRead(String(req.params['id']), req.user!.userId);
    res.json(n);
  } catch (err) {
    next(err);
  }
});

router.post('/read-all', requireAuth, async (req, res, next) => {
  try {
    const r = await notificationService.markAllRead(req.user!.userId);
    res.json(r);
  } catch (err) {
    next(err);
  }
});

export default router;
