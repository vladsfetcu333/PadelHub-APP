import { cn } from '@/lib/utils';

interface Props {
  level: number;
  className?: string;
}

// Color tiers: 1.0–2.5 beginner (green-50), 3.0–4.0 intermediate (green-200/600),
// 4.5–5.5 advanced (green-700), 6.0+ pro (dark)
function tierClass(level: number): string {
  if (level >= 6) return 'bg-brand-950 text-white';
  if (level >= 4.5) return 'bg-brand-700 text-white';
  if (level >= 3) return 'bg-brand-200 text-brand-900';
  return 'bg-brand-50 text-brand-800 border border-brand-200';
}

export function PadelLevelBadge({ level, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        tierClass(level),
        className,
      )}
      title={`Nivel padel ${level.toFixed(1)} (Playtomic)`}
    >
      Nivel {level.toFixed(1)}
    </span>
  );
}
