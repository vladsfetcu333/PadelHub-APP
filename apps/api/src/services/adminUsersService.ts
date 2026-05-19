/**
 * Admin user-management service.
 *
 * Backs the /api/admin/users routes. All operations require an ADMIN
 * caller — enforced at the router level via `requireRole('ADMIN')`.
 *
 * Suspension model:
 *   - `isSuspended` boolean flips on suspend / unsuspend.
 *   - `suspendedAt`, `suspendedReason`, `suspendedBy` are written on
 *     suspend and nulled on unsuspend.
 *   - The login flow (authService.login) rejects suspended users with
 *     a 403 containing the reason; requireAuth treats them as
 *     unauthenticated for non-admin endpoints.
 *
 * Password reset:
 *   - Generates a 12-character mixed password, hashes it, returns the
 *     plaintext in the response so the admin can hand it to the user.
 *   - The request body must include `{ confirm: true }` — guards against
 *     accidental clicks.
 */
import type { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { badRequest, conflict, notFound } from '../lib/httpError.js';
import type {
  AdminUserDetailDto,
  AdminUserListItemDto,
  AdminUserListResponse,
  AdminUserStatusFilter,
  UpdateAdminUserRequest,
  UserRole,
} from '@padel/shared';

const ALLOWED_SORT_KEYS = ['createdAt', 'username', 'email', 'updatedAt'] as const;
type SortKey = (typeof ALLOWED_SORT_KEYS)[number];

export interface ListUsersOptions {
  search?: string;
  role?: UserRole;
  status?: AdminUserStatusFilter;
  sortBy?: SortKey;
  sortDir?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

function userToListItem(
  u: {
    _count?: {
      matchesAsT1P1: number;
      matchesAsT1P2: number;
      matchesAsT2P1: number;
      matchesAsT2P2: number;
    };
  } & Awaited<ReturnType<typeof prisma.user.findFirst>>,
): AdminUserListItemDto {
  if (!u) throw new Error('userToListItem received null');
  const m = u._count;
  const matchCount =
    (m?.matchesAsT1P1 ?? 0) +
    (m?.matchesAsT1P2 ?? 0) +
    (m?.matchesAsT2P1 ?? 0) +
    (m?.matchesAsT2P2 ?? 0);
  return {
    id: u.id,
    email: u.email,
    username: u.username,
    firstName: u.firstName,
    lastName: u.lastName,
    role: u.role as UserRole,
    padelLevel: u.padelLevel,
    avatarUrl: u.avatarUrl,
    city: u.city,
    isActive: u.isActive,
    isVerified: u.isVerified,
    isSuspended: u.isSuspended,
    suspendedAt: u.suspendedAt?.toISOString() ?? null,
    suspendedReason: u.suspendedReason,
    createdAt: u.createdAt.toISOString(),
    matchCount,
  };
}

export async function listUsers(opts: ListUsersOptions): Promise<AdminUserListResponse> {
  const page = Math.max(1, opts.page ?? 1);
  const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
  const sortBy: SortKey = ALLOWED_SORT_KEYS.includes(opts.sortBy as SortKey)
    ? (opts.sortBy as SortKey)
    : 'createdAt';
  const sortDir = opts.sortDir === 'asc' ? 'asc' : 'desc';

  // Build Prisma where clause. Case-insensitive search uses Postgres ILIKE
  // through `mode: 'insensitive'`.
  const where: Prisma.UserWhereInput = {};
  if (opts.role) where.role = opts.role;
  if (opts.status === 'active') {
    where.isSuspended = false;
    where.isActive = true;
  } else if (opts.status === 'suspended') {
    where.isSuspended = true;
  } else if (opts.status === 'unverified') {
    where.isVerified = false;
  }
  const search = opts.search?.trim();
  if (search) {
    where.OR = [
      { username: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { [sortBy]: sortDir },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        _count: {
          select: {
            matchesAsT1P1: true,
            matchesAsT1P2: true,
            matchesAsT2P1: true,
            matchesAsT2P2: true,
          },
        },
      },
    }),
  ]);

  return {
    items: users.map(userToListItem),
    total,
    page,
    limit,
  };
}

export async function getUserDetail(userId: string): Promise<AdminUserDetailDto> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      _count: {
        select: {
          matchesAsT1P1: true,
          matchesAsT1P2: true,
          matchesAsT2P1: true,
          matchesAsT2P2: true,
          notifications: true,
        },
      },
    },
  });
  if (!u) throw notFound('User not found');

  // Resolve "suspended by" admin if present.
  let suspendedByUser: AdminUserDetailDto['suspendedByUser'] = null;
  if (u.suspendedBy) {
    const a = await prisma.user.findUnique({
      where: { id: u.suspendedBy },
      select: { id: true, username: true, firstName: true, lastName: true },
    });
    if (a) suspendedByUser = a;
  }

  // Most recent match the user took part in (in any role).
  const lastMatch = await prisma.match.findFirst({
    where: {
      OR: [
        { team1Player1Id: userId },
        { team1Player2Id: userId },
        { team2Player1Id: userId },
        { team2Player2Id: userId },
      ],
    },
    orderBy: { scheduledAt: 'desc' },
    select: { scheduledAt: true },
  });

  const base = userToListItem(u);
  return {
    ...base,
    phone: u.phone,
    bio: u.bio,
    dateOfBirth: u.dateOfBirth.toISOString(),
    gender: u.gender,
    preferredSide: u.preferredSide,
    dominantHand: u.dominantHand,
    glickoRating: u.glickoRating,
    glickoRD: u.glickoRD,
    emailVerifiedAt: u.emailVerifiedAt?.toISOString() ?? null,
    suspendedBy: u.suspendedBy,
    suspendedByUser,
    recentMatchCount: base.matchCount,
    lastMatchAt: lastMatch?.scheduledAt.toISOString() ?? null,
    notificationsCount: u._count.notifications,
  };
}

export async function suspendUser(
  userId: string,
  adminId: string,
  reason: string,
): Promise<AdminUserDetailDto> {
  if (userId === adminId) throw badRequest('Nu te poți suspenda singur.');
  const reasonTrimmed = reason.trim();
  if (reasonTrimmed.length < 3) {
    throw badRequest('Motivul suspendării trebuie să aibă cel puțin 3 caractere.');
  }
  if (reasonTrimmed.length > 500) {
    throw badRequest('Motivul suspendării poate avea cel mult 500 de caractere.');
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) throw notFound('User not found');
  if (target.isSuspended) throw conflict('Utilizatorul este deja suspendat.');

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        isSuspended: true,
        suspendedAt: new Date(),
        suspendedReason: reasonTrimmed,
        suspendedBy: adminId,
      },
    });
    await tx.notification.create({
      data: {
        userId,
        type: 'GENERIC',
        title: 'Cont suspendat',
        body: `Contul tău a fost suspendat. Motiv: ${reasonTrimmed}. Contactează un administrator.`,
      },
    });
  });

  return getUserDetail(userId);
}

export async function unsuspendUser(userId: string): Promise<AdminUserDetailDto> {
  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (!u) throw notFound('User not found');
  if (!u.isSuspended) throw conflict('Utilizatorul nu este suspendat.');

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        isSuspended: false,
        suspendedAt: null,
        suspendedReason: null,
        suspendedBy: null,
      },
    });
    await tx.notification.create({
      data: {
        userId,
        type: 'GENERIC',
        title: 'Cont reactivat',
        body: 'Suspendarea a fost ridicată. Te poți autentifica din nou.',
      },
    });
  });

  return getUserDetail(userId);
}

/** Generate a random password — mixed case letters, digits, no symbols
 *  (to keep it easy to dictate by phone if needed). */
function generateTempPassword(length = 12): string {
  // Skip ambiguous characters (0/O, 1/l/I) so the temp password is
  // unambiguous when read aloud.
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let out = '';
  const buf = new Uint8Array(length);
  // Node's crypto is available globally via globalThis.crypto in Node 20+
  globalThis.crypto.getRandomValues(buf);
  for (let i = 0; i < length; i++) out += alphabet[buf[i]! % alphabet.length];
  return out;
}

export async function resetUserPassword(userId: string): Promise<{ newPassword: string }> {
  const u = await prisma.user.findUnique({ where: { id: userId } });
  if (!u) throw notFound('User not found');

  const newPassword = generateTempPassword(12);
  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  return { newPassword };
}

const UPDATABLE_FIELDS = ['firstName', 'lastName', 'email', 'role', 'isVerified'] as const;

export async function updateAdminUser(
  userId: string,
  patch: UpdateAdminUserRequest,
): Promise<AdminUserDetailDto> {
  const data: Prisma.UserUpdateInput = {};
  for (const key of UPDATABLE_FIELDS) {
    if (patch[key] !== undefined) {
      // Cast narrows: Prisma's typing for individual fields is fine here.
      (data as Record<string, unknown>)[key] = patch[key];
    }
  }
  if (Object.keys(data).length === 0) throw badRequest('Niciun câmp de actualizat.');

  // Email uniqueness check to surface a clean error instead of a 500.
  if (patch.email) {
    const existing = await prisma.user.findUnique({ where: { email: patch.email } });
    if (existing && existing.id !== userId) {
      throw conflict('Email-ul este deja folosit.');
    }
  }

  await prisma.user.update({ where: { id: userId }, data });
  return getUserDetail(userId);
}
