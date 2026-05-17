/**
 * PadelHub brand marks.
 *
 * Source: padelhub_logo_variants.svg supplied by the design team. The
 * artwork is a stylised padel racket head with perforations and a
 * yellow ball accent. This file ports the original SVG `<symbol>`
 * definitions into composable React components so the brand can be
 * inlined anywhere without external assets.
 *
 * Variants:
 *   <RacketMark>       — full-colour racket on transparent background
 *   <RacketMarkWhite>  — for dark backgrounds (white racket, brand-green dots)
 *   <RacketMarkMono>   — single-colour deep ink for monochrome contexts
 *   <AppIcon>          — rounded brand-green square with the white mark inside
 *   <Wordmark>         — text "PadelHub" with the "Hub" in brand green
 *   <PadelHubLogo>     — horizontal lockup (AppIcon + Wordmark), the
 *                        default brand expression used in the navbar.
 *
 * All components accept a `className` so callers can size them with
 * Tailwind utilities (e.g. `className="h-9 w-9"`).
 */
import { cn } from '@/lib/utils';

const RACKET_PATH =
  'M 12 8 Q 12 2 18 2 L 60 2 Q 74 2 74 18 L 74 48 Q 74 64 60 64 L 38 64 L 38 92 Q 38 98 32 98 L 26 98 Q 20 98 20 92 L 20 64 L 18 64 Q 12 64 12 56 Z';

const HOLE_POSITIONS: Array<[number, number]> = [
  [28, 20],
  [40, 20],
  [52, 20],
  [34, 32],
  [46, 32],
  [58, 32],
  [28, 44],
  [40, 44],
  [52, 44],
];

interface MarkProps {
  className?: string;
  title?: string;
}

/** Full-colour racket mark. Use on light backgrounds. */
export function RacketMark({ className, title = 'PadelHub' }: MarkProps) {
  return (
    <svg
      viewBox="0 0 80 100"
      role="img"
      aria-label={title}
      className={cn('h-full w-full', className)}
    >
      <title>{title}</title>
      <path d={RACKET_PATH} fill="#16774B" />
      {HOLE_POSITIONS.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="2.2" fill="#FFFFFF" opacity="0.85" />
      ))}
      <rect x="20" y="68" width="18" height="3" fill="#FFFFFF" opacity="0.4" />
      <rect x="20" y="74" width="18" height="3" fill="#FFFFFF" opacity="0.4" />
      <circle cx="62" cy="78" r="9" fill="#E8DF3C" stroke="#16774B" strokeWidth="2" />
      <path
        d="M 56 74 Q 62 80 68 74"
        stroke="#16774B"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 56 82 Q 62 76 68 82"
        stroke="#16774B"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** White racket mark with brand-green dots — pairs with the AppIcon's green tile. */
export function RacketMarkWhite({ className, title = 'PadelHub' }: MarkProps) {
  return (
    <svg
      viewBox="0 0 80 100"
      role="img"
      aria-label={title}
      className={cn('h-full w-full', className)}
    >
      <title>{title}</title>
      <path d={RACKET_PATH} fill="#FFFFFF" />
      {HOLE_POSITIONS.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="2.2" fill="#16774B" />
      ))}
      <rect x="20" y="68" width="18" height="3" fill="#16774B" opacity="0.5" />
      <rect x="20" y="74" width="18" height="3" fill="#16774B" opacity="0.5" />
      <circle cx="62" cy="78" r="9" fill="#E8DF3C" stroke="#16774B" strokeWidth="2" />
      <path
        d="M 56 74 Q 62 80 68 74"
        stroke="#16774B"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 56 82 Q 62 76 68 82"
        stroke="#16774B"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Single-colour deep-ink variant — for print, faxes, monochrome. */
export function RacketMarkMono({ className, title = 'PadelHub' }: MarkProps) {
  return (
    <svg
      viewBox="0 0 80 100"
      role="img"
      aria-label={title}
      className={cn('h-full w-full', className)}
    >
      <title>{title}</title>
      <path d={RACKET_PATH} fill="#0F2A1F" />
      {HOLE_POSITIONS.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="2.2" fill="#FFFFFF" />
      ))}
      <rect x="20" y="68" width="18" height="3" fill="#FFFFFF" opacity="0.4" />
      <rect x="20" y="74" width="18" height="3" fill="#FFFFFF" opacity="0.4" />
      <circle cx="62" cy="78" r="9" fill="#FFFFFF" stroke="#0F2A1F" strokeWidth="2" />
      <path
        d="M 56 74 Q 62 80 68 74"
        stroke="#0F2A1F"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M 56 82 Q 62 76 68 82"
        stroke="#0F2A1F"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface AppIconProps {
  className?: string;
  rounded?: 'lg' | 'xl' | '2xl' | '3xl';
}

/** Brand-green rounded tile with the white racket mark — the favicon, app icon,
 *  and navbar mark. Size with Tailwind, e.g. `<AppIcon className="h-9 w-9" />`. */
export function AppIcon({ className, rounded = '2xl' }: AppIconProps) {
  const roundedClass = {
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    '3xl': 'rounded-3xl',
  }[rounded];

  return (
    <span
      className={cn(
        'relative inline-flex items-center justify-center overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 shadow-soft',
        roundedClass,
        className,
      )}
      aria-hidden="true"
    >
      <span className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/15" />
      <RacketMarkWhite className="relative h-[78%] w-[78%]" />
    </span>
  );
}

interface WordmarkProps {
  className?: string;
  /** "light" for use on dark backgrounds (footer). Default = on light bg. */
  tone?: 'dark' | 'light';
}

/** Plain-text wordmark "PadelHub" where "Hub" picks up the brand green. */
export function Wordmark({ className, tone = 'dark' }: WordmarkProps) {
  return (
    <span
      className={cn(
        'font-display font-bold tracking-tight',
        tone === 'dark' ? 'text-ink-950' : 'text-white',
        className,
      )}
    >
      Padel<span className="text-brand-600">Hub</span>
    </span>
  );
}

interface LogoProps {
  className?: string;
  iconClassName?: string;
  wordmarkClassName?: string;
  tone?: 'dark' | 'light';
  showWordmark?: boolean;
}

/** Horizontal lockup: AppIcon + Wordmark, sized for navbar default. */
export function PadelHubLogo({
  className,
  iconClassName,
  wordmarkClassName,
  tone = 'dark',
  showWordmark = true,
}: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <AppIcon className={cn('h-9 w-9', iconClassName)} />
      {showWordmark && <Wordmark tone={tone} className={cn('text-lg', wordmarkClassName)} />}
    </span>
  );
}
