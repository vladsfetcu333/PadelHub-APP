/**
 * Admin user-management routes — all gated by `requireRole('ADMIN')`.
 *
 *   GET    /api/admin/users                       paginated list with filters
 *   GET    /api/admin/users/:id                   full detail
 *   PATCH  /api/admin/users/:id                   edit firstName/lastName/email/role/isVerified
 *   POST   /api/admin/users/:id/suspend           body: { reason }
 *   POST   /api/admin/users/:id/unsuspend         no body
 *   POST   /api/admin/users/:id/reset-password    body: { confirm: true }
 */
import { Router } from 'express';
import {
  AdminUserListQuerySchema,
  ResetPasswordSchema,
  SuspendUserSchema,
  UpdateAdminUserSchema,
} from '@padel/shared';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as svc from '../services/adminUsersService.js';

const router = Router();

// All admin routes require both auth and the ADMIN role.
router.use(requireAuth, requireRole('ADMIN'));

router.get('/', validate(AdminUserListQuerySchema, 'query'), async (req, res, next) => {
  try {
    const q = (req.validated?.query ?? {}) as Record<string, unknown>;
    const result = await svc.listUsers({
      search: q['search'] as string | undefined,
      role: q['role'] as never,
      status: q['status'] as never,
      sortBy: q['sortBy'] as never,
      sortDir: q['sortDir'] as never,
      page: q['page'] as number | undefined,
      limit: q['limit'] as number | undefined,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const detail = await svc.getUserDetail(String(req.params['id']));
    res.json(detail);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', validate(UpdateAdminUserSchema), async (req, res, next) => {
  try {
    const detail = await svc.updateAdminUser(
      String(req.params['id']),
      req.validated!.body as never,
    );
    res.json(detail);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/suspend', validate(SuspendUserSchema), async (req, res, next) => {
  try {
    const body = req.validated!.body as { reason: string };
    const detail = await svc.suspendUser(String(req.params['id']), req.user!.userId, body.reason);
    res.json(detail);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/unsuspend', async (req, res, next) => {
  try {
    const detail = await svc.unsuspendUser(String(req.params['id']));
    res.json(detail);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/reset-password', validate(ResetPasswordSchema), async (req, res, next) => {
  try {
    const result = await svc.resetUserPassword(String(req.params['id']));
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
