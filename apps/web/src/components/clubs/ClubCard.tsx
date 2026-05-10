import { Link } from 'react-router-dom';
import { MapPin, BadgeCheck } from 'lucide-react';
import type { ClubDto } from '@padel/shared';
import { ro } from '@padel/shared';

import { Card, CardContent } from '@/components/ui/card';
import { CourtTypeBadge } from '@/components/padel/CourtTypeBadge';

export function ClubCard({ club }: { club: ClubDto }) {
  return (
    <Link to={`/clubs/${club.slug}`} className="block">
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardContent className="space-y-3 pt-6">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold leading-tight text-foreground">
                {club.name}
                {club.isVerified && <BadgeCheck className="ml-1 inline h-4 w-4 text-brand-600" />}
              </h3>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3" />
                {club.address}
              </p>
            </div>
            {club.distanceKm != null && (
              <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-900">
                {ro.clubs.distanceKm(club.distanceKm)}
              </span>
            )}
          </div>

          {club.description && (
            <p className="line-clamp-2 text-sm text-muted-foreground">{club.description}</p>
          )}

          <div className="flex flex-wrap gap-1.5">
            {club.courts.slice(0, 4).map((c) => (
              <CourtTypeBadge key={c.id} type={c.type} location={c.location} />
            ))}
            {club.courts.length > 4 && (
              <span className="text-xs text-muted-foreground">+{club.courts.length - 4}</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
