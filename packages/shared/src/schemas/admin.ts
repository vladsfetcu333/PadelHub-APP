import { z } from 'zod';
import { UserRole } from '../constants/enums';

export const SuspendUserSchema = z.object({
  reason: z.string().min(3).max(500),
});

export const ResetPasswordSchema = z.object({
  confirm: z.literal(true),
});

export const UpdateAdminUserSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  email: z.string().email().optional(),
  role: z.enum(UserRole).optional(),
  isVerified: z.boolean().optional(),
});

export const AdminUserListQuerySchema = z.object({
  search: z.string().trim().min(1).max(100).optional(),
  role: z.enum(UserRole).optional(),
  status: z.enum(['active', 'suspended', 'unverified']).optional(),
  sortBy: z.enum(['createdAt', 'username', 'email', 'updatedAt']).optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
