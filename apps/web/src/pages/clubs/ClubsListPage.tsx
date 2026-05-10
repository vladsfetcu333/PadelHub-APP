import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, List, Map as MapIcon, Plus } from 'lucide-react';
import { ro, CourtType, type ClubDto, type ClubListResponse } from '@padel/shared';
import { toast } from 'sonner';

import { api, extractErrorMessage } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ClubCard } from '@/components/clubs/ClubCard';
import { ClubsMap } from '@/components/clubs/ClubsMap';
import { useAuth } from '@/store/auth';

type Indoor = 'ANY' | 'INDOOR' | 'OUTDOOR';

export default function ClubsListPage() {
  const user = useAuth((s) => s.user);
  const [items, setItems] = useState<ClubDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState('');
  const [type, setType] = useState<'ANY' | (typeof CourtType)[number]>('ANY');
  const [indoor, setIndoor] = useState<Indoor>('ANY');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [view, setView] = useState<'grid' | 'map'>('grid');
  const [locating, setLocating] = useState(false);

  const canCreateClub = user && (user.role === 'ADMIN' || user.role === 'CLUB_OWNER');

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number | boolean> = { pageSize: 50 };
      if (city) params['city'] = city;
      if (type !== 'ANY') params['type'] = type;
      if (indoor === 'INDOOR') params['indoor'] = true;
      else if (indoor === 'OUTDOOR') params['indoor'] = false;
      if (coords) {
        params['lat'] = coords.lat;
        params['lng'] = coords.lng;
        params['radiusKm'] = 25;
      }
      const { data } = await api.get<ClubListResponse>('/api/clubs', { params });
      setItems(data.items);
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city, type, indoor, coords?.lat, coords?.lng]);

  const handleNearMe = () => {
    if (!navigator.geolocation) {
      toast.error('Locația nu este suportată de browser');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        toast.error(ro.clubs.locationDenied);
        setLocating(false);
        // Fall back to filtering by user's city if available
        if (user?.city && !city) setCity(user.city);
      },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{ro.clubs.title}</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? ro.common.loading : `${items.length} cluburi`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border border-border">
            <button
              onClick={() => setView('grid')}
              className={`flex items-center gap-1 px-3 py-1.5 text-sm ${view === 'grid' ? 'bg-brand-50 text-brand-900' : 'text-muted-foreground'}`}
            >
              <List className="h-4 w-4" /> Listă
            </button>
            <button
              onClick={() => setView('map')}
              className={`flex items-center gap-1 px-3 py-1.5 text-sm ${view === 'map' ? 'bg-brand-50 text-brand-900' : 'text-muted-foreground'}`}
            >
              <MapIcon className="h-4 w-4" /> Hartă
            </button>
          </div>
          {canCreateClub && (
            <Button asChild size="sm">
              <Link to="/clubs/new">
                <Plus className="mr-1 h-4 w-4" />
                {ro.clubs.addClub}
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
        <aside>
          <Card>
            <CardContent className="space-y-4 pt-6">
              <p className="text-sm font-semibold">{ro.clubs.filtersTitle}</p>

              <div className="space-y-1.5">
                <Label>{ro.clubs.filterCity}</Label>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder={ro.clubs.filterAll}
                />
              </div>

              <div className="space-y-1.5">
                <Label>{ro.clubs.filterType}</Label>
                <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ANY">{ro.clubs.filterAll}</SelectItem>
                    {CourtType.map((t) => (
                      <SelectItem key={t} value={t}>
                        {ro.enums.courtType[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Indoor / Outdoor</Label>
                <Select value={indoor} onValueChange={(v) => setIndoor(v as Indoor)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ANY">{ro.clubs.filterAll}</SelectItem>
                    <SelectItem value="INDOOR">{ro.enums.courtLocation.INDOOR}</SelectItem>
                    <SelectItem value="OUTDOOR">{ro.enums.courtLocation.OUTDOOR}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleNearMe}
                variant="outline"
                className="w-full"
                disabled={locating}
              >
                <MapPin className="mr-2 h-4 w-4" />
                {locating ? ro.clubs.locating : ro.clubs.nearMe}
              </Button>
              {coords && (
                <button
                  className="text-xs text-muted-foreground underline"
                  onClick={() => setCoords(null)}
                >
                  Anulează locația
                </button>
              )}
            </CardContent>
          </Card>
        </aside>

        <section>
          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-40 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground">{ro.clubs.noResults}</p>
          ) : view === 'map' ? (
            <ClubsMap clubs={items} center={coords ?? undefined} />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {items.map((c) => (
                <ClubCard key={c.id} club={c} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
