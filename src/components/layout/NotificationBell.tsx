import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Briefcase, Rocket } from 'lucide-react';
import { useFollowUps } from '@/hooks/useFollowUps';
import { useAppProjects } from '@/hooks/useAppProjects';
import { useCompanies } from '@/hooks/useCompanies';
import { ROUTES } from '@/constants';
import { formatDate } from '@/utils/date';
import { getDaysUntil } from '@/utils/followup';

interface OverdueItem {
  id: string;
  kind: 'followup' | 'project';
  company: string;
  detail: string;
  date: string | null;
  to: string;
}

/**
 * TopBar bell showing the count of overdue items (overdue pending follow-ups +
 * non-delivered projects past their target launch). Clicking opens a dropdown
 * list; selecting an item navigates to its module.
 */
export function NotificationBell() {
  const followUps = useFollowUps();
  const projects = useAppProjects();
  const companies = useCompanies();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const companiesById = useMemo(
    () => new Map((companies.data ?? []).map((c) => [c.id, c.name])),
    [companies.data]
  );

  const items = useMemo<OverdueItem[]>(() => {
    const nameFor = (id: string) => companiesById.get(id) ?? 'Unknown company';
    const result: OverdueItem[] = [];

    for (const f of followUps.data ?? []) {
      if (f.status !== 'pending' || !f.dueDate) continue;
      if (getDaysUntil(f.dueDate) >= 0) continue;
      result.push({
        id: `followup-${f.id}`,
        kind: 'followup',
        company: nameFor(f.companyId),
        detail: f.title,
        date: f.dueDate,
        to: ROUTES.consulting,
      });
    }
    for (const p of projects.data ?? []) {
      if (p.stage === 'delivered' || !p.targetLaunchDate) continue;
      if (getDaysUntil(p.targetLaunchDate) >= 0) continue;
      result.push({
        id: `project-${p.id}`,
        kind: 'project',
        company: nameFor(p.companyId),
        detail: `${p.name} · launch overdue`,
        date: p.targetLaunchDate,
        to: ROUTES.appdev,
      });
    }
    return result.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
  }, [followUps.data, projects.data, companiesById]);

  const count = items.length;

  const onSelect = (to: string) => {
    setOpen(false);
    navigate(to);
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={count > 0 ? `${count} overdue items` : 'Notifications'}
        aria-haspopup="menu"
        aria-expanded={open}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50"
      >
        <Bell className="h-5 w-5" aria-hidden />
        {count > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold leading-none text-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Overdue {count > 0 && <span className="text-rose-500">· {count}</span>}
            </p>
          </div>

          {count === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
              Nothing overdue. You're all caught up.
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {items.map((item) => {
                const Icon = item.kind === 'followup' ? Briefcase : Rocket;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(item.to)}
                      className="flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300">
                        <Icon className="h-3.5 w-3.5" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                          {item.company}
                        </span>
                        <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                          {item.detail}
                        </span>
                        <span className="mt-0.5 block text-xs font-medium text-rose-500">
                          Due {formatDate(item.date)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
