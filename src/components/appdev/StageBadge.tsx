import { PROJECT_STAGE_LABELS } from '@/constants';
import type { ProjectStage } from '@/types';
import { cn } from '@/utils/cn';
import { STAGE_BADGE_CLASSES } from '@/utils/projectStage';

/** Coloured badge for a project's pipeline stage. */
export function StageBadge({ stage, className }: { stage: ProjectStage; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        STAGE_BADGE_CLASSES[stage],
        className
      )}
    >
      {PROJECT_STAGE_LABELS[stage]}
    </span>
  );
}
