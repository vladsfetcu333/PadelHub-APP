import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { ro, OpenMatchStatus, type OpenMatchListResponse, type OpenMatchDto } from '@padel/shared';
import { toast } from 'sonner';

import { api, extractErrorMessage } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { OpenMatchCard } from '@/components/openMatches/OpenMatchCard';
import { useAuth } from '@/store/auth';

export default function OpenMatchesListPage() {
  const user = useAuth((s) => s.user);
  const [items, setItems] = useState<OpenMatchDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState('');
  const [status, setStatus] = useState<'ANY' | (typeof OpenMatchStatus)[number]>('OPEN');
  const [levelMin, setLevelMin] = useState('');
  const [levelMax, setLevelMax] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { pageSize: 30 };
      if (city) params['city'] = city;
      if (status !== 'ANY') params['status'] = status;
      if (levelMin) params['levelMin'] = Number(levelMin);
      if (levelMax) params['levelMax'] = Number(levelMax);
      const { data } = await api.get<OpenMatchListResponse>('/api/open-matches', { params });
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
  }, [city, status, levelMin, levelMax]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{ro.openMatches.title}</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? ro.common.loading : `${items.length} match-uri`}
          </p>
        </div>
        {user && (
          <Button asChild size="sm">
            <Link to="/open-matches/new">
              <Plus className="mr-1 h-4 w-4" />
              {ro.openMatches.create}
            </Link>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
        <aside>
          <Card>
            <CardContent className="space-y-4 pt-6">
              <p className="text-sm font-semibold">{ro.openMatches.filtersTitle}</p>

              <div className="space-y-1.5">
                <Label>{ro.clubs.filterCity}</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="orice" />
              </div>

              <div className="space-y-1.5">
                <Label>{ro.openMatches.filterStatus}</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ANY">{ro.clubs.filterAll}</SelectItem>
                    {OpenMatchStatus.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s === 'OPEN'
                          ? ro.openMatches.open
                          : s === 'FULL'
                            ? ro.openMatches.full
                            : s === 'CANCELLED'
                              ? ro.openMatches.cancelled
                              : ro.openMatches.completed}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label>{ro.openMatches.filterLevelMin}</Label>
                  <Input
                    type="number"
                    min="1"
                    max="7"
                    step="0.5"
                    value={levelMin}
                    onChange={(e) => setLevelMin(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>{ro.openMatches.filterLevelMax}</Label>
                  <Input
                    type="number"
                    min="1"
                    max="7"
                    step="0.5"
                    value={levelMax}
                    onChange={(e) => setLevelMax(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>

        <section>
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-40 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground">{ro.openMatches.noResults}</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((p) => (
                <OpenMatchCard key={p.id} post={p} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
