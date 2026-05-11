import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import type { NotificationDto, NotificationListResponse } from '@padel/shared';
import { toast } from 'sonner';

import { api, extractErrorMessage } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<NotificationListResponse>('/api/notifications', {
        params: { unreadOnly, pageSize: 50 },
      });
      setItems(data.items);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadOnly]);

  const markAllRead = async () => {
    try {
      await api.post('/api/notifications/read-all');
      await load();
      toast.success('Marcate toate ca citite');
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  const markRead = async (id: string) => {
    try {
      await api.post(`/api/notifications/${id}/read`);
      setItems((arr) => arr.map((x) => (x.id === id ? { ...x, isRead: true } : x)));
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notificări</h1>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => setUnreadOnly(e.target.checked)}
              className="h-4 w-4 rounded border-input text-brand-700"
            />
            Doar necitite
          </label>
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <Check className="mr-1 h-4 w-4" /> Marchează toate
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Se încarcă…</p>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground">Nicio notificare.</p>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <Card key={n.id} className={cn(!n.isRead && 'border-brand-200 bg-brand-50/30')}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-medium leading-tight">{n.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {new Date(n.createdAt).toLocaleString('ro-RO')}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {n.actionUrl && (
                      <Button asChild size="sm" variant="outline">
                        <Link to={n.actionUrl} onClick={() => !n.isRead && markRead(n.id)}>
                          Deschide
                        </Link>
                      </Button>
                    )}
                    {!n.isRead && (
                      <button
                        onClick={() => markRead(n.id)}
                        className="text-xs text-brand-700 hover:underline"
                      >
                        marchează citită
                      </button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
