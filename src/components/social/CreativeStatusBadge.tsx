import { CREATIVE_STATUS_LABELS } from '@/constants';
import type { CreativeStatus } from '@/types';
import { cn } from '@/utils/cn';
import { formatDate } from '@/utils/date';

/** Draft=gray, Scheduled=blue, Posted=green. */
const STATUS_CLASSES: Record<CreativeStatus, string> = {
  draft: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  posted: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
};

/**
 * Status pill. Scheduled and Posted append a date when one is provided.
 */
export function CreativeStatusBadge({
  status,
  date,
  className,
}: {
  status: CreativeStatus;
  date?: string | null;
  className?: string;
}) {
  const showDate = (status === 'scheduled' || status === 'posted') && Boolean(date);
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        STATUS_CLASSES[status],
        className
      )}
    >
      {CREATIVE_STATUS_LABELS[status]}
      {showDate && <span className="ml-1 opacity-80">· {formatDate(date)}</span>}
    </span>
  );
}
