import { INDUSTRY_LABELS } from '@/constants';
import type { Industry } from '@/types';
import { cn } from '@/utils/cn';
import { INDUSTRY_BADGE_CLASSES } from '@/utils/industry';

/** Industry pill with a consistent colour per sector. */
export function IndustryBadge({
  industry,
  className,
}: {
  industry: Industry | null;
  className?: string;
}) {
  if (!industry) {
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400',
          className
        )}
      >
        Unspecified
      </span>
    );
  }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        INDUSTRY_BADGE_CLASSES[industry],
        className
      )}
    >
      {INDUSTRY_LABELS[industry]}
    </span>
  );
}
