/**
 * Public-facing photo gallery for a club detail page.
 *
 * Layout:
 *   - 1 photo  → single full-width hero
 *   - 2 photos → side-by-side
 *   - 3+ photos → large hero on the left, 2x2 thumbnail grid on the right
 * Clicking any tile opens the <PhotoLightbox> at the right index.
 *
 * When the club has no photos, renders a discreet placeholder so the
 * surrounding layout doesn't shift.
 */
import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import type { ClubPhotoDto } from '@padel/shared';
import { PhotoLightbox } from './PhotoLightbox';
import { cn } from '@/lib/utils';

interface ClubPhotoGalleryProps {
  photos: ClubPhotoDto[];
}

export function ClubPhotoGallery({ photos }: ClubPhotoGalleryProps) {
  const [openAt, setOpenAt] = useState<number | null>(null);

  if (photos.length === 0) {
    return (
      <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-muted-foreground">
        <ImageOff className="h-6 w-6" aria-hidden="true" />
        <p className="mt-2 text-sm">Fotografii indisponibile</p>
      </div>
    );
  }

  const open = (i: number) => setOpenAt(i);
  const close = () => setOpenAt(null);

  if (photos.length === 1) {
    return (
      <>
        <Tile photo={photos[0]!} onClick={() => open(0)} className="h-64 w-full sm:h-80" />
        <PhotoLightbox
          photos={photos}
          initialIndex={openAt ?? 0}
          open={openAt !== null}
          onClose={close}
        />
      </>
    );
  }

  if (photos.length === 2) {
    return (
      <>
        <div className="grid grid-cols-2 gap-2">
          {photos.map((p, i) => (
            <Tile key={p.url + i} photo={p} onClick={() => open(i)} className="h-48 sm:h-64" />
          ))}
        </div>
        <PhotoLightbox
          photos={photos}
          initialIndex={openAt ?? 0}
          open={openAt !== null}
          onClose={close}
        />
      </>
    );
  }

  // 3+ photos — hero + grid layout
  const hero = photos[0]!;
  const grid = photos.slice(1, 5);
  const overflow = Math.max(0, photos.length - 5);

  return (
    <>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <Tile photo={hero} onClick={() => open(0)} className="h-64 sm:h-full sm:min-h-[20rem]" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
          {grid.map((p, idx) => {
            const i = idx + 1; // offset into the full array
            const isLast = idx === grid.length - 1 && overflow > 0;
            return (
              <Tile
                key={p.url + i}
                photo={p}
                onClick={() => open(i)}
                className="h-24 sm:h-[9.5rem]"
                overlay={isLast ? `+${overflow + 1}` : undefined}
              />
            );
          })}
        </div>
      </div>
      <PhotoLightbox
        photos={photos}
        initialIndex={openAt ?? 0}
        open={openAt !== null}
        onClose={close}
      />
    </>
  );
}

interface TileProps {
  photo: ClubPhotoDto;
  onClick: () => void;
  className?: string;
  overlay?: string;
}

function Tile({ photo, onClick, className, overlay }: TileProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative w-full overflow-hidden rounded-lg bg-muted transition hover:opacity-95',
        className,
      )}
      aria-label={photo.caption ?? 'Deschide fotografia'}
    >
      <img
        src={photo.url}
        alt={photo.caption ?? ''}
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
        draggable={false}
        onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = 'none')}
      />
      {overlay && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-2xl font-semibold text-white">
          {overlay}
        </div>
      )}
    </button>
  );
}
