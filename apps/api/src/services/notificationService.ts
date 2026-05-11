/**
 * Notifications service.
 *
 * In-app only (no email, no push). The UI polls /unread-count every 30s
 * and re-fetches the dropdown list on bell click.
 *
 * The `create*` helpers are imported by auth, openMatch, match, and
 * tournament services at the trigger points listed in the spec.
 */

import type { Notification, Prisma } from '@prisma/client';
import type { NotificationDto, NotificationListResponse } from '@padel/shared';
import { prisma } from '../lib/prisma.js';
import { notFound, forbidden } from '../lib/httpError.js';
import { logger } from '../lib/logger.js';

function toDto(n: Notification): NotificationDto {
  let metadata: Record<string, unknown> | null = null;
  if (n.metadata) {
    try {
      metadata = JSON.parse(n.metadata);
    } catch {
      metadata = null;
    }
  }
  return {
    id: n.id,
    type: n.type as NotificationDto['type'],
    title: n.title,
    body: n.body,
    actionUrl: n.actionUrl,
    metadata,
    isRead: n.isRead,
    readAt: n.readAt?.toISOString() ?? null,
    createdAt: n.createdAt.toISOString(),
  };
}

interface CreateInput {
  userId: string;
  type: NotificationDto['type'];
  title: string;
  body: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Fire-and-forget notification creator. Failures are logged but do not
 * propagate — a notification never blocks a primary action.
 */
export async function createNotification(input: CreateInput): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        actionUrl: input.actionUrl ?? null,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      },
    });
  } catch (err) {
    logger.error({ err, input }, 'Failed to create notification');
  }
}

export async function listForUser(
  userId: string,
  opts: { unreadOnly?: boolean; page?: number; pageSize?: number } = {},
): Promise<NotificationListResponse> {
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 20;
  const where: Prisma.NotificationWhereInput = { userId };
  if (opts.unreadOnly) where.isRead = false;

  const [rows, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.notification.count({ where }),
  ]);
  return { items: rows.map(toDto), total, page, pageSize };
}

export async function unreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

export async function markRead(id: string, userId: string): Promise<NotificationDto> {
  const n = await prisma.notification.findUnique({ where: { id } });
  if (!n) throw notFound('Notification not found');
  if (n.userId !== userId) throw forbidden();
  const updated = await prisma.notification.update({
    where: { id },
    data: { isRead: true, readAt: new Date() },
  });
  return toDto(updated);
}

export async function markAllRead(userId: string): Promise<{ updated: number }> {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  return { updated: result.count };
}
