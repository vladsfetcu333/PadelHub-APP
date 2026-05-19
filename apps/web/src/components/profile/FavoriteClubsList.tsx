/**
 * Favourite-clubs tab content on /profile.
 *
 * Fetches the current user's favourites from `/api/users/me/favorite-clubs`,
 * renders them as the existing ClubCard plus a "Remove" overlay button.
 * Showing them as cards (instead of a stripped-down list) keeps users
 * one click away from full club detail and matches the visual language
 * of /clubs.
 */
import { useEffect, useState } from 'react';
import { Heart, HeartCrack, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { MAX_FAVORITE_CLUBS, type ClubDto } from '@padel/shared';

import { api, extractErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ClubCard } from '@/components/clubs/ClubCard';

export function FavoriteClubsList() {
  const [clubs, setClubs] = useState<ClubDto[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ClubDto[]>('/api/users/me/favorite-clubs');
      setClubs(data);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const remove = async (clubId: string) => {
    setRemovingId(clubId);
    try {
      await api.delete(`/api/users/me/favorite-clubs/${clubId}`);
      // Update local state without a full refetch — the row is gone.
      setClubs((prev) => (prev ? prev.filter((c) => c.id !== clubId) : prev));
      toast.success('Eliminat din favorite');
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setRemovingId(null);
    }
  };

  if (loading && !clubs) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Se încarcă…</p>;
  }

  if (!clubs || clubs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <HeartCrack className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="font-semibold">Nu ai cluburi favorite</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Apasă <Heart className="inline h-3.5 w-3.5" aria-hidden="true" />{' '}
              {'"Adaugă la favorite"'}
              pe pagina unui club ca să-l salvezi aici.
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/clubs">Vezi cluburile</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {clubs.length} din {MAX_FAVORITE_CLUBS} cluburi favorite. Apasă{' '}
        <X className="inline h-3.5 w-3.5" aria-hidden="true" /> pentru a elimina un club.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {clubs.map((club) => (
          <div key={club.id} className="relative">
            <ClubCard club={club} />
            <button
              type="button"
              onClick={() => void remove(club.id)}
              disabled={removingId === club.id}
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-red-700 shadow-soft transition hover:bg-red-50 hover:text-red-800 disabled:opacity-50"
              aria-label={`Elimină ${club.name} din favorite`}
              title="Elimină din favorite"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
