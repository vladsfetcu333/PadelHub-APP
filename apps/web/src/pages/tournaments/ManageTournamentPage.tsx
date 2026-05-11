import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trophy, Play, Check } from 'lucide-react';
import { ro, type TournamentDto } from '@padel/shared';
import { toast } from 'sonner';

import { api, extractErrorMessage } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/store/auth';
import { cn } from '@/lib/utils';

export default function ManageTournamentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const [t, setT] = useState<TournamentDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data } = await api.get<TournamentDto>(`/api/tournaments/${id}`);
      setT(data);
    } catch (err) {
      toast.error(extractErrorMessage(err));
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

  if (t.organizerId !== user?.id) {
    navigate(`/tournaments/${t.id}`);
    return null;
  }

  const start = async () => {
    setBusy(true);
    try {
      const { data } = await api.post<TournamentDto>(`/api/tournaments/${t.id}/start`);
      setT(data);
      toast.success('Turneu pornit');
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const completeRound = async (roundNumber: number) => {
    setBusy(true);
    try {
      const { data } = await api.post<TournamentDto>(
        `/api/tournaments/${t.id}/rounds/${roundNumber}/complete`,
      );
      setT(data);
      toast.success(`Runda ${roundNumber} finalizată`);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const completeTournament = async () => {
    setBusy(true);
    try {
      const { data } = await api.post<TournamentDto>(`/api/tournaments/${t.id}/complete`);
      setT(data);
      toast.success('Turneu finalizat');
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-bold">
        {ro.tournaments.manage}: {t.name}
      </h1>

      <Card className="mb-6">
        <CardContent className="flex flex-wrap items-center gap-3 pt-6">
          {(t.status === 'DRAFT' || t.status === 'REGISTRATION') && (
            <Button onClick={start} disabled={busy || t.players.length < 4}>
              <Play className="mr-1 h-4 w-4" /> {ro.tournaments.start}
            </Button>
          )}
          {t.status === 'IN_PROGRESS' && (
            <Button onClick={completeTournament} disabled={busy} variant="secondary">
              <Trophy className="mr-1 h-4 w-4" /> {ro.tournaments.complete}
            </Button>
          )}
          <span className="text-sm text-muted-foreground">
            Stare: <strong>{ro.tournaments.status[t.status]}</strong>
            {t.status === 'IN_PROGRESS' && ` · Runda ${t.currentRound}`}
          </span>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {t.rounds.map((r) => (
          <RoundManageCard
            key={r.id}
            tournamentId={t.id}
            round={r}
            isCurrent={t.currentRound === r.roundNumber}
            canComplete={!r.completedAt && t.status === 'IN_PROGRESS'}
            completeRound={completeRound}
            busy={busy}
            onMatchUpdated={(updated) => setT(updated)}
          />
        ))}
      </div>
    </div>
  );
}

function RoundManageCard({
  tournamentId,
  round,
  isCurrent,
  canComplete,
  completeRound,
  busy,
  onMatchUpdated,
}: {
  tournamentId: string;
  round: TournamentDto['rounds'][number];
  isCurrent: boolean;
  canComplete: boolean;
  completeRound: (n: number) => Promise<void>;
  busy: boolean;
  onMatchUpdated: (t: TournamentDto) => void;
}) {
  return (
    <Card className={cn(isCurrent && 'border-brand-300 bg-brand-50/30')}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>
            Runda {round.roundNumber}
            {isCurrent && (
              <span className="ml-2 rounded bg-brand-100 px-2 py-0.5 text-[10px] text-brand-900">
                curentă
              </span>
            )}
          </span>
          {canComplete && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => completeRound(round.roundNumber)}
              disabled={busy}
            >
              <Check className="mr-1 h-4 w-4" /> {ro.tournaments.completeRound}
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {round.matches.map((m) => (
          <ScoreEntryRow
            key={m.id}
            tournamentId={tournamentId}
            match={m}
            onUpdated={onMatchUpdated}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function ScoreEntryRow({
  tournamentId,
  match,
  onUpdated,
}: {
  tournamentId: string;
  match: TournamentDto['rounds'][number]['matches'][number];
  onUpdated: (t: TournamentDto) => void;
}) {
  const [t1, setT1] = useState<string>(match.team1Score?.toString() ?? '');
  const [t2, setT2] = useState<string>(match.team2Score?.toString() ?? '');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      const { data } = await api.post<TournamentDto>(
        `/api/tournaments/${tournamentId}/matches/${match.id}/score`,
        { team1Score: Number(t1), team2Score: Number(t2) },
      );
      onUpdated(data);
      toast.success('Scor salvat');
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-[1fr_auto_auto_auto_1fr_auto] items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
      <span className="text-right font-medium">
        {match.team1Player1.displayName} + {match.team1Player2.displayName}
      </span>
      <Input
        type="number"
        min={0}
        max={99}
        value={t1}
        onChange={(e) => setT1(e.target.value)}
        className="w-14 text-center"
      />
      <span className="text-muted-foreground">–</span>
      <Input
        type="number"
        min={0}
        max={99}
        value={t2}
        onChange={(e) => setT2(e.target.value)}
        className="w-14 text-center"
      />
      <span className="font-medium">
        {match.team2Player1.displayName} + {match.team2Player2.displayName}
      </span>
      <Button size="sm" onClick={submit} disabled={saving || t1 === '' || t2 === ''}>
        Salvează
      </Button>
    </div>
  );
}
