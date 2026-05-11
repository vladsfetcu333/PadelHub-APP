import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Check } from 'lucide-react';
import type { NotificationDto, NotificationListResponse } from '@padel/shared';

import { api } from '@/lib/api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/store/auth';
import { cn } from '@/lib/utils';

const POLL_MS = 30_000;

/**
 * Header bell — shows unread count, opens a 10-item dropdown of the most
 * recent notifications. Each item links to its actionUrl and marks itself
 * read on click. "Mark all read" + "View all" actions in the footer.
 */
export function NotificationBell() {
  const user = useAuth((s) => s.user);
  const navigate = useNavigate();
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [open, setOpen] = useState(false);

  // Poll unread count
  useEffect(() => {
    if (!user) return;
    const tick = async () => {
      try {
        const { data } = await api.get<{ count: number }>('/api/notifications/unread-count');
        setCount(data.count);
      } catch {
        /* ignore */
      }
    };
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => clearInterval(id);
  }, [user]);

  // Fetch list when opening the dropdown
  useEffect(() => {
    if (!open || !user) return;
    api
      .get<NotificationListResponse>('/api/notifications', { params: { pageSize: 10 } })
      .then((res) => setItems(res.data.items))
      .catch(() => {
        /* ignore */
      });
  }, [open, user]);

  if (!user) return null;

  const markRead = async (n: NotificationDto) => {
    if (!n.isRead) {
      try {
        await api.post(`/api/notifications/${n.id}/read`);
        setCount((c) => Math.max(0, c - 1));
        setItems((arr) => arr.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      } catch {
        /* ignore */
      }
    }
    if (n.actionUrl) {
      navigate(n.actionUrl);
      setOpen(false);
    }
  };

  const markAllRead = async () => {
    try {
      await api.post('/api/notifications/read-all');
      setCount(0);
      setItems((arr) => arr.map((x) => ({ ...x, isRead: true })));
    } catch {
      /* ignore */
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted"
          aria-label="Notificări"
        >
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute right-0 top-0 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
              {count > 99 ? '99+' : count}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <p className="text-sm font-semibold">Notificări</p>
          {count > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1 text-xs text-brand-700 hover:underline"
            >
              <Check className="h-3 w-3" /> Marchează toate
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Nicio notificare.</p>
          ) : (
            items.map((n) => (
              <button
                key={n.id}
                onClick={() => markRead(n)}
                className={cn(
                  'block w-full border-b border-border px-3 py-2 text-left text-sm last:border-0 hover:bg-muted',
                  !n.isRead && 'bg-brand-50/40',
                )}
              >
                <p className="font-medium leading-tight">{n.title}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {new Date(n.createdAt).toLocaleString('ro-RO', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </button>
            ))
          )}
        </div>
        <div className="border-t border-border px-3 py-2 text-center">
          <Link
            to="/notifications"
            onClick={() => setOpen(false)}
            className="text-xs text-brand-700 hover:underline"
          >
            Vezi toate
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
