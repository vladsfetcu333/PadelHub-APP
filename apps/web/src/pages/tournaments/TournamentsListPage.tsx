import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import {
  ro,
  TournamentStatus,
  TournamentFormat,
  type TournamentDto,
  type TournamentListResponse,
} from '@padel/shared';
import { toast } from 'sonner';

import { api, extractErrorMessage } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TournamentCard } from '@/components/tournaments/TournamentCard';
import { useAuth } from '@/store/auth';

export default function TournamentsListPage() {
  const user = useAuth((s) => s.user);
  const [items, setItems] = useState<TournamentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'ANY' | (typeof TournamentStatus)[number]>('REGISTRATION');
  const [format, setFormat] = useState<'ANY' | (typeof TournamentFormat)[number]>('ANY');

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = { pageSize: '30' };
    if (status !== 'ANY') params['status'] = status;
    if (format !== 'ANY') params['format'] = format;
    api
      .get<TournamentListResponse>('/api/tournaments', { params })
      .then((res) => setItems(res.data.items))
      .catch((err) => toast.error(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [status, format]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{ro.tournaments.title}</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? ro.common.loading : `${items.length} turnee`}
          </p>
        </div>
        {user && (
          <Button asChild size="sm">
            <Link to="/tournaments/new">
              <Plus className="mr-1 h-4 w-4" /> {ro.tournaments.create}
            </Link>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_1fr]">
        <aside>
          <Card>
            <CardContent className="space-y-3 pt-6">
              <div className="space-y-1.5">
                <Label>Stare</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ANY">{ro.clubs.filterAll}</SelectItem>
                    {TournamentStatus.map((s) => (
                      <SelectItem key={s} value={s}>
                        {ro.tournaments.status[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Format</Label>
                <Select value={format} onValueChange={(v) => setFormat(v as typeof format)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ANY">{ro.clubs.filterAll}</SelectItem>
                    {TournamentFormat.map((f) => (
                      <SelectItem key={f} value={f}>
                        {ro.tournaments.formatNames[f]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </aside>

        <section>
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground">{ro.tournaments.noResults}</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((t) => (
                <TournamentCard key={t.id} tournament={t} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
