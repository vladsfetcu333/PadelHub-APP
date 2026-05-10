import { useEffect, useMemo, useState } from 'react';
import {
  Line,
  Area,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import { ro, type MatchDto, type MatchListResponse, type SelfUserDto } from '@padel/shared';

import { api, extractErrorMessage } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/**
 * Inverse-of-LEVEL_TO_RATING_ANCHORS mapping for the display — the same
 * function lives in the backend rating module; we duplicate it here in the
 * frontend so we don't ship the whole rating lib down. Cheap to keep in sync.
 */
const ANCHORS: Array<readonly [number, number]> = [
  [1.0, 1100],
  [2.0, 1250],
  [2.5, 1350],
  [3.0, 1450],
  [3.5, 1500],
  [4.0, 1600],
  [4.5, 1700],
  [5.0, 1800],
  [5.5, 1900],
  [6.0, 2000],
  [6.5, 2100],
  [7.0, 2200],
];

function ratingToLevel(rating: number): number {
  if (rating <= ANCHORS[0]![1]) return ANCHORS[0]![0];
  if (rating >= ANCHORS[ANCHORS.length - 1]![1]) return ANCHORS[ANCHORS.length - 1]![0];
  for (let i = 1; i < ANCHORS.length; i++) {
    const [lv1, r1] = ANCHORS[i - 1]!;
    const [lv2, r2] = ANCHORS[i]!;
    if (rating <= r2) {
      const t = (rating - r1) / (r2 - r1);
      return lv1 + t * (lv2 - lv1);
    }
  }
  return ANCHORS[ANCHORS.length - 1]![0];
}

export function RatingTab({ user }: { user: SelfUserDto }) {
  const [matches, setMatches] = useState<MatchDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get<MatchListResponse>('/api/matches/me', { params: { status: 'VALIDATED', pageSize: 50 } })
      .then((res) => setMatches(res.data.items))
      .catch((err) => toast.error(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const status =
    user.glickoRD > 200
      ? { label: ro.rating.statusProvisional, cls: 'bg-amber-100 text-amber-900' }
      : user.glickoRD < 100
        ? { label: ro.rating.statusStabilized, cls: 'bg-brand-100 text-brand-900' }
        : { label: ro.rating.statusRefining, cls: 'bg-blue-100 text-blue-900' };

  // Build a chart series from match history. Each validated match for this
  // user gives us a (date, after-rating) point. We sort by completedAt asc
  // and prepend the "start of time" point from before the first match.
  const chartData = useMemo(() => {
    const points: Array<{
      date: number; // unix ms for axis sorting
      label: string;
      rating: number;
      band: [number, number]; // [rating - RD, rating + RD]
    }> = [];

    const sorted = [...matches]
      .filter((m) => m.completedAt && m.ratingChanges?.[user.id])
      .sort((a, b) => new Date(a.completedAt!).getTime() - new Date(b.completedAt!).getTime());

    if (sorted.length === 0) return { points: [], hasData: false };

    // Prepend a "before any matches" point using the first change's `before`
    const first = sorted[0]!.ratingChanges![user.id]!;
    const beforeDate = new Date(sorted[0]!.completedAt!).getTime() - 24 * 3600 * 1000;
    points.push({
      date: beforeDate,
      label: 'Start',
      rating: first.before.rating,
      band: [first.before.rating - first.before.rd, first.before.rating + first.before.rd],
    });
    for (const m of sorted) {
      const ch = m.ratingChanges![user.id]!;
      const t = new Date(m.completedAt!).getTime();
      points.push({
        date: t,
        label: new Date(t).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' }),
        rating: ch.after.rating,
        band: [ch.after.rating - ch.after.rd, ch.after.rating + ch.after.rd],
      });
    }
    return { points, hasData: true };
  }, [matches, user.id]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{ro.rating.tabTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {ro.rating.currentLevel}
              </p>
              <p className="text-4xl font-bold text-brand-700">
                {ratingToLevel(user.glickoRating).toFixed(1)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Glicko-2</p>
              <p className="text-xl font-mono">
                {ro.rating.glickoLabel(user.glickoRating, user.glickoRD)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
              <span
                className={cn(
                  'inline-block rounded-full px-2 py-0.5 text-xs font-medium',
                  status.cls,
                )}
              >
                {status.label}
              </span>
              <p className="mt-1 text-[10px] text-muted-foreground">
                σ = {user.glickoVolatility.toFixed(4)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{ro.rating.chartLegend}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">{ro.common.loading}</p>
          ) : !chartData.hasData ? (
            <p className="text-muted-foreground">{ro.rating.noMatches}</p>
          ) : (
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <ComposedChart
                  data={chartData.points}
                  margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" fontSize={11} />
                  <YAxis domain={['dataMin - 50', 'dataMax + 50']} fontSize={11} />
                  <Tooltip
                    formatter={(v: number | string, name: string) =>
                      name === 'band' ? null : Math.round(Number(v))
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Area
                    type="monotone"
                    dataKey="band"
                    fill="#86d0aa"
                    fillOpacity={0.25}
                    stroke="none"
                    name={ro.rating.chartBand}
                  />
                  <Line
                    type="monotone"
                    dataKey="rating"
                    stroke="#166340"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    name="Rating"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{ro.rating.history}</CardTitle>
        </CardHeader>
        <CardContent>
          {!loading && matches.length === 0 ? (
            <p className="text-muted-foreground">{ro.rating.noMatches}</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {matches.slice(0, 10).map((m) => {
                const change = m.ratingChanges?.[user.id];
                if (!change) return null;
                return (
                  <li key={m.id} className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground">
                      {new Date(m.completedAt!).toLocaleDateString('ro-RO', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                    <span className="font-mono">
                      {change.before.rating.toFixed(0)} → {change.after.rating.toFixed(0)}{' '}
                      <span
                        className={cn(
                          'ml-1 font-semibold',
                          change.delta > 0 ? 'text-brand-700' : 'text-red-700',
                        )}
                      >
                        ({change.delta > 0 ? '+' : ''}
                        {change.delta.toFixed(0)})
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
