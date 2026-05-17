import { Link } from 'react-router-dom';
import { MapPin, BadgeCheck, ArrowUpRight } from 'lucide-react';
import type { ClubDto } from '@padel/shared';
import { ro } from '@padel/shared';

import { CourtTypeBadge } from '@/components/padel/CourtTypeBadge';

export function ClubCard({ club }: { club: ClubDto }) {
  const cover = club.photos[0];
  const courtCount = club.courts.length;

  return (
    <Link to={`/clubs/${club.slug}`} className="group block">
      <article className="relative h-full overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lifted">
        {/* Cover image */}
        <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-brand-100 to-brand-200">
          {cover && (
            <img
              src={cover}
              alt={club.name}
              loading="lazy"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          )}
          {/* Bottom gradient */}
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 to-transparent" />
          {/* Top-right badges */}
          <div className="absolute right-3 top-3 flex items-center gap-1.5">
            {club.distanceKm != null && (
              <span className="rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-ink-900 shadow-soft backdrop-blur">
                {ro.clubs.distanceKm(club.distanceKm)}
              </span>
            )}
            {club.isVerified && (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-brand-600/95 px-2 py-1 text-[11px] font-bold text-white shadow-soft"
                title="Verified"
              >
                <BadgeCheck className="h-3 w-3" /> Verificat
              </span>
            )}
          </div>
          {/* City pill on cover */}
          <div className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
            <MapPin className="h-3 w-3" />
            {club.city}
          </div>
        </div>

        {/* Body */}
        <div className="space-y-3 p-5">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-display text-lg font-bold leading-tight tracking-tight text-ink-950 transition-colors group-hover:text-brand-700">
              {club.name}
            </h3>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-ink-400 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-600" />
          </div>

          <p className="line-clamp-1 text-xs text-ink-500">{club.address}</p>

          {club.description && (
            <p className="line-clamp-2 text-sm leading-relaxed text-ink-600">{club.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {club.courts.slice(0, 3).map((c) => (
              <CourtTypeBadge key={c.id} type={c.type} location={c.location} />
            ))}
            {courtCount > 3 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-ink-500">
                +{courtCount - 3}
              </span>
            )}
            <span className="ml-auto text-[11px] font-semibold uppercase tracking-wider text-ink-400">
              {courtCount} {courtCount === 1 ? 'teren' : 'terenuri'}
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
