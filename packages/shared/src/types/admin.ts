/**
 * Admin user-management DTOs — Phase 5 Part D.
 *
 * These are intentionally separate from PublicUserDto / SelfUserDto:
 * admins see more (suspension state, last activity, role) than peers
 * but less than the raw Prisma User row (no passwordHash, ever).
 */

import type { UserRole } from '../constants/enums';

export type AdminUserStatusFilter = 'active' | 'suspended' | 'unverified';

export interface AdminUserListItemDto {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  padelLevel: number;
  avatarUrl: string | null;
  city: string;
  isActive: boolean;
  isVerified: boolean;
  isSuspended: boolean;
  suspendedAt: string | null;
  suspendedReason: string | null;
  createdAt: string;
  matchCount: number;
}

export interface AdminUserListResponse {
  items: AdminUserListItemDto[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminUserDetailDto extends AdminUserListItemDto {
  phone: string | null;
  bio: string | null;
  dateOfBirth: string;
  gender: string;
  preferredSide: string;
  dominantHand: string;
  glickoRating: number;
  glickoRD: number;
  emailVerifiedAt: string | null;
  suspendedBy: string | null;
  /** Suspending admin's display info if available — for "Suspended by X on Y". */
  suspendedByUser: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
  } | null;
  recentMatchCount: number;
  lastMatchAt: string | null;
  notificationsCount: number;
}

export interface SuspendUserRequest {
  reason: string;
}

export interface ResetPasswordRequest {
  confirm: true;
}

export interface ResetPasswordResponse {
  newPassword: string;
}

export interface UpdateAdminUserRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: UserRole;
  isVerified?: boolean;
}
