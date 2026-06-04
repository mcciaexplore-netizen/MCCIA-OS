import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** Optional call-to-action (e.g. a "New" button). */
  action?: ReactNode;
  className?: string;
}

/** Friendly placeholder shown when a data view has no records. */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-14 text-center dark:border-slate-700 dark:bg-slate-900/40',
        className
      )}
    >
      {Icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
          <Icon className="h-6 w-6" aria-hidden />
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
