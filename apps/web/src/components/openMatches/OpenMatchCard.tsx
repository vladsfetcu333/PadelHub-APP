import { Link } from 'react-router-dom';
import { Calendar, MapPin, Users } from 'lucide-react';
import { ro, type OpenMatchDto } from '@padel/shared';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<OpenMatchDto['status'], { label: string; cls: string }> = {
  OPEN: { label: ro.openMatches.open, cls: 'bg-brand-100 text-brand-900' },
  FULL: { label: ro.openMatches.full, cls: 'bg-amber-100 text-amber-900' },
  CANCELLED: { label: ro.openMatches.cancelled, cls: 'bg-red-100 text-red-900' },
  COMPLETED: { label: ro.openMatches.completed, cls: 'bg-muted text-muted-foreground' },
};

export function OpenMatchCard({ post }: { post: OpenMatchDto }) {
  const slots = 4 - post.participants.length;
  const date = new Date(post.scheduledAt);
  const dateStr = date.toLocaleString('ro-RO', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  const meta = STATUS_STYLES[post.status];

  return (
    <Link to={`/open-matches/${post.id}`} className="block">
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardContent className="space-y-3 pt-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold leading-tight">{post.club.name}</p>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {post.club.city}
              </p>
            </div>
            <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', meta.cls)}>
              {meta.label}
            </span>
          </div>

          <p className="flex items-center gap-1 text-sm">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
            {dateStr} · {post.durationMinutes}m
          </p>

          <p className="flex items-center gap-1 text-sm">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            {post.participants.length} / 4{' '}
            {post.status === 'OPEN' && slots > 0 && (
              <span className="ml-1 text-xs text-brand-700">
                · {ro.openMatches.slotsRemaining(slots)}
              </span>
            )}
          </p>

          {(post.levelMin != null || post.levelMax != null) && (
            <p className="text-xs text-muted-foreground">
              {ro.openMatches.levelRange}: {post.levelMin?.toFixed(1) ?? '—'} –{' '}
              {post.levelMax?.toFixed(1) ?? '—'}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
