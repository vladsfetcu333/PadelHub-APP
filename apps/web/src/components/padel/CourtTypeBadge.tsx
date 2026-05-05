import type { CourtType, CourtLocation } from '@padel/shared';
import { ro } from '@padel/shared';
import { cn } from '@/lib/utils';

const typeColor: Record<CourtType, string> = {
  PANORAMIC: 'bg-brand-100 text-brand-900',
  TRADITIONAL: 'bg-blue-100 text-blue-900',
  SINGLE_PADEL: 'bg-amber-100 text-amber-900',
};

export function CourtTypeBadge({
  type,
  location,
  className,
}: {
  type: CourtType;
  location?: CourtLocation;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        typeColor[type],
        className,
      )}
    >
      {ro.enums.courtType[type]}
      {location && (
        <span className="ml-0.5 text-[10px] opacity-70">· {ro.enums.courtLocation[location]}</span>
      )}
    </span>
  );
}
