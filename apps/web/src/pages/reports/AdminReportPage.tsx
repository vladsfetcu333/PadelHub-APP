import { useEffect, useMemo, useState } from 'react';
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
import { ArrowDownAZ, ArrowUpAZ, Search } from 'lucide-react';

import { api, extractErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const PIE_COLORS = ['#166340', '#4db37e', '#86d0aa', '#bbe5cd', '#dcf2e5', '#aaaaaa'];

type ClubSortKey = 'count' | 'name';
type CitySortKey = 'count' | 'name';
type PlayerSortKey = 'matchCount' | 'rating' | 'winRate' | 'name';
type SortDir = 'asc' | 'desc';

// Quick presets for the date-range picker.
const DATE_PRESETS: Array<{ label: string; days: number }> = [
  { label: 'Ultimele 7 zile', days: 7 },
  { label: 'Ultimele 30 zile', days: 30 },
  { label: 'Ultimele 90 zile', days: 90 },
];

function isoDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default function AdminReportPage() {
  const [report, setReport] = useState<AdminReportDto | null>(null);
  const [loading, setLoading] = useState(true);

  // Date-range state. Default = 30 days back to today; server applies if
  // empty. We keep them as YYYY-MM-DD strings (matches <input type=date>).
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 3600_000);
  const [from, setFrom] = useState(isoDateOnly(thirtyDaysAgo));
  const [to, setTo] = useState(isoDateOnly(today));

  // Per-section client-side sort/filter state.
  const [clubSort, setClubSort] = useState<ClubSortKey>('count');
  const [clubDir, setClubDir] = useState<SortDir>('desc');
  const [clubQuery, setClubQuery] = useState('');

  const [citySort, setCitySort] = useState<CitySortKey>('count');
  const [cityDir, setCityDir] = useState<SortDir>('desc');

  const [playerSort, setPlayerSort] = useState<PlayerSortKey>('matchCount');
  const [playerDir, setPlayerDir] = useState<SortDir>('desc');
  const [playerQuery, setPlayerQuery] = useState('');

  // Refetch when the date range changes.
  useEffect(() => {
    setLoading(true);
    api
      .get<AdminReportDto>('/api/reports/admin', { params: { from, to } })
      .then((res) => setReport(res.data))
      .catch((err) => toast.error(extractErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [from, to]);

  // Apply preset by re-computing from/to and triggering the effect above.
  const applyPreset = (days: number) => {
    const t = new Date();
    const f = new Date(t.getTime() - days * 24 * 3600_000);
    setFrom(isoDateOnly(f));
    setTo(isoDateOnly(t));
  };

  // Derived (sorted+filtered) views — memoised so Recharts doesn't see
  // a fresh array reference on every render.
  const sortedClubs = useMemo(() => {
    if (!report) return [];
    const q = clubQuery.trim().toLowerCase();
    const filtered = q
      ? report.matches.byClub.filter((c) => c.clubName.toLowerCase().includes(q))
      : report.matches.byClub;
    const sorted = [...filtered].sort((a, b) => {
      if (clubSort === 'name') return a.clubName.localeCompare(b.clubName, 'ro');
      return a.count - b.count;
    });
    return clubDir === 'desc' ? sorted.reverse() : sorted;
  }, [report, clubQuery, clubSort, clubDir]);

  const sortedCities = useMemo(() => {
    if (!report) return [];
    const sorted = [...report.users.cityDistribution].sort((a, b) => {
      if (citySort === 'name') return a.city.localeCompare(b.city, 'ro');
      return a.count - b.count;
    });
    return cityDir === 'desc' ? sorted.reverse() : sorted;
  }, [report, citySort, cityDir]);

  const sortedPlayers = useMemo(() => {
    if (!report) return [];
    const q = playerQuery.trim().toLowerCase();
    const filtered = q
      ? report.topPlayers.filter(
          (p) => p.username.toLowerCase().includes(q) || p.fullName.toLowerCase().includes(q),
        )
      : report.topPlayers;
    const sorted = [...filtered].sort((a, b) => {
      switch (playerSort) {
        case 'name':
          return a.fullName.localeCompare(b.fullName, 'ro');
        case 'rating':
          return a.rating - b.rating;
        case 'winRate':
          return a.winRate - b.winRate;
        case 'matchCount':
        default:
          return a.matchCount - b.matchCount;
      }
    });
    return playerDir === 'desc' ? sorted.reverse() : sorted;
  }, [report, playerQuery, playerSort, playerDir]);

  if (loading && !report) {
    return <p className="p-8 text-muted-foreground">Se încarcă raportul…</p>;
  }
  if (!report) return null;
  const r = report;

  const byTypeData = Object.entries(r.matches.byType).map(([k, v]) => ({ type: k, count: v ?? 0 }));
  const byFormatData = Object.entries(r.tournaments.byFormat).map(([k, v]) => ({
    format: k,
    count: v ?? 0,
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-bold">Raport administrator</h1>
        {loading && <span className="text-xs text-muted-foreground">Se actualizează…</span>}
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Perioadă: {new Date(r.period.from).toLocaleDateString('ro-RO')} –{' '}
        {new Date(r.period.to).toLocaleDateString('ro-RO')}
      </p>

      {/* Date-range picker — applies to both new-registrations time series
         and all match/tournament aggregations server-side. */}
      <Card className="mb-6">
        <CardContent className="flex flex-wrap items-end gap-3 py-4">
          <div className="flex flex-col">
            <label htmlFor="from" className="mb-1 text-xs font-medium text-muted-foreground">
              De la
            </label>
            <Input
              id="from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="to" className="mb-1 text-xs font-medium text-muted-foreground">
              Până la
            </label>
            <Input
              id="to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="flex gap-2">
            {DATE_PRESETS.map((p) => (
              <Button
                key={p.days}
                variant="outline"
                size="sm"
                onClick={() => applyPreset(p.days)}
                type="button"
              >
                {p.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

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
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Top orașe</CardTitle>
            <SortControls
              sort={citySort}
              dir={cityDir}
              onSortChange={(v) => setCitySort(v as CitySortKey)}
              onToggleDir={() => setCityDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
              options={[
                { value: 'count', label: 'Utilizatori' },
                { value: 'name', label: 'Alfabetic' },
              ]}
            />
          </CardHeader>
          <CardContent style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sortedCities} layout="vertical">
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

      {/* Top clubs — sortable + searchable */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Cluburi cele mai active</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                placeholder="Caută club…"
                value={clubQuery}
                onChange={(e) => setClubQuery(e.target.value)}
                className="h-8 w-44 pl-7 text-xs"
              />
            </div>
            <SortControls
              sort={clubSort}
              dir={clubDir}
              onSortChange={(v) => setClubSort(v as ClubSortKey)}
              onToggleDir={() => setClubDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
              options={[
                { value: 'count', label: 'Număr meciuri' },
                { value: 'name', label: 'Alfabetic' },
              ]}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {sortedClubs.length === 0 ? (
            <p className="text-muted-foreground">Niciun club potrivit filtrelor.</p>
          ) : (
            sortedClubs.map((c, i) => (
              <div key={c.clubId} className="flex items-center justify-between">
                <span>
                  <span className="mr-2 font-mono text-muted-foreground">{i + 1}.</span>
                  {c.clubName}
                </span>
                <span className="font-mono text-xs">{c.count} match-uri</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Top players — sortable + searchable */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Cei mai activi jucători</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                placeholder="Caută jucător…"
                value={playerQuery}
                onChange={(e) => setPlayerQuery(e.target.value)}
                className="h-8 w-44 pl-7 text-xs"
              />
            </div>
            <SortControls
              sort={playerSort}
              dir={playerDir}
              onSortChange={(v) => setPlayerSort(v as PlayerSortKey)}
              onToggleDir={() => setPlayerDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
              options={[
                { value: 'matchCount', label: 'Meciuri' },
                { value: 'rating', label: 'Rating Glicko' },
                { value: 'winRate', label: 'Win rate' },
                { value: 'name', label: 'Alfabetic' },
              ]}
            />
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {sortedPlayers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Niciun jucător potrivit filtrelor.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-1 pr-2 text-left">#</th>
                  <th className="py-1 pr-2 text-left">Jucător</th>
                  <th className="py-1 pr-2 text-right">Meciuri</th>
                  <th className="py-1 pr-2 text-right">Rating</th>
                  <th className="py-1 pr-2 text-right">Win rate</th>
                </tr>
              </thead>
              <tbody>
                {sortedPlayers.map((p, i) => (
                  <tr key={p.userId} className="border-b border-border/40 last:border-b-0">
                    <td className="py-1.5 pr-2 font-mono text-xs text-muted-foreground">{i + 1}</td>
                    <td className="py-1.5 pr-2">
                      <div className="font-medium">{p.fullName}</div>
                      <div className="text-xs text-muted-foreground">@{p.username}</div>
                    </td>
                    <td className="py-1.5 pr-2 text-right font-mono">{p.matchCount}</td>
                    <td className="py-1.5 pr-2 text-right font-mono">{p.rating}</td>
                    <td className="py-1.5 pr-2 text-right font-mono">{p.winRate.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface SortControlsProps {
  sort: string;
  dir: SortDir;
  onSortChange: (value: string) => void;
  onToggleDir: () => void;
  options: ReadonlyArray<{ value: string; label: string }>;
}

/** Compact toolbar: sort-by dropdown + asc/desc toggle. */
function SortControls({ sort, dir, onSortChange, onToggleDir, options }: SortControlsProps) {
  return (
    <div className="flex items-center gap-1">
      <Select value={sort} onValueChange={onSortChange}>
        <SelectTrigger className="h-8 w-36 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value} className="text-xs">
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        size="sm"
        className="h-8 w-8 p-0"
        onClick={onToggleDir}
        aria-label={dir === 'asc' ? 'Ordonare crescătoare' : 'Ordonare descrescătoare'}
        title={dir === 'asc' ? 'Crescător' : 'Descrescător'}
      >
        {dir === 'asc' ? (
          <ArrowUpAZ className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <ArrowDownAZ className="h-3.5 w-3.5" aria-hidden="true" />
        )}
      </Button>
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
