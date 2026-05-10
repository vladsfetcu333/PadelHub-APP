import { ro } from '@padel/shared';
import { cn } from '@/lib/utils';

interface Breakdown {
  level: number;
  side: number;
  availability: number;
  clubs: number;
  objectives: number;
  history: number;
}

const ROWS: Array<{ key: keyof Breakdown; label: string; weight: number }> = [
  { key: 'level', label: ro.matching.breakdownLevel, weight: 0.3 },
  { key: 'side', label: ro.matching.breakdownSide, weight: 0.2 },
  { key: 'availability', label: ro.matching.breakdownAvailability, weight: 0.2 },
  { key: 'clubs', label: ro.matching.breakdownClubs, weight: 0.15 },
  { key: 'objectives', label: ro.matching.breakdownObjectives, weight: 0.1 },
  { key: 'history', label: ro.matching.breakdownHistory, weight: 0.05 },
];

export function CompatibilityBreakdownBars({ breakdown }: { breakdown: Breakdown }) {
  return (
    <div className="space-y-1.5">
      {ROWS.map((r) => {
        const value = breakdown[r.key];
        return (
          <div key={r.key} className="flex items-center gap-2 text-xs">
            <span className="w-24 text-muted-foreground">{r.label}</span>
            <div className="relative h-2 flex-1 overflow-hidden rounded bg-muted">
              <div
                className={cn(
                  'h-full transition-all',
                  value >= 80 ? 'bg-brand-600' : value >= 50 ? 'bg-brand-400' : 'bg-amber-400',
                )}
                style={{ width: `${value}%` }}
              />
            </div>
            <span className="w-10 text-right font-mono tabular-nums">{value.toFixed(0)}</span>
            <span className="w-8 text-right text-[10px] text-muted-foreground">
              ×{r.weight.toFixed(2)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
