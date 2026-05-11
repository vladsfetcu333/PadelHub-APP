import { Router } from 'express';
import {
  TournamentCreateSchema,
  TournamentListQuerySchema,
  TournamentMatchScoreSchema,
  GuestPlayerSchema,
} from '@padel/shared';
import type { TournamentListQuery } from '@padel/shared';
import { validate, valid } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import * as tournamentService from '../services/tournamentService.js';

const router = Router();

router.get('/', validate(TournamentListQuerySchema, 'query'), async (req, res, next) => {
  try {
    const q = valid<TournamentListQuery>(req, 'query');
    const result = await tournamentService.listTournaments(q);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const t = await tournamentService.getTournamentById(String(req.params['id']));
    res.json(t);
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, validate(TournamentCreateSchema), async (req, res, next) => {
  try {
    const t = await tournamentService.createTournament(req.user!.userId, req.body);
    res.status(201).json(t);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/register', requireAuth, async (req, res, next) => {
  try {
    const t = await tournamentService.registerSelf(String(req.params['id']), req.user!.userId);
    res.json(t);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/:id/players/guest',
  requireAuth,
  validate(GuestPlayerSchema),
  async (req, res, next) => {
    try {
      const t = await tournamentService.addGuestPlayer(
        String(req.params['id']),
        req.user!.userId,
        req.body,
      );
      res.status(201).json(t);
    } catch (err) {
      next(err);
    }
  },
);

router.delete('/:id/players/:playerId', requireAuth, async (req, res, next) => {
  try {
    const t = await tournamentService.removePlayer(
      String(req.params['id']),
      String(req.params['playerId']),
      req.user!.userId,
    );
    res.json(t);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/start', requireAuth, async (req, res, next) => {
  try {
    const t = await tournamentService.startTournament(String(req.params['id']), req.user!.userId);
    res.json(t);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/:id/matches/:matchId/score',
  requireAuth,
  validate(TournamentMatchScoreSchema),
  async (req, res, next) => {
    try {
      const t = await tournamentService.enterMatchScore(
        String(req.params['id']),
        String(req.params['matchId']),
        req.user!.userId,
        req.body,
      );
      res.json(t);
    } catch (err) {
      next(err);
    }
  },
);

router.post('/:id/rounds/:roundNumber/complete', requireAuth, async (req, res, next) => {
  try {
    const t = await tournamentService.completeRound(
      String(req.params['id']),
      Number(req.params['roundNumber']),
      req.user!.userId,
    );
    res.json(t);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/complete', requireAuth, async (req, res, next) => {
  try {
    const t = await tournamentService.completeTournament(
      String(req.params['id']),
      req.user!.userId,
    );
    res.json(t);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/leaderboard', async (req, res, next) => {
  try {
    const lb = await tournamentService.getLeaderboard(String(req.params['id']));
    res.json(lb);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/display', async (req, res, next) => {
  try {
    const d = await tournamentService.getDisplayPayload(String(req.params['id']));
    res.json(d);
  } catch (err) {
    next(err);
  }
});

export default router;
