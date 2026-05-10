import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ro, type OpenMatchDto, type PublicUserDto } from '@padel/shared';
import { Calendar, MapPin, Users, X } from 'lucide-react';
import { toast } from 'sonner';

import { api, extractErrorMessage } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PadelLevelBadge } from '@/components/padel/PadelLevelBadge';
import { useAuth } from '@/store/auth';

interface OpenMatchRecommendation {
  player: PublicUserDto;
  score: number;
}

export default function OpenMatchDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuth((s) => s.user);
  const [post, setPost] = useState<OpenMatchDto | null>(null);
  const [recs, setRecs] = useState<OpenMatchRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data } = await api.get<OpenMatchDto>(`/api/open-matches/${id}`);
      setPost(data);
      if (data.status === 'OPEN' && user) {
        try {
          const { data: recsData } = await api.get<OpenMatchRecommendation[]>(
            `/api/matching/open-match/${id}/recommendations`,
            { params: { limit: 6 } },
          );
          setRecs(recsData);
        } catch {
          /* ignore */
        }
      }
    } catch (err) {
      toast.error(extractErrorMessage(err, ro.errors.notFound));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id]);

  const isParticipant = post?.participants.some((p) => p.userId === user?.id) ?? false;
  const isCreator = post?.creatorId === user?.id;

  const join = async () => {
    setPending(true);
    try {
      const { data } = await api.post<OpenMatchDto>(`/api/open-matches/${id}/join`);
      setPost(data);
      if (data.status === 'FULL') toast.success(ro.openMatches.matchFull);
      else toast.success(ro.openMatches.join);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setPending(false);
    }
  };

  const leave = async () => {
    setPending(true);
    try {
      const { data } = await api.delete<OpenMatchDto>(`/api/open-matches/${id}/leave`);
      setPost(data);
      toast.success(ro.openMatches.leave);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setPending(false);
    }
  };

  const cancel = async () => {
    setPending(true);
    try {
      await api.delete(`/api/open-matches/${id}`);
      toast.success(ro.openMatches.cancel);
      navigate('/open-matches');
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setPending(false);
    }
  };

  if (loading) return <p className="p-8 text-muted-foreground">{ro.common.loading}</p>;
  if (!post) return <p className="p-8 text-muted-foreground">{ro.errors.notFound}</p>;

  const date = new Date(post.scheduledAt);
  const dateStr = date.toLocaleString('ro-RO', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
  const slots = 4 - post.participants.length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">{post.club.name}</CardTitle>
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" /> {post.club.address}
              </p>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {dateStr} · {post.durationMinutes} minute
              </p>
              <p className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                {post.participants.length} / 4 jucători
              </p>

              <div className="space-y-1 text-xs">
                {(post.levelMin != null || post.levelMax != null) && (
                  <p>
                    {ro.openMatches.levelRange}: {post.levelMin?.toFixed(1) ?? '—'} –{' '}
                    {post.levelMax?.toFixed(1) ?? '—'}
                  </p>
                )}
                {post.sideNeeded && (
                  <p>
                    {ro.openMatches.sideNeeded}: {ro.enums.preferredSide[post.sideNeeded]}
                  </p>
                )}
                {post.goalRequired && <p>Obiectiv: {ro.enums.goal[post.goalRequired]}</p>}
                {post.genderRequired !== 'ANY' && (
                  <p>Gen: {post.genderRequired === 'MALE_ONLY' ? 'doar bărbați' : 'doar femei'}</p>
                )}
              </div>

              {post.notes && (
                <div className="rounded-md bg-muted/40 p-3 text-sm">
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    {ro.openMatches.notesLabel}
                  </p>
                  <p>{post.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Jucători ({post.participants.length}/4)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {post.participants.map((p) => (
                  <Link
                    key={p.id}
                    to={`/profile/${p.user.username}`}
                    className="flex items-center gap-3 rounded-md p-2 hover:bg-muted"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-brand-950 text-white">
                        {`${p.user.firstName[0] ?? ''}${p.user.lastName[0] ?? ''}`.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">
                        {p.user.firstName} {p.user.lastName}
                        {p.userId === post.creatorId && (
                          <span className="ml-2 rounded bg-brand-50 px-1.5 py-0.5 text-[10px] text-brand-900">
                            creator
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">@{p.user.username}</p>
                    </div>
                    <PadelLevelBadge level={p.user.padelLevel} />
                  </Link>
                ))}
                {Array.from({ length: slots }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-md border-2 border-dashed border-border p-2 text-muted-foreground"
                  >
                    <X className="h-5 w-5" />
                    <span className="text-sm italic">Loc liber</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-3">
          {user && post.status === 'OPEN' && !isParticipant && (
            <Button onClick={join} className="w-full" disabled={pending}>
              {pending ? ro.common.loading : ro.openMatches.join}
            </Button>
          )}
          {user && post.status === 'OPEN' && isParticipant && !isCreator && (
            <Button variant="outline" onClick={leave} className="w-full" disabled={pending}>
              {ro.openMatches.leave}
            </Button>
          )}
          {isCreator && post.status === 'OPEN' && (
            <Button variant="destructive" onClick={cancel} className="w-full" disabled={pending}>
              {ro.openMatches.cancel}
            </Button>
          )}
          {post.resultMatchId && (
            <Button asChild className="w-full" variant="secondary">
              <Link to={`/matches/${post.resultMatchId}`}>Vezi match-ul</Link>
            </Button>
          )}

          {post.status === 'OPEN' && recs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">{ro.openMatches.recommendationsTitle}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {recs.map((r) => (
                  <Link
                    key={r.player.id}
                    to={`/profile/${r.player.username}`}
                    className="flex items-center justify-between rounded-md p-2 hover:bg-muted"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="bg-brand-950 text-[10px] text-white">
                          {`${r.player.firstName[0] ?? ''}${r.player.lastName[0] ?? ''}`.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">
                        {r.player.firstName} {r.player.lastName}
                      </span>
                    </div>
                    <span className="text-xs font-mono text-brand-700">{r.score.toFixed(0)}</span>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
