import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Calendar, MapPin, Settings, Tv, Trophy, Users, Plus } from 'lucide-react';
import { ro, type TournamentDto } from '@padel/shared';
import { toast } from 'sonner';

import { api, extractErrorMessage } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAuth } from '@/store/auth';
import { cn } from '@/lib/utils';

export default function TournamentDetailPage() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const user = useAuth((s) => s.user);
  const [t, setT] = useState<TournamentDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data } = await api.get<TournamentDto>(`/api/tournaments/${id}`);
      setT(data);
    } catch (err) {
      toast.error(extractErrorMessage(err, ro.errors.notFound));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <p className="p-8 text-muted-foreground">{ro.common.loading}</p>;
  if (!t) return <p className="p-8 text-muted-foreground">{ro.errors.notFound}</p>;

  const isOrganizer = t.organizerId === user?.id;
  const isRegistered = t.players.some((p) => p.userId === user?.id);
  const canRegister =
    user &&
    !isRegistered &&
    (t.status === 'REGISTRATION' || t.status === 'DRAFT') &&
    t.players.length < t.maxPlayers;

  const tab = params.get('tab') ?? 'players';

  const register = async () => {
    setRegistering(true);
    try {
      const { data } = await api.post<TournamentDto>(`/api/tournaments/${id}/register`);
      setT(data);
      toast.success('Înscris în turneu');
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setRegistering(false);
    }
  };

  const dateStr = new Date(t.startDate).toLocaleString('ro-RO', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {t.name}{' '}
            <span className="ml-2 align-middle text-xs font-normal text-muted-foreground">
              {ro.tournaments.formatNames[t.format]}
            </span>
          </h1>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" /> {t.club.name}
          </p>
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" /> {dateStr}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canRegister && (
            <Button onClick={register} disabled={registering}>
              {ro.tournaments.register}
            </Button>
          )}
          {isOrganizer && (
            <Button asChild variant="outline">
              <Link to={`/tournaments/${t.id}/manage`}>
                <Settings className="mr-1 h-4 w-4" /> {ro.tournaments.manage}
              </Link>
            </Button>
          )}
          {t.status === 'IN_PROGRESS' && (
            <Button asChild variant="secondary">
              <Link to={`/tournaments/${t.id}/display`} target="_blank">
                <Tv className="mr-1 h-4 w-4" /> {ro.tournaments.display}
              </Link>
            </Button>
          )}
        </div>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => {
          const n = new URLSearchParams(params);
          if (v === 'players') n.delete('tab');
          else n.set('tab', v);
          setParams(n, { replace: true });
        }}
      >
        <TabsList>
          <TabsTrigger value="players">{ro.tournaments.players}</TabsTrigger>
          <TabsTrigger value="schedule">{ro.tournaments.schedule}</TabsTrigger>
          <TabsTrigger value="leaderboard">{ro.tournaments.leaderboard}</TabsTrigger>
        </TabsList>
        <TabsContent value="players">
          <PlayersTab t={t} reload={load} isOrganizer={isOrganizer} />
        </TabsContent>
        <TabsContent value="schedule">
          <ScheduleTab t={t} />
        </TabsContent>
        <TabsContent value="leaderboard">
          <LeaderboardTab t={t} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PlayersTab({
  t,
  reload,
  isOrganizer,
}: {
  t: TournamentDto;
  reload: () => Promise<void>;
  isOrganizer: boolean;
}) {
  const [guestName, setGuestName] = useState('');
  const [guestLevel, setGuestLevel] = useState('');
  const [adding, setAdding] = useState(false);

  const addGuest = async () => {
    if (!guestName) return toast.error('Numele invitatului e obligatoriu');
    setAdding(true);
    try {
      await api.post(`/api/tournaments/${t.id}/players/guest`, {
        name: guestName,
        level: guestLevel ? Number(guestLevel) : null,
      });
      setGuestName('');
      setGuestLevel('');
      toast.success('Invitat adăugat');
      await reload();
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setAdding(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>
            <Users className="mr-1 inline h-4 w-4" />
            {t.players.length} / {t.maxPlayers} {ro.tournaments.players.toLowerCase()}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isOrganizer &&
          t.allowGuests &&
          (t.status === 'REGISTRATION' || t.status === 'DRAFT') &&
          t.players.length < t.maxPlayers && (
            <div className="rounded-md border border-border bg-muted/30 p-3">
              <div className="grid grid-cols-[1fr_120px_auto] gap-2">
                <input
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder={ro.tournaments.guestName}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                />
                <input
                  type="number"
                  min={1}
                  max={7}
                  step={0.5}
                  value={guestLevel}
                  onChange={(e) => setGuestLevel(e.target.value)}
                  placeholder={ro.tournaments.guestLevel}
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                />
                <Button size="sm" onClick={addGuest} disabled={adding}>
                  <Plus className="mr-1 h-4 w-4" />
                  {ro.tournaments.addGuest}
                </Button>
              </div>
            </div>
          )}

        <div className="space-y-1">
          {t.players.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">{p.displayName}</span>
                {p.userId == null && (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-900">
                    invitat
                  </span>
                )}
              </div>
              {p.displayLevel != null && (
                <span className="text-xs text-muted-foreground">
                  Nivel {p.displayLevel.toFixed(1)}
                </span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ScheduleTab({ t }: { t: TournamentDto }) {
  if (t.rounds.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Programul va fi generat după ce turneul pornește.
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-3">
      {t.rounds.map((r) => (
        <Card key={r.id}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span>Runda {r.roundNumber}</span>
              {r.completedAt && (
                <span className="rounded bg-brand-100 px-2 py-0.5 text-[10px] text-brand-900">
                  finalizată
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {r.matches.map((m) => (
              <div
                key={m.id}
                className={cn(
                  'flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm',
                  m.status === 'VALIDATED' ? 'border-brand-200 bg-brand-50/40' : 'border-border',
                )}
              >
                <span className="font-medium">
                  {m.team1Player1.displayName} + {m.team1Player2.displayName}
                </span>
                <span className="font-mono text-muted-foreground">
                  {m.team1Score ?? '–'} : {m.team2Score ?? '–'}
                </span>
                <span className="font-medium">
                  {m.team2Player1.displayName} + {m.team2Player2.displayName}
                </span>
                {m.courtNumber != null && (
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    Teren {m.courtNumber}
                  </span>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function LeaderboardTab({ t }: { t: TournamentDto }) {
  const ranked = [...t.players].sort(
    (a, b) => b.totalPoints - a.totalPoints || b.totalGamesWon - a.totalGamesWon,
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="h-4 w-4 text-brand-700" />
          {ro.tournaments.leaderboard}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="py-2 pr-2 font-medium">#</th>
              <th className="py-2 pr-2 font-medium">{ro.tournaments.players}</th>
              <th className="py-2 pr-2 text-right font-medium">{ro.tournaments.points}</th>
              <th className="py-2 pr-2 text-right font-medium">{ro.tournaments.gamesWon}</th>
              <th className="py-2 text-right font-medium">{ro.tournaments.gamesLost}</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((p, i) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="py-2 pr-2 font-mono">{i + 1}</td>
                <td className="py-2 pr-2 font-medium">{p.displayName}</td>
                <td className="py-2 pr-2 text-right font-mono tabular-nums">{p.totalPoints}</td>
                <td className="py-2 pr-2 text-right font-mono tabular-nums">{p.totalGamesWon}</td>
                <td className="py-2 text-right font-mono tabular-nums">{p.totalGamesLost}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
