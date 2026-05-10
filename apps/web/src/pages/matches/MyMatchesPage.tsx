import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ro, type MatchListResponse, type MatchDto, type MatchStatus } from '@padel/shared';
import { toast } from 'sonner';

import { api, extractErrorMessage } from '@/lib/api';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { MatchListItem } from '@/components/matches/MatchListItem';
import { useAuth } from '@/store/auth';

const TABS: Array<{ key: string; status: MatchStatus | null; label: string }> = [
  { key: 'pending', status: 'PENDING_CONFIRMATION', label: ro.matches.tabPending },
  { key: 'scheduled', status: 'SCHEDULED', label: ro.matches.tabScheduled },
  { key: 'validated', status: 'VALIDATED', label: ro.matches.tabCompleted },
  { key: 'expired', status: 'EXPIRED', label: ro.matches.tabExpired },
];

export default function MyMatchesPage() {
  const user = useAuth((s) => s.user);
  const [params, setParams] = useSearchParams();
  const activeKey = params.get('tab') ?? 'pending';
  const active = TABS.find((t) => t.key === activeKey) ?? TABS[0]!;

  const [items, setItems] = useState<MatchDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get<MatchListResponse>('/api/matches/me', {
        params: active.status ? { status: active.status } : {},
      })
      .then((res) => {
        if (!cancelled) setItems(res.data.items);
      })
      .catch((err) => toast.error(extractErrorMessage(err)))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [active.status]);

  if (!user) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-bold">{ro.matches.title}</h1>
      <Tabs
        value={active.key}
        onValueChange={(v) => {
          const next = new URLSearchParams(params);
          next.set('tab', v);
          setParams(next, { replace: true });
        }}
      >
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {TABS.map((t) => (
          <TabsContent key={t.key} value={t.key}>
            {loading ? (
              <p className="p-4 text-muted-foreground">{ro.common.loading}</p>
            ) : items.length === 0 ? (
              <p className="p-4 text-muted-foreground">Niciun match aici.</p>
            ) : (
              <div className="space-y-3">
                {items.map((m) => (
                  <MatchListItem key={m.id} match={m} currentUserId={user.id} />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
