/**
 * Reusable photo lightbox — Phase 5 Part E.
 *
 * Opens a modal with the photo at `initialIndex`, supports Esc/←/→ for
 * close + previous/next, and a small thumbnail strip at the bottom for
 * jumping. Built on the shadcn <Dialog> primitive (which uses Radix
 * underneath) — that gives us focus trapping and overlay clicks for free.
 */
import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { ClubPhotoDto } from '@padel/shared';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const CATEGORY_LABEL: Record<ClubPhotoDto['category'], string> = {
  MAIN: 'Imagine principală',
  COURTS: 'Terenuri',
  LOCKER_ROOM: 'Vestiar',
  FACILITIES: 'Facilități',
  EXTERIOR: 'Exterior',
};

interface PhotoLightboxProps {
  photos: ClubPhotoDto[];
  initialIndex: number;
  open: boolean;
  onClose: () => void;
}

export function PhotoLightbox({ photos, initialIndex, open, onClose }: PhotoLightboxProps) {
  const [index, setIndex] = useState(initialIndex);

  // Whenever the caller opens the lightbox at a fresh photo, reset the
  // pointer so the user sees the photo they actually clicked.
  useEffect(() => {
    if (open) setIndex(initialIndex);
  }, [open, initialIndex]);

  const next = useCallback(() => {
    setIndex((i) => (i + 1) % photos.length);
  }, [photos.length]);

  const prev = useCallback(() => {
    setIndex((i) => (i - 1 + photos.length) % photos.length);
  }, [photos.length]);

  // Keyboard nav — only when open. Radix already handles Esc-to-close on
  // <Dialog>, but we still need ← / → for cycling.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, next, prev]);

  if (!photos[index]) return null;
  const current = photos[index];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-5xl border-none bg-black/95 p-0 text-white"
        // Hide Radix's default close button (we render our own)
        // — keep its functionality for accessibility.
      >
        <DialogTitle className="sr-only">Galerie foto club</DialogTitle>

        <div className="relative flex flex-col">
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-2 text-xs">
            <span>
              {index + 1} / {photos.length} · {CATEGORY_LABEL[current.category]}
            </span>
            <button
              onClick={onClose}
              className="rounded-full p-1.5 transition hover:bg-white/15"
              aria-label="Închide galeria"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* Image stage */}
          <div className="relative flex items-center justify-center bg-black">
            <img
              key={current.url}
              src={current.url}
              alt={current.caption ?? `Fotografie ${index + 1}`}
              className="max-h-[70vh] w-auto object-contain"
              draggable={false}
            />

            {photos.length > 1 && (
              <>
                <button
                  onClick={prev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 transition hover:bg-black/70"
                  aria-label="Fotografia anterioară"
                >
                  <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                </button>
                <button
                  onClick={next}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 transition hover:bg-black/70"
                  aria-label="Fotografia următoare"
                >
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </button>
              </>
            )}
          </div>

          {/* Caption */}
          {current.caption && (
            <p className="px-4 py-2 text-center text-sm text-white/85">{current.caption}</p>
          )}

          {/* Thumbnail strip */}
          {photos.length > 1 && (
            <div className="flex flex-wrap justify-center gap-2 border-t border-white/10 px-3 py-3">
              {photos.map((p, i) => (
                <button
                  key={p.url + i}
                  onClick={() => setIndex(i)}
                  className={cn(
                    'h-14 w-20 overflow-hidden rounded border-2 transition',
                    i === index
                      ? 'border-brand-400'
                      : 'border-transparent opacity-60 hover:opacity-100',
                  )}
                  aria-label={`Mergi la fotografia ${i + 1}`}
                >
                  <img
                    src={p.url}
                    alt={p.caption ?? ''}
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
