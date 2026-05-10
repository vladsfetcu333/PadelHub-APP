import { Link } from 'react-router-dom';
import type { MatchDto } from '@padel/shared';
import { ro } from '@padel/shared';
import { Calendar, Trophy, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Props {
  match: MatchDto;
  currentUserId: string;
}

const STATUS_LABEL = (status: MatchDto['status']): string =>
  status === 'SCHEDULED'
    ? ro.matches.scheduled
    : status === 'PENDING_CONFIRMATION'
      ? ro.matches.pending
      : status === 'VALIDATED'
        ? ro.matches.validated
        : status === 'EXPIRED'
          ? ro.matches.expired
          : status === 'CANCELLED'
            ? ro.matches.cancelled
            : status;

export function MatchListItem({ match, currentUserId }: Props) {
  const date = new Date(match.scheduledAt).toLocaleString('ro-RO', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  const team = teamOf(match, currentUserId);

  // For PENDING_CONFIRMATION, surface whether this user still needs to confirm
  const needsMyConfirm =
    match.status === 'PENDING_CONFIRMATION' &&
    ((team === 'T1P1' && !match.confirmedT1P1) ||
      (team === 'T1P2' && !match.confirmedT1P2) ||
      (team === 'T2P1' && !match.confirmedT2P1) ||
      (team === 'T2P2' && !match.confirmedT2P2));

  const myTeam = team === 'T1P1' || team === 'T1P2' ? 1 : 2;
  const won = match.winnerTeam === myTeam;

  return (
    <Link to={`/matches/${match.id}`} className="block">
      <Card
        className={cn('transition-shadow hover:shadow-md', needsMyConfirm && 'border-amber-300')}
      >
        <CardContent className="grid grid-cols-1 gap-3 pt-6 md:grid-cols-[2fr_1fr_auto]">
          <div>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" /> {date} · {match.club.name}
            </p>
            <p className="mt-1 text-sm font-medium">
              {match.team1Player1.firstName} & {match.team1Player2.firstName}{' '}
              <span className="text-muted-foreground">vs</span> {match.team2Player1.firstName} &{' '}
              {match.team2Player2.firstName}
            </p>
          </div>

          <div className="flex flex-col items-start gap-1">
            {match.scoreSets && (
              <p className="font-mono text-sm tabular-nums">
                {match.scoreSets.map((s) => `${s.team1Games}-${s.team2Games}`).join(', ')}
              </p>
            )}
            {match.status === 'VALIDATED' && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 text-xs',
                  won ? 'text-brand-700' : 'text-muted-foreground',
                )}
              >
                <Trophy className="h-3 w-3" /> {won ? 'Câștigat' : 'Pierdut'}
              </span>
            )}
          </div>

          <div className="flex flex-col items-end gap-1">
            <StatusBadge status={match.status} />
            {needsMyConfirm && (
              <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-900">
                <AlertCircle className="h-3 w-3" /> {ro.matches.awaitingFromYou}
              </span>
            )}
            {match.isDisputed && (
              <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-900">
                {ro.matches.disputed}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function StatusBadge({ status }: { status: MatchDto['status'] }) {
  const cls =
    status === 'VALIDATED'
      ? 'bg-brand-100 text-brand-900'
      : status === 'PENDING_CONFIRMATION'
        ? 'bg-amber-100 text-amber-900'
        : status === 'EXPIRED'
          ? 'bg-muted text-muted-foreground'
          : 'bg-muted text-foreground';
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', cls)}>
      {STATUS_LABEL(status)}
    </span>
  );
}

function teamOf(match: MatchDto, userId: string): 'T1P1' | 'T1P2' | 'T2P1' | 'T2P2' | null {
  if (match.team1Player1.id === userId) return 'T1P1';
  if (match.team1Player2.id === userId) return 'T1P2';
  if (match.team2Player1.id === userId) return 'T2P1';
  if (match.team2Player2.id === userId) return 'T2P2';
  return null;
}
