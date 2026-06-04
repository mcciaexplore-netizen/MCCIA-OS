import { cn } from '@/utils/cn';
import { FOLLOWUP_BADGE_CLASSES, FOLLOWUP_LABELS, type FollowUpUrgency } from '@/utils/followup';

/** Coloured badge for a follow-up's urgency (Overdue / Due Today / …). */
export function FollowUpBadge({
  urgency,
  className,
}: {
  urgency: FollowUpUrgency;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        FOLLOWUP_BADGE_CLASSES[urgency],
        className
      )}
    >
      {FOLLOWUP_LABELS[urgency]}
    </span>
  );
}
