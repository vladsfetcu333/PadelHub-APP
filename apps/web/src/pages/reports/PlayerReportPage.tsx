import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type { PlayerReportDto } from '@padel/shared';
import { toast } from 'sonner';
import { Download, Loader2 } from 'lucide-react';

import { api, extractErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/store/auth';

const PIE_COLORS = ['#166340', '#4db37e', '#86d0aa', '#bbe5cd', '#dcf2e5'];

export default function PlayerReportPage() {
  const params = useParams();
  const me = useAuth((s) => s.user);
  const targetUserId = params['userId'] ?? me?.id;
  const [report, setReport] = useState<PlayerReportDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const downloadCsv = async () => {
    if (!targetUserId) return;
    setExporting(true);
    try {
      const res = await api.get(`/api/reports/player/${targetUserId}/export.csv`, {
        responseType: 'blob',
      });
      // Parse the server-set filename out of Content-Disposition if present.
      // Fall back to a sane default if the header is missing or the browser
      // strips it (e.g. CORS preflight without expose-headers).
      const cd = (res.headers as Record<string, string | undefined>)['content-disposition'] ?? '';
      const fromHeader = /filename="([^"]+)"/.exec(cd)?.[1];
      const fallback = `padelhub-stats-${report?.user.username ?? 'export'}.csv`;
      const filename = fromHeader ?? fallback;

      const blob = res.data as Blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('CSV exportat cu succes.');
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    if (!targetUserId) return;
    setLoading(true);
    api
      .get<PlayerReportDto>(`/api/reports/player/${targetUserId}`)
      .then((res) => setReport(res.data))
      .catch((err) => toast.error(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [targetUserId]);

  if (loading || !report) {
    return <p className="p-8 text-muted-foreground">Se încarcă raportul…</p>;
  }

  const r = report;
  const byTypeData = Object.entries(r.matches.byMatchType).map(([type, v]) => ({
    type,
    played: v.played,
    won: v.won,
  }));
  const clubsPieData = r.clubs.visited.map((c) => ({
    name: c.club.name,
    value: c.matchCount,
  }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-bold">
          Raport jucător — {r.user.firstName} {r.user.lastName}
        </h1>
        <Button
          variant="outline"
          size="sm"
          onClick={downloadCsv}
          disabled={exporting}
          aria-label="Exportă raportul ca fișier CSV"
        >
          {exporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Download className="mr-2 h-4 w-4" aria-hidden="true" />
          )}
          Exportă CSV
        </Button>
      </div>
      <p className="mb-6 text-sm text-muted-foreground">
        <Link to={`/profile/${r.user.username}`} className="hover:underline">
          @{r.user.username}
        </Link>{' '}
        · Nivel curent {r.rating.currentLevel.toFixed(1)} (rating {r.rating.current})
      </p>

      {/* Top-line KPIs */}
      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="Match-uri" value={r.matches.total} />
        <Kpi label="Ultimele 30 zile" value={r.matches.last30Days} />
        <Kpi label="Win rate" value={`${r.matches.winRate.toFixed(0)}%`} />
        <Kpi label="Win rate 30 zile" value={`${r.matches.winRateLast30Days.toFixed(0)}%`} />
      </div>

      {/* Rating evolution */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Evoluție rating Glicko-2</CardTitle>
        </CardHeader>
        <CardContent style={{ height: 260 }}>
          {r.rating.history.length === 0 ? (
            <p className="text-muted-foreground">Niciun match validat încă.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={r.rating.history.map((p) => ({ ...p, dateStr: p.date.slice(0, 10) }))}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dateStr" fontSize={11} />
                <YAxis domain={['dataMin - 50', 'dataMax + 50']} fontSize={11} />
                <Tooltip formatter={(v: number) => Math.round(v)} />
                <Line
                  type="monotone"
                  dataKey="rating"
                  stroke="#166340"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Match-uri după tip</CardTitle>
          </CardHeader>
          <CardContent style={{ height: 240 }}>
            {byTypeData.length === 0 ? (
              <p className="text-muted-foreground">Nicio dată.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byTypeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="played" fill="#4db37e" name="Jucate" />
                  <Bar dataKey="won" fill="#166340" name="Câștigate" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cluburi vizitate</CardTitle>
          </CardHeader>
          <CardContent style={{ height: 240 }}>
            {clubsPieData.length === 0 ? (
              <p className="text-muted-foreground">Nicio dată.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={clubsPieData}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={80}
                    label={(entry) => entry.name}
                  >
                    {clubsPieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 5 parteneri</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {r.partners.top5.length === 0 ? (
              <p className="text-muted-foreground">Niciun partener încă.</p>
            ) : (
              r.partners.top5.map((p) => (
                <div key={p.partner.id} className="flex items-center justify-between">
                  <Link to={`/profile/${p.partner.username}`} className="hover:underline">
                    {p.partner.firstName} {p.partner.lastName}
                  </Link>
                  <span className="font-mono text-xs text-muted-foreground">
                    {p.matchesPlayed} jocuri · {p.winRate.toFixed(0)}% win
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 5 adversari</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {r.opponents.top5.length === 0 ? (
              <p className="text-muted-foreground">Niciun adversar încă.</p>
            ) : (
              r.opponents.top5.map((p) => (
                <div key={p.opponent.id} className="flex items-center justify-between">
                  <Link to={`/profile/${p.opponent.username}`} className="hover:underline">
                    {p.opponent.firstName} {p.opponent.lastName}
                  </Link>
                  <span className="font-mono text-xs text-muted-foreground">
                    {p.matchesPlayed} jocuri · {p.winRate.toFixed(0)}% win
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Comparație cu platforma</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Kpi
            label="Percentilă activitate (același nivel)"
            value={`${r.comparedToPlatform.yourPercentile.toFixed(0)}%`}
          />
          <Kpi
            label="Match-uri/lună (medie jucători)"
            value={r.comparedToPlatform.avgMatchesPlayedPerMonth.toFixed(1)}
          />
          <Kpi
            label="Win rate referință"
            value={`${r.comparedToPlatform.avgWinRateAtSameLevel.toFixed(0)}%`}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Turnee</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <Kpi label="Participate" value={r.tournaments.participated} />
          <Kpi label="Câștigate" value={r.tournaments.won} />
          <Kpi label="Podium (top 3)" value={r.tournaments.podiumed} />
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-3 text-center">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-brand-700">{value}</p>
    </div>
  );
}
