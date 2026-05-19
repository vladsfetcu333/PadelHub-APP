import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Heart, BadgeCheck, MapPin, Globe, Phone } from 'lucide-react';
import { ro, type ClubDto, type ClubPhotoDto } from '@padel/shared';
import { toast } from 'sonner';

import { api, extractErrorMessage } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CourtTypeBadge } from '@/components/padel/CourtTypeBadge';
import { ClubsMap } from '@/components/clubs/ClubsMap';
import { ClubPhotoGallery } from '@/components/clubs/ClubPhotoGallery';
import { ClubPhotoManager } from '@/components/clubs/ClubPhotoManager';
import { useAuth } from '@/store/auth';

export default function ClubDetailPage() {
  const { slug } = useParams();
  const user = useAuth((s) => s.user);
  const [club, setClub] = useState<ClubDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [pending, setPending] = useState(false);

  const load = async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const { data } = await api.get<ClubDto>(`/api/clubs/${slug}`);
      setClub(data);
      if (user) {
        try {
          const { data: favs } = await api.get<ClubDto[]>('/api/users/me/favorite-clubs');
          setIsFavorite(favs.some((f) => f.id === data.id));
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
  }, [slug, user?.id]);

  const toggleFavorite = async () => {
    if (!club || !user || pending) return;
    // Snapshot the current state so we can revert on error.
    const wasFavorite = isFavorite;
    setPending(true);
    // Optimistic update for snappy feedback. We'll reconcile against the
    // server's actual favorites list right after the mutation.
    setIsFavorite(!wasFavorite);
    try {
      if (wasFavorite) {
        await api.delete(`/api/users/me/favorite-clubs/${club.id}`);
      } else {
        await api.post(`/api/users/me/favorite-clubs/${club.id}`);
      }
      // Refetch the canonical favorites list so the badge always
      // matches the DB, even if the server silently no-ops (e.g. a
      // duplicate POST on a club we already had).
      try {
        const { data: favs } = await api.get<ClubDto[]>('/api/users/me/favorite-clubs');
        setIsFavorite(favs.some((f) => f.id === club.id));
      } catch {
        /* leave the optimistic value in place if the refetch fails */
      }
      toast.success(wasFavorite ? ro.clubs.favoriteRemoved : ro.clubs.favoriteAdded);
    } catch (err) {
      // Revert optimistic flip on error.
      setIsFavorite(wasFavorite);
      toast.error(extractErrorMessage(err, ro.clubs.favoriteLimit));
    } finally {
      setPending(false);
    }
  };

  const verify = async () => {
    if (!club) return;
    try {
      const { data } = await api.post<ClubDto>(`/api/clubs/${club.id}/verify`);
      setClub(data);
      toast.success('Club verificat');
    } catch (err) {
      toast.error(extractErrorMessage(err));
    }
  };

  if (loading) return <p className="p-8 text-muted-foreground">{ro.common.loading}</p>;
  if (!club) return <p className="p-8 text-muted-foreground">{ro.errors.notFound}</p>;

  const facilities: Array<[boolean, string]> = [
    [club.hasLockerRoom, ro.facilities.hasLockerRoom],
    [club.hasShowers, ro.facilities.hasShowers],
    [club.hasCafe, ro.facilities.hasCafe],
    [club.hasParking, ro.facilities.hasParking],
    [club.hasShop, ro.facilities.hasShop],
    [club.hasSchool, ro.facilities.hasSchool],
    [club.hasRacketRental, ro.facilities.hasRacketRental],
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {club.name}
            {club.isVerified && <BadgeCheck className="ml-2 inline h-5 w-5 text-brand-600" />}
          </h1>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" /> {club.address}
          </p>
        </div>
        <div className="flex gap-2">
          {user && (
            <Button
              variant={isFavorite ? 'default' : 'outline'}
              onClick={toggleFavorite}
              disabled={pending}
            >
              <Heart className={`mr-2 h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
              {isFavorite ? 'Favorit' : 'Adaugă la favorite'}
            </Button>
          )}
          {user?.role === 'ADMIN' && !club.isVerified && (
            <Button variant="secondary" onClick={verify}>
              <BadgeCheck className="mr-2 h-4 w-4" /> {ro.clubs.verify}
            </Button>
          )}
        </div>
      </div>

      {/* Photo gallery — full width, above the two-column layout */}
      <div className="mb-6">
        <ClubPhotoGallery photos={club.photoObjects} />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          {club.description && (
            <Card>
              <CardContent className="pt-6">
                <p>{club.description}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="pt-6">
              <h2 className="mb-3 font-semibold">{ro.clubs.courts}</h2>
              <div className="space-y-2">
                {club.courts.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2"
                  >
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <CourtTypeBadge type={c.type} location={c.location} />
                        {c.surface && (
                          <span className="text-xs text-muted-foreground">{c.surface}</span>
                        )}
                      </div>
                    </div>
                    {c.pricePerHour != null && (
                      <p className="text-sm">
                        <span className="font-medium">{c.pricePerHour} RON</span>
                        {c.pricePerHourPeak && (
                          <span className="text-xs text-muted-foreground">
                            {' '}
                            / {c.pricePerHourPeak} peak
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <ClubsMap
            clubs={[club]}
            center={{ lat: club.latitude, lng: club.longitude }}
            height="320px"
          />

          {/* Owner / admin photo management panel */}
          {user && (user.role === 'ADMIN' || club.ownerId === user.id) && (
            <ClubPhotoManager
              clubId={club.id}
              photos={club.photoObjects}
              onPhotosChange={(next: ClubPhotoDto[]) =>
                setClub((c) =>
                  c ? { ...c, photoObjects: next, photos: next.map((p) => p.url) } : c,
                )
              }
            />
          )}
        </div>

        <aside className="space-y-4">
          <Card>
            <CardContent className="space-y-2 pt-6 text-sm">
              {club.phone && (
                <p className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${club.phone}`} className="hover:underline">
                    {club.phone}
                  </a>
                </p>
              )}
              {club.website && (
                <p className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={club.website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-700 hover:underline"
                  >
                    {club.website.replace(/^https?:\/\//, '')}
                  </a>
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h3 className="mb-3 text-sm font-semibold">{ro.clubs.facilities}</h3>
              <ul className="space-y-1 text-sm">
                {facilities.map(([on, label]) => (
                  <li
                    key={label}
                    className={on ? 'text-foreground' : 'text-muted-foreground line-through'}
                  >
                    {on ? '✓' : '·'} {label}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
