import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Briefcase,
  Building2,
  CornerDownLeft,
  Plus,
  Rocket,
  Search,
  type LucideIcon,
} from 'lucide-react';
import { NAV_ITEMS } from '@/components/navigation';
import { useCompanies } from '@/hooks/useCompanies';
import { useConsultingSessions } from '@/hooks/useConsultingSessions';
import { useAppProjects } from '@/hooks/useAppProjects';
import { ROUTES } from '@/constants';
import { cn } from '@/utils/cn';
import { useAppCommand } from './useAppCommand';

interface CommandItem {
  id: string;
  group: string;
  label: string;
  sublabel?: string;
  icon: LucideIcon;
  run: () => void;
}

const MAX_PER_GROUP = 5;

/**
 * Global command palette (⌘K / `/`). Searches companies, consulting sessions,
 * and app projects, offers quick navigation, and exposes the current page's
 * "new entry" action. Keyboard-driven: ↑/↓ to move, ↵ to run, Esc to close.
 */
export function CommandPalette() {
  const { paletteOpen, closePalette, newAction } = useAppCommand();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const companies = useCompanies();
  const sessions = useConsultingSessions();
  const projects = useAppProjects();

  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  // Reset query + focus the input each time the palette opens.
  useEffect(() => {
    if (paletteOpen) {
      setQuery('');
      setActive(0);
      const raf = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(raf);
    }
  }, [paletteOpen]);

  const companiesById = useMemo(
    () => new Map((companies.data ?? []).map((c) => [c.id, c.name])),
    [companies.data]
  );

  const items = useMemo<CommandItem[]>(() => {
    const q = query.trim().toLowerCase();
    const match = (text: string) => q === '' || text.toLowerCase().includes(q);
    const result: CommandItem[] = [];

    // Context-aware "create new" action for the current page.
    if (newAction && match(`new ${newAction.label}`)) {
      result.push({
        id: 'action-new',
        group: 'Actions',
        label: `New ${newAction.label}`,
        icon: Plus,
        run: () => {
          closePalette();
          newAction.run();
        },
      });
    }

    // Navigation entries (always available).
    for (const nav of NAV_ITEMS) {
      if (match(nav.label)) {
        result.push({
          id: `nav-${nav.to}`,
          group: 'Navigate',
          label: nav.label,
          icon: nav.icon,
          run: () => {
            closePalette();
            navigate(nav.to);
          },
        });
      }
    }

    // Data results only show once the user has typed something.
    if (q !== '') {
      for (const company of (companies.data ?? []).filter((c) => match(c.name)).slice(0, MAX_PER_GROUP)) {
        result.push({
          id: `company-${company.id}`,
          group: 'Companies',
          label: company.name,
          sublabel: company.contactName ?? undefined,
          icon: Building2,
          run: () => {
            closePalette();
            navigate(`${ROUTES.companies}/${company.id}`);
          },
        });
      }
      for (const session of (sessions.data ?? [])
        .filter((s) => match(s.title) || match(companiesById.get(s.companyId) ?? ''))
        .slice(0, MAX_PER_GROUP)) {
        result.push({
          id: `session-${session.id}`,
          group: 'Sessions',
          label: session.title,
          sublabel: companiesById.get(session.companyId) ?? undefined,
          icon: Briefcase,
          run: () => {
            closePalette();
            navigate(ROUTES.consulting);
          },
        });
      }
      for (const project of (projects.data ?? [])
        .filter((p) => match(p.name) || match(companiesById.get(p.companyId) ?? ''))
        .slice(0, MAX_PER_GROUP)) {
        result.push({
          id: `project-${project.id}`,
          group: 'Projects',
          label: project.name,
          sublabel: companiesById.get(project.companyId) ?? undefined,
          icon: Rocket,
          run: () => {
            closePalette();
            navigate(ROUTES.appdev);
          },
        });
      }
    }

    return result;
  }, [query, newAction, companies.data, sessions.data, projects.data, companiesById, navigate, closePalette]);

  // Keep the active index in range as the result list changes.
  useEffect(() => {
    setActive((current) => (current >= items.length ? 0 : current));
  }, [items.length]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((i) => (items.length === 0 ? 0 : (i + 1) % items.length));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => (items.length === 0 ? 0 : (i - 1 + items.length) % items.length));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      items[active]?.run();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      closePalette();
    }
  };

  // Render the grouped list while tracking each item's flat index for highlighting.
  let flatIndex = -1;
  const groupsInOrder = ['Actions', 'Navigate', 'Companies', 'Sessions', 'Projects'];

  return createPortal(
    <AnimatePresence>
      {paletteOpen && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
        >
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={closePalette} aria-hidden />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="relative w-full max-w-xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-center gap-3 border-b border-slate-200 px-4 dark:border-slate-800">
              <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search companies, sessions, projects…"
                aria-label="Search"
                className="h-12 w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-100"
              />
              <kbd className="hidden rounded border border-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 dark:border-slate-700 sm:inline">
                Esc
              </kbd>
            </div>

            <div className="max-h-[50vh] overflow-y-auto p-2">
              {items.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                  No results for “{query}”.
                </p>
              ) : (
                groupsInOrder.map((group) => {
                  const groupItems = items.filter((item) => item.group === group);
                  if (groupItems.length === 0) return null;
                  return (
                    <div key={group} className="mb-1">
                      <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        {group}
                      </p>
                      {groupItems.map((item) => {
                        flatIndex += 1;
                        const index = flatIndex;
                        const Icon = item.icon;
                        const isActive = index === active;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={item.run}
                            onMouseMove={() => setActive(index)}
                            className={cn(
                              'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                              isActive
                                ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200'
                                : 'text-slate-700 dark:text-slate-200'
                            )}
                          >
                            <Icon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                            <span className="min-w-0 flex-1 truncate">{item.label}</span>
                            {item.sublabel && (
                              <span className="truncate text-xs text-slate-400">{item.sublabel}</span>
                            )}
                            {isActive && (
                              <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
