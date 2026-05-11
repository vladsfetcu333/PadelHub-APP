import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';
import type { ClubReportDto } from '@padel/shared';
import { toast } from 'sonner';

import { api, extractErrorMessage } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ClubReportPage() {
  const { clubId } = useParams();
  const [report, setReport] = useState<ClubReportDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clubId) return;
    setLoading(true);
    api
      .get<ClubReportDto>(`/api/reports/club/${clubId}`)
      .then((res) => setReport(res.data))
      .catch((err) => toast.error(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [clubId]);

  if (loading || !report) {
    return <p className="p-8 text-muted-foreground">Se încarcă raportul…</p>;
  }
  const r = report;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold">Raport club — {r.club.name}</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Perioadă: {new Date(r.period.from).toLocaleDateString('ro-RO')} –{' '}
        {new Date(r.period.to).toLocaleDateString('ro-RO')}
      </p>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="Jucători activi (lună)" value={r.activePlayers.monthly} />
        <Kpi label="Jucători noi" value={r.activePlayers.new} />
        <Kpi label="Match-uri" value={r.events.matchesPlayed} />
        <Kpi label="Turnee organizate" value={r.events.tournamentsHeld} />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Utilizare terenuri</CardTitle>
          </CardHeader>
          <CardContent style={{ height: 240 }}>
            {r.courts.utilizationByDay.length === 0 ? (
              <p className="text-muted-foreground">Niciun teren înregistrat.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={r.courts.utilizationByDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="courtName" fontSize={11} />
                  <YAxis fontSize={11} unit="%" />
                  <Tooltip />
                  <Bar dataKey="utilization" fill="#166340" name="Utilizare %" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuție nivel jucători</CardTitle>
          </CardHeader>
          <CardContent style={{ height: 240 }}>
            {r.levelDistribution.length === 0 ? (
              <p className="text-muted-foreground">Nicio dată.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={r.levelDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="levelBucket" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#4db37e" name="Jucători" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Trend săptămânal match-uri</CardTitle>
        </CardHeader>
        <CardContent style={{ height: 220 }}>
          {r.trends.matchesPerWeek.length === 0 ? (
            <p className="text-muted-foreground">Nicio dată în perioadă.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={r.trends.matchesPerWeek}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#166340" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Jucători top (frecvență club)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {r.topLocalPlayers.length === 0 ? (
            <p className="text-muted-foreground">Niciun jucător încă.</p>
          ) : (
            r.topLocalPlayers.map((p, i) => (
              <div key={p.user.id} className="flex items-center justify-between">
                <span>
                  <span className="mr-2 font-mono text-muted-foreground">{i + 1}.</span>
                  {p.user.firstName} {p.user.lastName}
                </span>
                <span className="font-mono text-xs">{p.matchCount} match-uri</span>
              </div>
            ))
          )}
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
