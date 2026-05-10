import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ro, type MatchDto, type SetScore } from '@padel/shared';
import { Calendar, MapPin, Trophy, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

import { api, extractErrorMessage } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/store/auth';
import { cn } from '@/lib/utils';

export default function MatchDetailPage() {
  const { id } = useParams();
  const user = useAuth((s) => s.user);
  const [match, setMatch] = useState<MatchDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data } = await api.get<MatchDto>(`/api/matches/${id}`);
      setMatch(data);
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

  const confirm = async () => {
    setPending(true);
    try {
      const { data } = await api.post<MatchDto>(`/api/matches/${id}/confirm`);
      setMatch(data);
      if (data.status === 'VALIDATED') toast.success(ro.matches.ratingsUpdated);
      else toast.success(ro.matches.scoreConfirmed);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setPending(false);
    }
  };

  if (loading) return <p className="p-8 text-muted-foreground">{ro.common.loading}</p>;
  if (!match) return <p className="p-8 text-muted-foreground">{ro.errors.notFound}</p>;

  const myPos = posOf(match, user?.id ?? '');
  const iConfirmed = myPos
    ? (myPos === 'T1P1' && match.confirmedT1P1) ||
      (myPos === 'T1P2' && match.confirmedT1P2) ||
      (myPos === 'T2P1' && match.confirmedT2P1) ||
      (myPos === 'T2P2' && match.confirmedT2P2)
    : false;

  const dateStr = new Date(match.scheduledAt).toLocaleString('ro-RO', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Match</span>
            <StatusBadge match={match} />
          </CardTitle>
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" /> {dateStr}
          </p>
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" /> {match.club.name}
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <TeamPanel
              label={ro.matches.team1}
              p1={match.team1Player1}
              p2={match.team1Player2}
              isWinner={match.winnerTeam === 1}
            />
            <TeamPanel
              label={ro.matches.team2}
              p1={match.team2Player1}
              p2={match.team2Player2}
              isWinner={match.winnerTeam === 2}
            />
          </div>

          {match.scoreSets && (
            <Card className="bg-muted/30">
              <CardContent className="pt-6">
                <p className="mb-2 text-sm font-semibold">{ro.matches.score}</p>
                <div className="space-y-1 text-sm">
                  {match.scoreSets.map((s, i) => (
                    <div key={i} className="flex items-center gap-3 font-mono tabular-nums">
                      <span className="w-16 text-xs text-muted-foreground">
                        {ro.matches.setLabel(i)}
                      </span>
                      <span>
                        {s.team1Games} – {s.team2Games}
                      </span>
                      {s.team1TiebreakPoints != null && (
                        <span className="text-xs text-muted-foreground">
                          ({s.team1TiebreakPoints}–{s.team2TiebreakPoints})
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {myPos && match.status === 'SCHEDULED' && (
            <ScoreEntryForm matchId={match.id} onSaved={setMatch} />
          )}

          {myPos && match.status === 'PENDING_CONFIRMATION' && !iConfirmed && (
            <div className="flex flex-wrap gap-2 rounded-md border border-amber-300 bg-amber-50 p-4">
              <p className="w-full text-sm">{ro.matches.awaitingFromYou}.</p>
              <Button onClick={confirm} disabled={pending}>
                {ro.matches.confirmScore}
              </Button>
              <DisputeButton matchId={match.id} onUpdated={setMatch} />
            </div>
          )}

          {match.status === 'PENDING_CONFIRMATION' && (
            <p className="text-xs text-muted-foreground">
              {ro.matches.enteredBy}:{' '}
              {[
                match.team1Player1,
                match.team1Player2,
                match.team2Player1,
                match.team2Player2,
              ].find((u) => u.id === match.scoreEnteredBy)?.username ?? '—'}
            </p>
          )}

          {match.ratingChanges && match.status === 'VALIDATED' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{ro.matches.ratingChange}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                {Object.entries(match.ratingChanges).map(([uid, change]) => {
                  const u = [
                    match.team1Player1,
                    match.team1Player2,
                    match.team2Player1,
                    match.team2Player2,
                  ].find((x) => x.id === uid);
                  return (
                    <div key={uid} className="flex items-center justify-between font-mono">
                      <span>
                        {u?.firstName} {u?.lastName}
                      </span>
                      <span>
                        {change.before.rating.toFixed(0)} → {change.after.rating.toFixed(0)}{' '}
                        <span className={cn(change.delta > 0 ? 'text-brand-700' : 'text-red-700')}>
                          ({change.delta > 0 ? '+' : ''}
                          {change.delta.toFixed(0)})
                        </span>
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {match.isDisputed && (
            <Card className="border-red-300 bg-red-50">
              <CardContent className="pt-6 text-sm">
                <p className="flex items-center gap-2 font-medium text-red-900">
                  <AlertTriangle className="h-4 w-4" /> {ro.matches.disputed}
                </p>
                <p className="mt-1 text-red-800">{match.disputeReason}</p>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ match }: { match: MatchDto }) {
  const map: Record<MatchDto['status'], { label: string; cls: string }> = {
    SCHEDULED: { label: ro.matches.scheduled, cls: 'bg-muted text-foreground' },
    IN_PROGRESS: { label: 'În desfășurare', cls: 'bg-blue-100 text-blue-900' },
    PENDING_CONFIRMATION: { label: ro.matches.pending, cls: 'bg-amber-100 text-amber-900' },
    VALIDATED: { label: ro.matches.validated, cls: 'bg-brand-100 text-brand-900' },
    EXPIRED: { label: ro.matches.expired, cls: 'bg-muted text-muted-foreground' },
    CANCELLED: { label: ro.matches.cancelled, cls: 'bg-muted text-muted-foreground' },
  };
  const meta = map[match.status];
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', meta.cls)}>
      {meta.label}
    </span>
  );
}

function TeamPanel({
  label,
  p1,
  p2,
  isWinner,
}: {
  label: string;
  p1: MatchDto['team1Player1'];
  p2: MatchDto['team1Player2'];
  isWinner: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-md border p-3',
        isWinner ? 'border-brand-300 bg-brand-50' : 'border-border',
      )}
    >
      <p className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
        {isWinner && <Trophy className="h-3.5 w-3.5 text-brand-700" />}
      </p>
      {[p1, p2].map((p) => (
        <div key={p.id} className="flex items-center gap-2 py-1">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-brand-950 text-[11px] text-white">
              {`${p.firstName[0] ?? ''}${p.lastName[0] ?? ''}`.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">
            {p.firstName} {p.lastName}
          </span>
        </div>
      ))}
    </div>
  );
}

function ScoreEntryForm({ matchId, onSaved }: { matchId: string; onSaved: (m: MatchDto) => void }) {
  const [sets, setSets] = useState<SetScore[]>([
    { team1Games: 6, team2Games: 4 },
    { team1Games: 6, team2Games: 4 },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const setField = (i: number, field: keyof SetScore, val: number) => {
    setSets((s) => {
      const next = [...s];
      next[i] = { ...next[i]!, [field]: val };
      return next;
    });
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const { data } = await api.post<MatchDto>(`/api/matches/${matchId}/score`, { sets });
      onSaved(data);
      toast.success(ro.matches.scoreSaved);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{ro.matches.enterScore}</CardTitle>
        <p className="text-xs text-muted-foreground">{ro.matches.setsHelpText}</p>
      </CardHeader>
      <CardContent className="space-y-2">
        {sets.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-16 text-xs text-muted-foreground">{ro.matches.setLabel(i)}</span>
            <Input
              type="number"
              min={0}
              max={7}
              value={s.team1Games}
              onChange={(e) => setField(i, 'team1Games', Number(e.target.value))}
              className="w-16"
            />
            <span className="text-muted-foreground">–</span>
            <Input
              type="number"
              min={0}
              max={7}
              value={s.team2Games}
              onChange={(e) => setField(i, 'team2Games', Number(e.target.value))}
              className="w-16"
            />
          </div>
        ))}
        <div className="flex gap-2 pt-2">
          {sets.length < 3 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSets((s) => [...s, { team1Games: 6, team2Games: 4 }])}
            >
              + Set
            </Button>
          )}
          {sets.length > 2 && (
            <Button size="sm" variant="ghost" onClick={() => setSets((s) => s.slice(0, -1))}>
              − Set
            </Button>
          )}
          <Button onClick={submit} disabled={submitting}>
            {submitting ? ro.common.loading : ro.matches.enterScore}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DisputeButton({
  matchId,
  onUpdated,
}: {
  matchId: string;
  onUpdated: (m: MatchDto) => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState('');

  const submit = async () => {
    try {
      const { data } = await api.post<MatchDto>(`/api/matches/${matchId}/dispute`, { reason });
      onUpdated(data);
      toast.success(ro.matches.disputed);
      setShowForm(false);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  if (!showForm) {
    return (
      <Button variant="outline" onClick={() => setShowForm(true)}>
        {ro.matches.dispute}
      </Button>
    );
  }
  return (
    <div className="w-full space-y-2">
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={ro.matches.disputeReasonPlaceholder}
        className="min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      />
      <div className="flex gap-2">
        <Button onClick={submit} disabled={reason.length < 5}>
          {ro.matches.dispute}
        </Button>
        <Button variant="ghost" onClick={() => setShowForm(false)}>
          {ro.common.cancel}
        </Button>
      </div>
    </div>
  );
}

function posOf(match: MatchDto, userId: string): 'T1P1' | 'T1P2' | 'T2P1' | 'T2P2' | null {
  if (match.team1Player1.id === userId) return 'T1P1';
  if (match.team1Player2.id === userId) return 'T1P2';
  if (match.team2Player1.id === userId) return 'T2P1';
  if (match.team2Player2.id === userId) return 'T2P2';
  return null;
}
