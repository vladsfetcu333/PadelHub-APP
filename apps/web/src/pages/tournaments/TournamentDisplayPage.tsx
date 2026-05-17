import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { TournamentDisplayDto } from '@padel/shared';
import { api } from '@/lib/api';

/**
 * TV mode — full-screen display for clubs to project on a TV during a
 * tournament. Bold, high contrast, readable from across the room.
 *
 * Polls /api/tournaments/:id/display every 5 seconds. No chrome — no
 * header, no nav, just the data.
 */
export default function TournamentDisplayPage() {
  const { id } = useParams();
  const [data, setData] = useState<TournamentDisplayDto | null>(null);
  const [time, setTime] = useState(new Date());
  const [view, setView] = useState<'matches' | 'leaderboard'>('matches');

  useEffect(() => {
    if (!id) return;
    const load = () => {
      api
        .get<TournamentDisplayDto>(`/api/tournaments/${id}/display`)
        .then((res) => setData(res.data))
        .catch(() => {
          /* ignore transient errors */
        });
    };
    load();
    const poll = setInterval(load, 5000);
    return () => clearInterval(poll);
  }, [id]);

  useEffect(() => {
    const tick = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(tick);
  }, []);

  // Auto-rotate between matches and leaderboard every 15s
  useEffect(() => {
    const flip = setInterval(
      () => setView((v) => (v === 'matches' ? 'leaderboard' : 'matches')),
      15000,
    );
    return () => clearInterval(flip);
  }, []);

  if (!data) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-brand-950 text-white">
        <p className="text-4xl font-bold">Se încarcă…</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-gradient-to-br from-brand-950 to-brand-700 text-white">
      {/* Header */}
      <div className="flex items-baseline justify-between border-b border-white/10 px-12 py-6">
        <h1 className="text-5xl font-black tracking-tight">{data.tournament.name}</h1>
        <div className="text-right">
          <p className="text-2xl font-semibold">Runda {data.tournament.currentRound}</p>
          <p className="font-mono text-3xl">
            {time.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden px-12 py-8">
        {view === 'matches' ? <MatchesView data={data} /> : <LeaderboardView data={data} />}
      </div>

      {/* Footer */}
      <div className="border-t border-white/10 px-12 py-3 text-center text-sm text-white/70">
        PadelHub · Mod TV · se actualizează automat
      </div>
    </div>
  );
}

function MatchesView({ data }: { data: TournamentDisplayDto }) {
  return (
    <div className="grid h-full grid-cols-1 gap-6 md:grid-cols-2">
      <div>
        <h2 className="mb-4 text-3xl font-bold text-brand-200">Meciuri în desfășurare</h2>
        <div className="space-y-4">
          {data.currentRoundMatches.map((m) => (
            <div
              key={m.id}
              className="rounded-xl border-2 border-white/20 bg-white/10 p-6 backdrop-blur"
            >
              <p className="mb-2 text-sm font-medium text-brand-200">
                Teren {m.courtNumber ?? '?'}
              </p>
              <div className="flex items-center justify-between text-2xl font-bold">
                <span>
                  {m.team1Player1.displayName.split(' ')[0]} &amp;{' '}
                  {m.team1Player2.displayName.split(' ')[0]}
                </span>
                <span className="font-mono text-4xl text-brand-200">
                  {m.team1Score ?? '–'} : {m.team2Score ?? '–'}
                </span>
                <span>
                  {m.team2Player1.displayName.split(' ')[0]} &amp;{' '}
                  {m.team2Player2.displayName.split(' ')[0]}
                </span>
              </div>
            </div>
          ))}
          {data.currentRoundMatches.length === 0 && (
            <p className="text-white/60">Niciun meci în desfășurare.</p>
          )}
        </div>
      </div>

      {data.nextRoundPreview && (
        <div>
          <h2 className="mb-4 text-3xl font-bold text-brand-200">Runda următoare</h2>
          <div className="space-y-3">
            {data.nextRoundPreview.map((m) => (
              <div key={m.id} className="rounded-lg border border-white/10 bg-white/5 p-4 text-lg">
                <span className="font-semibold">
                  {m.team1Player1.displayName.split(' ')[0]} &amp;{' '}
                  {m.team1Player2.displayName.split(' ')[0]}
                </span>
                <span className="mx-3 text-brand-200">vs</span>
                <span className="font-semibold">
                  {m.team2Player1.displayName.split(' ')[0]} &amp;{' '}
                  {m.team2Player2.displayName.split(' ')[0]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LeaderboardView({ data }: { data: TournamentDisplayDto }) {
  return (
    <div className="mx-auto h-full max-w-3xl">
      <h2 className="mb-6 text-center text-4xl font-black text-brand-200">🏆 Clasament Top 10</h2>
      <div className="space-y-2">
        {data.leaderboardTop10.map((entry) => (
          <div
            key={entry.player.id}
            className="grid grid-cols-[60px_1fr_120px_100px] items-center gap-4 rounded-lg border border-white/10 bg-white/5 px-6 py-3 text-2xl"
          >
            <span className="font-mono text-3xl font-bold text-brand-200">{entry.rank}</span>
            <span className="font-semibold">{entry.player.displayName}</span>
            <span className="text-right font-mono text-3xl font-bold">
              {entry.player.totalPoints}
            </span>
            <span className="text-right font-mono text-white/60">
              {entry.player.totalGamesWon}-{entry.player.totalGamesLost}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
