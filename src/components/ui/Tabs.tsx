import type { LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface TabDef {
  key: string;
  label: string;
  icon?: LucideIcon;
  count?: number;
}

interface TabsProps {
  tabs: TabDef[];
  active: string;
  onChange: (key: string) => void;
}

/** Underline-style tab bar. Horizontally scrollable on narrow screens. */
export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div className="border-b border-slate-200 dark:border-slate-800">
      <div className="flex gap-1 overflow-x-auto" role="tablist">
        {tabs.map(({ key, label, icon: Icon, count }) => {
          const isActive = key === active;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(key)}
              className={cn(
                '-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'border-brand-600 text-brand-700 dark:border-brand-400 dark:text-brand-300'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              )}
            >
              {Icon && <Icon className="h-4 w-4" aria-hidden />}
              {label}
              {typeof count === 'number' && (
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums',
                    isActive
                      ? 'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
