import { Link, useLocation } from 'react-router-dom';
import { LogOut, Search, Settings, Sparkles } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NotificationBell } from './NotificationBell';
import { NAV_ITEMS } from '@/components/navigation';
import { useAppCommand } from '@/components/command/useAppCommand';
import { useAuth } from '@/auth/useAuth';
import { APP_NAME, ROUTES } from '@/constants';

/** Resolve the page title from the current route for the desktop header. */
function useCurrentTitle(): string {
  const { pathname } = useLocation();
  if (pathname === ROUTES.settings) return 'Settings';
  const match = NAV_ITEMS.find((item) =>
    item.end ? pathname === item.to : pathname.startsWith(item.to)
  );
  return match?.label ?? APP_NAME;
}

/**
 * Top bar. Shows the current section title (desktop) or app brand (mobile),
 * plus the global search trigger, overdue-items bell, settings, and theme
 * toggle on every breakpoint.
 */
export function TopBar() {
  const title = useCurrentTitle();
  const { openPalette } = useAppCommand();
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 sm:px-6">
      {/* Mobile brand */}
      <div className="flex items-center gap-2 lg:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
          <Sparkles className="h-4 w-4" aria-hidden />
        </div>
        <span className="text-sm font-semibold text-slate-900 dark:text-slate-50">{APP_NAME}</span>
      </div>

      {/* Desktop section title */}
      <h2 className="hidden text-base font-semibold text-slate-700 dark:text-slate-200 lg:block">
        {title}
      </h2>

      <div className="flex items-center gap-1">
        {/* Search trigger (⌘K). Compact icon on mobile, labelled pill on desktop. */}
        <button
          type="button"
          onClick={openPalette}
          aria-label="Search"
          className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-500 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400 dark:hover:bg-slate-800 sm:flex"
        >
          <Search className="h-4 w-4" aria-hidden />
          <span>Search…</span>
          <kbd className="rounded border border-slate-300 px-1.5 text-[10px] font-medium text-slate-400 dark:border-slate-600">
            ⌘K
          </kbd>
        </button>
        <button
          type="button"
          onClick={openPalette}
          aria-label="Search"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50 sm:hidden"
        >
          <Search className="h-5 w-5" aria-hidden />
        </button>

        <NotificationBell />

        <Link
          to={ROUTES.settings}
          aria-label="Settings"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50"
        >
          <Settings className="h-5 w-5" aria-hidden />
        </Link>

        <ThemeToggle />

        {user && (
          <div className="ml-1 flex items-center gap-2 border-l border-slate-200 pl-2 dark:border-slate-700">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-lg dark:bg-slate-800"
              title={`${user.name} · ${user.role}`}
              aria-hidden
            >
              {user.emoji}
            </span>
            <span className="hidden text-sm font-medium text-slate-700 dark:text-slate-200 sm:block">
              {user.name}
            </span>
            <button
              type="button"
              onClick={signOut}
              aria-label={`Sign out ${user.name}`}
              title="Sign out"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50"
            >
              <LogOut className="h-5 w-5" aria-hidden />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
