import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from '@/components/navigation';
import { cn } from '@/utils/cn';

/** Bottom tab bar for mobile/tablet (hidden on lg+). */
export function MobileNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 lg:hidden">
      <ul
        className="mx-auto flex max-w-2xl items-stretch justify-around"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {NAV_ITEMS.map(({ shortLabel, to, icon: Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors',
                  isActive
                    ? 'text-brand-600 dark:text-brand-300'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                )
              }
            >
              <Icon className="h-5 w-5" aria-hidden />
              {shortLabel}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
