import { ArrowLeftRight, ArrowLeft, ArrowRight } from 'lucide-react';
import type { PreferredSide } from '@padel/shared';
import { ro } from '@padel/shared';
import { cn } from '@/lib/utils';

interface Props {
  side: PreferredSide;
  className?: string;
  showLabel?: boolean;
}

export function PreferredSideIndicator({ side, className, showLabel = true }: Props) {
  const Icon = side === 'LEFT' ? ArrowLeft : side === 'RIGHT' ? ArrowRight : ArrowLeftRight;
  const label = ro.enums.preferredSide[side];
  const tooltip =
    side === 'LEFT'
      ? 'Joacă pe partea stângă (revés)'
      : side === 'RIGHT'
        ? 'Joacă pe partea dreaptă (drive)'
        : 'Poate juca pe ambele părți';
  return (
    <span
      title={tooltip}
      className={cn(
        'inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs font-medium text-foreground',
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {showLabel && <span>{label}</span>}
    </span>
  );
}
