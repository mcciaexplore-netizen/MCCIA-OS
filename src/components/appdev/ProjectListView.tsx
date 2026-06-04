import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { StageBadge } from './StageBadge';
import { CompanyAvatar } from '@/components/companies/CompanyAvatar';
import { PROJECT_STAGE_VALUES } from '@/constants';
import type { AppProject, Company } from '@/types';
import { cn } from '@/utils/cn';
import { formatDate } from '@/utils/date';
import { DUE_TONE_CLASSES, getDueTone } from '@/utils/projectStage';

type SortKey = 'name' | 'company' | 'stage' | 'dueDate';
type SortDir = 'asc' | 'desc';

interface ProjectListViewProps {
  projects: AppProject[];
  companiesById: Map<string, Company>;
  onOpenProject: (project: AppProject) => void;
  onQuickEditNextAction: (id: string, value: string) => void;
}

export function ProjectListView({
  projects,
  companiesById,
  onOpenProject,
  onQuickEditNextAction,
}: ProjectListViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>('dueDate');
  const [dir, setDir] = useState<SortDir>('asc');

  const sorted = useMemo(() => {
    const nameOf = (project: AppProject) => companiesById.get(project.companyId)?.name ?? '';
    const compare = (a: AppProject, b: AppProject): number => {
      switch (sortKey) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'company':
          return nameOf(a).localeCompare(nameOf(b));
        case 'stage':
          return PROJECT_STAGE_VALUES.indexOf(a.stage) - PROJECT_STAGE_VALUES.indexOf(b.stage);
        case 'dueDate':
          return (a.targetLaunchDate ?? '').localeCompare(b.targetLaunchDate ?? '');
        default:
          return 0;
      }
    };
    const arr = [...projects].sort(compare);
    return dir === 'asc' ? arr : arr.reverse();
  }, [projects, sortKey, dir, companiesById]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setDir('asc');
    }
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
      <table className="w-full min-w-[820px] text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
            <SortHeader label="Project" active={sortKey === 'name'} dir={dir} onClick={() => toggleSort('name')} />
            <SortHeader label="Company" active={sortKey === 'company'} dir={dir} onClick={() => toggleSort('company')} />
            <SortHeader label="Stage" active={sortKey === 'stage'} dir={dir} onClick={() => toggleSort('stage')} />
            <SortHeader label="Due date" active={sortKey === 'dueDate'} dir={dir} onClick={() => toggleSort('dueDate')} />
            <th className="px-4 py-2.5 font-medium">Next action</th>
            <th className="px-4 py-2.5 font-medium">Blocker</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {sorted.map((project) => {
            const dueTone = getDueTone(project.targetLaunchDate);
            return (
              <tr key={project.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                <td className="px-4 py-2.5">
                  <button
                    type="button"
                    onClick={() => onOpenProject(project)}
                    className="text-left font-medium text-slate-900 hover:text-brand-600 dark:text-slate-100 dark:hover:text-brand-300"
                  >
                    {project.name}
                  </button>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <CompanyAvatar
                      name={companiesById.get(project.companyId)?.name}
                      seed={project.companyId}
                      size="sm"
                    />
                    <span className="truncate text-slate-600 dark:text-slate-300">
                      {companiesById.get(project.companyId)?.name ?? 'Unknown'}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <StageBadge stage={project.stage} />
                </td>
                <td className={cn('px-4 py-2.5 font-medium', DUE_TONE_CLASSES[dueTone])}>
                  {project.targetLaunchDate ? formatDate(project.targetLaunchDate) : '—'}
                </td>
                <td className="px-4 py-2.5">
                  <NextActionCell
                    value={project.nextAction ?? ''}
                    onSave={(value) => onQuickEditNextAction(project.id, value)}
                  />
                </td>
                <td className="px-4 py-2.5">
                  {project.blocker ? (
                    <span
                      className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400"
                      title={project.blocker}
                    >
                      <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                      <span className="max-w-[180px] truncate">{project.blocker}</span>
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  const Icon = !active ? ArrowUpDown : dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th className="px-4 py-2.5 font-medium">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'inline-flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200',
          active && 'text-slate-700 dark:text-slate-200'
        )}
      >
        {label}
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </button>
    </th>
  );
}

function NextActionCell({ value, onSave }: { value: string; onSave: (value: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  const commit = () => {
    setEditing(false);
    if (draft.trim() !== value.trim()) onSave(draft);
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') {
            setDraft(value);
            setEditing(false);
          }
        }}
        className="w-full min-w-[160px] rounded-md border border-brand-400 bg-white px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-brand-500 dark:bg-slate-900 dark:text-slate-100"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="w-full max-w-[220px] truncate text-left text-slate-600 hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-300"
    >
      {value || <span className="text-slate-400">Add…</span>}
    </button>
  );
}
