import { Router } from 'express';
import { UpdateProfileSchema, AvailabilitySchema, AvailabilityUpdateSchema } from '@padel/shared';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import * as userService from '../services/userService.js';

const router = Router();

router.patch('/me', requireAuth, validate(UpdateProfileSchema), async (req, res, next) => {
  try {
    const user = await userService.updateMyProfile(req.user!.userId, req.body);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.get('/me/availabilities', requireAuth, async (req, res, next) => {
  try {
    const list = await userService.listMyAvailabilities(req.user!.userId);
    res.json(list);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/me/availabilities',
  requireAuth,
  validate(AvailabilitySchema),
  async (req, res, next) => {
    try {
      const created = await userService.createAvailability(req.user!.userId, req.body);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  },
);

router.patch(
  '/me/availabilities/:id',
  requireAuth,
  validate(AvailabilityUpdateSchema),
  async (req, res, next) => {
    try {
      const updated = await userService.updateAvailability(
        req.user!.userId,
        String(req.params['id']),
        req.body,
      );
      res.json(updated);
    } catch (err) {
      next(err);
    }
  },
);

router.delete('/me/availabilities/:id', requireAuth, async (req, res, next) => {
  try {
    await userService.deleteAvailability(req.user!.userId, String(req.params['id']));
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.get('/me/favorite-clubs', requireAuth, async (req, res, next) => {
  try {
    const list = await userService.listMyFavoriteClubs(req.user!.userId);
    res.json(list);
  } catch (err) {
    next(err);
  }
});

router.post('/me/favorite-clubs/:clubId', requireAuth, async (req, res, next) => {
  try {
    await userService.addFavoriteClub(req.user!.userId, String(req.params['clubId']));
    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.delete('/me/favorite-clubs/:clubId', requireAuth, async (req, res, next) => {
  try {
    await userService.removeFavoriteClub(req.user!.userId, String(req.params['clubId']));
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.get('/:identifier', async (req, res, next) => {
  try {
    // Read JWT softly: if Authorization header present, decode to identify viewer
    let viewerId: string | null = null;
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) {
      try {
        const { verifyToken } = await import('../lib/jwt.js');
        viewerId = verifyToken(auth.slice(7)).userId;
      } catch {
        viewerId = null;
      }
    }
    const user = await userService.getUserPublic(String(req.params['identifier']), viewerId);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

export default router;
