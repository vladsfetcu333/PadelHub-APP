import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ro, type PublicUserDto } from '@padel/shared';
import { toast } from 'sonner';
import { Sparkles, Users, AlertTriangle } from 'lucide-react';

import { api, extractErrorMessage } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { PadelLevelBadge } from '@/components/padel/PadelLevelBadge';
import { PreferredSideIndicator } from '@/components/padel/PreferredSideIndicator';
import { CompatibilityBreakdownBars } from '@/components/matching/CompatibilityBreakdownBars';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

interface PartnerResult {
  player: PublicUserDto;
  score: number;
  breakdown: {
    level: number;
    side: number;
    availability: number;
    clubs: number;
    objectives: number;
    history: number;
  };
  effectiveLevel: number;
  softPenalties: string[];
}

interface FullMatchResult {
  formation: {
    team1: [PublicUserDto, PublicUserDto];
    team2: [PublicUserDto, PublicUserDto];
  };
  matchQuality: number;
  avgCompatibility: number;
  teamBalance: number;
}

export default function MatchingPage() {
  const [params, setParams] = useSearchParams();
  const mode = params.get('mode') === 'full' ? 'full' : 'partner';

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">
        {mode === 'full' ? ro.matching.fullMatchTitle : ro.matching.title}
      </h1>

      <Tabs
        value={mode}
        onValueChange={(v) => {
          const next = new URLSearchParams(params);
          if (v === 'full') next.set('mode', 'full');
          else next.delete('mode');
          setParams(next, { replace: true });
        }}
      >
        <TabsList>
          <TabsTrigger value="partner">{ro.matching.modePartner}</TabsTrigger>
          <TabsTrigger value="full">{ro.matching.modeFullMatch}</TabsTrigger>
        </TabsList>
        <TabsContent value="partner">
          <PartnersTab />
        </TabsContent>
        <TabsContent value="full">
          <FullMatchTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PartnersTab() {
  const [data, setData] = useState<PartnerResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [minScore, setMinScore] = useState(30);
  const [cityOnly, setCityOnly] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number | boolean> = { minScore, limit: 20 };
      if (cityOnly) params['cityOnly'] = true;
      const { data } = await api.get<PartnerResult[]>('/api/matching/partners', { params });
      setData(data);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minScore, cityOnly]);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 pt-6">
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">{ro.matching.filterMinScore}</span>
            <input
              type="range"
              min="0"
              max="100"
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="block w-48"
            />
            <span className="text-xs font-mono">{minScore}</span>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={cityOnly}
              onChange={(e) => setCityOnly(e.target.checked)}
              className="h-4 w-4 rounded border-input text-brand-700"
            />
            {ro.matching.filterCity}
          </label>
          <Button variant="outline" onClick={load} size="sm">
            <Sparkles className="mr-1 h-4 w-4" />
            {ro.matching.refresh}
          </Button>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-muted-foreground">{ro.common.loading}</p>
      ) : data.length === 0 ? (
        <p className="text-muted-foreground">{ro.matching.noResults}</p>
      ) : (
        <div className="space-y-3">
          {data.map((r) => (
            <PartnerCard key={r.player.id} result={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function PartnerCard({ result }: { result: PartnerResult }) {
  const { player } = result;
  const initials = `${player.firstName[0] ?? ''}${player.lastName[0] ?? ''}`.toUpperCase();

  return (
    <Card>
      <CardContent className="grid grid-cols-1 gap-4 pt-6 md:grid-cols-[1fr_2fr_auto]">
        <Link
          to={`/profile/${player.username}`}
          className="flex items-center gap-3 hover:opacity-80"
        >
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-brand-950 text-white">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold leading-tight">
              {player.firstName} {player.lastName}
            </p>
            <p className="text-xs text-muted-foreground">
              @{player.username} · {player.city}
            </p>
            <div className="mt-1 flex flex-wrap gap-1">
              <PadelLevelBadge level={player.padelLevel} />
              <PreferredSideIndicator side={player.preferredSide} showLabel={false} />
            </div>
          </div>
        </Link>

        <div className="space-y-2">
          <CompatibilityBreakdownBars breakdown={result.breakdown} />
          {result.softPenalties.length > 0 && (
            <p className="flex items-start gap-1 text-xs text-amber-600">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              <span>{result.softPenalties.join('; ')}</span>
            </p>
          )}
        </div>

        <div className="flex flex-col items-end justify-center gap-1">
          <span className="text-2xl font-bold text-brand-700">{result.score.toFixed(0)}</span>
          <span className="text-xs text-muted-foreground">{ro.matching.score}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function FullMatchTab() {
  const [data, setData] = useState<FullMatchResult[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<FullMatchResult[]>('/api/matching/full-match', {
        params: { numSuggestions: 5, topPartnersLimit: 20 },
      });
      setData(data);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={load}>
          <Sparkles className="mr-1 h-4 w-4" />
          {ro.matching.refresh}
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">{ro.common.loading}</p>
      ) : data.length === 0 ? (
        <p className="text-muted-foreground">{ro.matching.noResults}</p>
      ) : (
        data.map((suggestion, i) => <FormationCard key={i} suggestion={suggestion} />)
      )}
    </div>
  );
}

function FormationCard({ suggestion }: { suggestion: FullMatchResult }) {
  const { team1, team2 } = suggestion.formation;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            {ro.matching.quality}:{' '}
            <span className="text-brand-700">{suggestion.matchQuality.toFixed(0)}</span>
          </span>
          <span className="flex gap-4 text-xs font-normal text-muted-foreground">
            <span>
              {ro.matching.avgCompatibility}: {suggestion.avgCompatibility.toFixed(0)}
            </span>
            <span>
              {ro.matching.teamBalance}: {suggestion.teamBalance.toFixed(0)}
            </span>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <TeamPanel label={ro.matching.formationTeam1} players={team1} />
          <TeamPanel label={ro.matching.formationTeam2} players={team2} />
        </div>
      </CardContent>
    </Card>
  );
}

function TeamPanel({ label, players }: { label: string; players: [PublicUserDto, PublicUserDto] }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="space-y-2">
        {players.map((p) => (
          <Link
            key={p.id}
            to={`/profile/${p.username}`}
            className="flex items-center gap-2 hover:opacity-80"
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-brand-950 text-[11px] text-white">
                {`${p.firstName[0] ?? ''}${p.lastName[0] ?? ''}`.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm font-medium leading-tight">
                {p.firstName} {p.lastName}
              </p>
              <div className="mt-0.5 flex gap-1">
                <PadelLevelBadge level={p.padelLevel} className="text-[10px]" />
                <PreferredSideIndicator side={p.preferredSide} showLabel={false} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
