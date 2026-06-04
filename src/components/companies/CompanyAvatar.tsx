import { cn } from '@/utils/cn';

/** Deterministic colour palette for company avatars. */
const AVATAR_COLORS = [
  'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
  'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300',
  'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300',
  'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
  'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300',
  'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300',
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

const SIZES = {
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-8 w-8 text-xs',
} as const;

interface CompanyAvatarProps {
  name: string | null | undefined;
  /** Stable seed for colour (defaults to the name). */
  seed?: string;
  size?: keyof typeof SIZES;
  className?: string;
}

/** Circular avatar showing company initials in a deterministic colour. */
export function CompanyAvatar({ name, seed, size = 'md', className }: CompanyAvatarProps) {
  const label = name ?? 'Unknown';
  const color = AVATAR_COLORS[hashString(seed ?? label) % AVATAR_COLORS.length];
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold',
        SIZES[size],
        color,
        className
      )}
      aria-hidden
    >
      {initials(label)}
    </span>
  );
}
