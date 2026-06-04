import { forwardRef, type HTMLAttributes } from 'react';
import type { DraggableSyntheticListeners } from '@dnd-kit/core';
import { AlertTriangle, CalendarDays, GripVertical } from 'lucide-react';
import { CompanyAvatar } from '@/components/companies/CompanyAvatar';
import type { AppProject, Company } from '@/types';
import { cn } from '@/utils/cn';
import { formatDate } from '@/utils/date';
import { DUE_TONE_CLASSES, getDueTone } from '@/utils/projectStage';

interface ProjectCardProps extends HTMLAttributes<HTMLDivElement> {
  project: AppProject;
  company: Company | null;
  onOpen?: () => void;
  /** Drag handle wiring supplied by the sortable wrapper. */
  handleRef?: (node: HTMLElement | null) => void;
  handleProps?: DraggableSyntheticListeners;
  dragging?: boolean;
}

/** A single Kanban project card. Pure visual; drag wiring is external. */
export const ProjectCard = forwardRef<HTMLDivElement, ProjectCardProps>(function ProjectCard(
  { project, company, onOpen, handleRef, handleProps, dragging, className, ...rest },
  ref
) {
  const dueTone = getDueTone(project.targetLaunchDate);

  return (
    <div
      ref={ref}
      className={cn(
        'rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900',
        dragging && 'opacity-50',
        className
      )}
      {...rest}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 flex-1 text-left text-sm font-medium text-slate-900 hover:text-brand-600 dark:text-slate-100 dark:hover:text-brand-300"
        >
          <span className="line-clamp-2">{project.name}</span>
        </button>
        <button
          ref={handleRef}
          aria-label="Drag to move"
          className="-mr-1 -mt-1 cursor-grab touch-none rounded p-1 text-slate-400 hover:text-slate-600 active:cursor-grabbing dark:hover:text-slate-200"
          {...handleProps}
        >
          <GripVertical className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <CompanyAvatar name={company?.name} seed={project.companyId} size="sm" />
        <span className="truncate text-xs text-slate-500 dark:text-slate-400">
          {company?.name ?? 'Unknown company'}
        </span>
      </div>

      {project.nextAction && (
        <p className="mt-2 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="text-slate-400 dark:text-slate-500">Next:</span> {project.nextAction}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <span
          className={cn('inline-flex items-center gap-1 text-xs font-medium', DUE_TONE_CLASSES[dueTone])}
        >
          <CalendarDays className="h-3.5 w-3.5" aria-hidden />
          {project.targetLaunchDate ? formatDate(project.targetLaunchDate) : 'No due date'}
        </span>
        {project.blocker && (
          <span
            title={project.blocker}
            className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
          >
            <AlertTriangle className="h-3 w-3" aria-hidden />
            Blocked
          </span>
        )}
      </div>
    </div>
  );
});
