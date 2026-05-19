import { Router } from 'express';
import {
  ClubCreateSchema,
  ClubUpdateSchema,
  ClubListQuerySchema,
  CourtCreateSchema,
  CourtUpdateSchema,
  UploadClubPhotoSchema,
  ReorderClubPhotosSchema,
} from '@padel/shared';
import { validate, valid } from '../middleware/validate.js';
import type { ClubListQuery } from '@padel/shared';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as clubService from '../services/clubService.js';
import * as clubPhotoService from '../services/clubPhotoService.js';

const router = Router();

router.get('/', validate(ClubListQuerySchema, 'query'), async (req, res, next) => {
  try {
    const result = await clubService.listClubs(valid<ClubListQuery>(req, 'query'));
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/:slug', async (req, res, next) => {
  try {
    const club = await clubService.getClubBySlug(String(req.params['slug']));
    res.json(club);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/',
  requireAuth,
  requireRole('ADMIN', 'CLUB_OWNER'),
  validate(ClubCreateSchema),
  async (req, res, next) => {
    try {
      const club = await clubService.createClub(req.user!.userId, req.user!.role, req.body);
      res.status(201).json(club);
    } catch (err) {
      next(err);
    }
  },
);

router.patch('/:id', requireAuth, validate(ClubUpdateSchema), async (req, res, next) => {
  try {
    const club = await clubService.updateClub(
      String(req.params['id']),
      req.user!.userId,
      req.user!.role,
      req.body,
    );
    res.json(club);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    await clubService.deleteClub(String(req.params['id']));
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.post('/:id/verify', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const club = await clubService.verifyClub(String(req.params['id']));
    res.json(club);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/courts', requireAuth, validate(CourtCreateSchema), async (req, res, next) => {
  try {
    const court = await clubService.addCourt(
      String(req.params['id']),
      req.user!.userId,
      req.user!.role,
      req.body,
    );
    res.status(201).json(court);
  } catch (err) {
    next(err);
  }
});

// Courts endpoints addressed by court id directly (mounted at /api/courts elsewhere
// would also work; for thesis simplicity we keep the club router scoped)
router.patch(
  '/courts/:courtId',
  requireAuth,
  validate(CourtUpdateSchema),
  async (req, res, next) => {
    try {
      const court = await clubService.updateCourt(
        String(req.params['courtId']),
        req.user!.userId,
        req.user!.role,
        req.body,
      );
      res.json(court);
    } catch (err) {
      next(err);
    }
  },
);

router.delete('/courts/:courtId', requireAuth, async (req, res, next) => {
  try {
    await clubService.deleteCourt(String(req.params['courtId']), req.user!.userId, req.user!.role);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// ── Photo gallery endpoints (Phase 5 Part E) ─────────────────────────
// Auth: caller must be ADMIN or the owner of the club (Club.ownerId).
// The service layer enforces both rules and throws 403 otherwise.

router.post('/:id/photos', requireAuth, validate(UploadClubPhotoSchema), async (req, res, next) => {
  try {
    const photos = await clubPhotoService.addClubPhoto(
      String(req.params['id']),
      req.user!.userId,
      req.user!.role,
      req.validated!.body as { photo: string; category: never; caption?: string },
    );
    res.status(201).json({ photos });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id/photos/:photoIndex', requireAuth, async (req, res, next) => {
  try {
    const idx = Number(req.params['photoIndex']);
    if (!Number.isFinite(idx)) {
      return next(new Error('photoIndex must be a number'));
    }
    const photos = await clubPhotoService.deleteClubPhoto(
      String(req.params['id']),
      idx,
      req.user!.userId,
      req.user!.role,
    );
    res.json({ photos });
  } catch (err) {
    next(err);
  }
});

router.patch(
  '/:id/photos/reorder',
  requireAuth,
  validate(ReorderClubPhotosSchema),
  async (req, res, next) => {
    try {
      const body = req.validated!.body as { order: number[] };
      const photos = await clubPhotoService.reorderClubPhotos(
        String(req.params['id']),
        body.order,
        req.user!.userId,
        req.user!.role,
      );
      res.json({ photos });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
