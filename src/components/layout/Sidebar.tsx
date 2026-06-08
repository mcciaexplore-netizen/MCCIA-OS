import { NavLink } from 'react-router-dom';
import { Settings, Sparkles } from 'lucide-react';
import { APP_NAME, ROUTES } from '@/constants';
import { NAV_ITEMS } from '@/components/navigation';
import { cn } from '@/utils/cn';

/** Persistent left navigation, shown on desktop (lg+) viewports only. */
export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col self-start border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:sticky lg:top-0 lg:flex lg:h-dvh">
      <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-5 dark:border-slate-800">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
          <Sparkles className="h-5 w-5" aria-hidden />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{APP_NAME}</p>
          <p className="text-xs text-slate-400">MCCIA Pune</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {NAV_ITEMS.map(({ label, to, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50'
              )
            }
          >
            <Icon className="h-5 w-5 shrink-0" aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-200 p-3 dark:border-slate-800">
        <NavLink
          to={ROUTES.settings}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50'
            )
          }
        >
          <Settings className="h-5 w-5 shrink-0" aria-hidden />
          Settings
        </NavLink>
        <p className="px-3 pt-3 text-xs text-slate-400">v0.1.0 · Workspace</p>
      </div>
    </aside>
  );
}
