import type { NotificationType } from '../constants/enums';

export interface NotificationDto {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  actionUrl: string | null;
  metadata: Record<string, unknown> | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationListResponse {
  items: NotificationDto[];
  total: number;
  page: number;
  pageSize: number;
}
