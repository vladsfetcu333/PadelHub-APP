import { Router } from 'express';
import {
  RegisterSchema,
  LoginSchema,
  ChangePasswordSchema,
  RequestPasswordResetSchema,
} from '@padel/shared';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import * as authService from '../services/authService.js';

const router = Router();

router.post('/register', validate(RegisterSchema), async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/login', validate(LoginSchema), async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (_req, res) => {
  // Stateless JWT — client discards the token. Endpoint exists for symmetry.
  res.json({ ok: true });
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user!.userId);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.post('/me/password', requireAuth, validate(ChangePasswordSchema), async (req, res, next) => {
  try {
    await authService.changePassword(req.user!.userId, req.body);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post('/password-reset', validate(RequestPasswordResetSchema), (_req, res) => {
  // TODO: Phase 1.x — implement email-based password reset flow.
  // Always respond 200 to avoid leaking whether the email exists.
  res.json({
    ok: true,
    message: 'TODO: email reset link will be sent in a future iteration.',
  });
});

export default router;
