import { useEffect, useState } from 'react';
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type { AdminReportDto } from '@padel/shared';
import { toast } from 'sonner';

import { api, extractErrorMessage } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const PIE_COLORS = ['#166340', '#4db37e', '#86d0aa', '#bbe5cd', '#dcf2e5', '#aaaaaa'];

export default function AdminReportPage() {
  const [report, setReport] = useState<AdminReportDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get<AdminReportDto>('/api/reports/admin')
      .then((res) => setReport(res.data))
      .catch((err) => toast.error(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !report) {
    return <p className="p-8 text-muted-foreground">Se încarcă raportul…</p>;
  }
  const r = report;

  const byTypeData = Object.entries(r.matches.byType).map(([k, v]) => ({ type: k, count: v ?? 0 }));
  const byFormatData = Object.entries(r.tournaments.byFormat).map(([k, v]) => ({
    format: k,
    count: v ?? 0,
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold">Raport administrator</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Perioadă: {new Date(r.period.from).toLocaleDateString('ro-RO')} –{' '}
        {new Date(r.period.to).toLocaleDateString('ro-RO')}
      </p>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
        <Kpi label="Utilizatori total" value={r.users.total} />
        <Kpi label="Activi lunar" value={r.users.activeMonthly} />
        <Kpi label="Activi zilnic" value={r.users.activeDaily} />
        <Kpi label="Match-uri" value={r.matches.total} />
        <Kpi label="Turnee" value={r.tournaments.total} />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Înregistrări noi (zile)</CardTitle>
        </CardHeader>
        <CardContent style={{ height: 220 }}>
          {r.users.newRegistrations.length === 0 ? (
            <p className="text-muted-foreground">Niciun cont nou în perioadă.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={r.users.newRegistrations}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#166340"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuție nivel</CardTitle>
          </CardHeader>
          <CardContent style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={r.users.levelDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="levelBucket" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Bar dataKey="count" fill="#166340" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuție vârstă</CardTitle>
          </CardHeader>
          <CardContent style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={r.users.ageDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="ageBucket" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Bar dataKey="count" fill="#4db37e" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuție gen</CardTitle>
          </CardHeader>
          <CardContent style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={r.users.genderDistribution}
                  dataKey="count"
                  nameKey="gender"
                  outerRadius={80}
                  label
                >
                  {r.users.genderDistribution.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top orașe</CardTitle>
          </CardHeader>
          <CardContent style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={r.users.cityDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" fontSize={11} />
                <YAxis type="category" dataKey="city" fontSize={11} width={100} />
                <Tooltip />
                <Bar dataKey="count" fill="#166340" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Match-uri după tip</CardTitle>
          </CardHeader>
          <CardContent style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byTypeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Bar dataKey="count" fill="#166340" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Turnee după format</CardTitle>
          </CardHeader>
          <CardContent style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byFormatData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="format" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Bar dataKey="count" fill="#4db37e" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Pâlnie de conversie</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <FunnelStep
            label="Înregistrați"
            value={r.conversionFunnel.registered}
            total={r.conversionFunnel.registered}
          />
          <FunnelStep
            label="Profil completat"
            value={r.conversionFunnel.completedProfile}
            total={r.conversionFunnel.registered}
          />
          <FunnelStep
            label="Primul match"
            value={r.conversionFunnel.firstMatchPlayed}
            total={r.conversionFunnel.registered}
          />
          <FunnelStep
            label="Al doilea match"
            value={r.conversionFunnel.secondMatchPlayed}
            total={r.conversionFunnel.registered}
          />
          <FunnelStep
            label="Activi"
            value={r.conversionFunnel.activeUsers}
            total={r.conversionFunnel.registered}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cluburi cele mai active</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {r.matches.byClub.map((c, i) => (
            <div key={c.clubId} className="flex items-center justify-between">
              <span>
                <span className="mr-2 font-mono text-muted-foreground">{i + 1}.</span>
                {c.clubName}
              </span>
              <span className="font-mono text-xs">{c.count} match-uri</span>
            </div>
          ))}
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

function FunnelStep({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total === 0 ? 0 : (value / total) * 100;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="font-mono text-xs text-muted-foreground">
          {value} ({pct.toFixed(0)}%)
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-brand-600" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
