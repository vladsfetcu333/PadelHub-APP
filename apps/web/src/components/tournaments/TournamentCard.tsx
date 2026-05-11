import { Link } from 'react-router-dom';
import { Calendar, MapPin, Users, Trophy } from 'lucide-react';
import type { TournamentDto } from '@padel/shared';
import { ro } from '@padel/shared';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const STATUS_CLS: Record<TournamentDto['status'], string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  REGISTRATION: 'bg-brand-100 text-brand-900',
  IN_PROGRESS: 'bg-blue-100 text-blue-900',
  COMPLETED: 'bg-amber-100 text-amber-900',
  CANCELLED: 'bg-red-100 text-red-900',
};

export function TournamentCard({ tournament }: { tournament: TournamentDto }) {
  const t = tournament;
  const date = new Date(t.startDate).toLocaleDateString('ro-RO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  return (
    <Link to={`/tournaments/${t.id}`} className="block">
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardContent className="space-y-3 pt-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold leading-tight">{t.name}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {t.club.name} · {t.club.city}
              </p>
            </div>
            <span
              className={cn('rounded-full px-2 py-0.5 text-xs font-medium', STATUS_CLS[t.status])}
            >
              {ro.tournaments.status[t.status]}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Trophy className="h-3.5 w-3.5" />
              {ro.tournaments.formatNames[t.format]}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> {date}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {t.players.length} / {t.maxPlayers}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
