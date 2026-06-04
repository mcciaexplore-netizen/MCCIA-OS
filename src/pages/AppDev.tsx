import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { LayoutGrid, List, Plus, Rocket, Search } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { SelectInput } from '@/components/form/fields';
import { KanbanBoard } from '@/components/appdev/KanbanBoard';
import { ProjectListView } from '@/components/appdev/ProjectListView';
import { ProjectDrawer } from '@/components/ProjectDrawer';
import { useRegisterNewAction } from '@/components/command/useAppCommand';
import { sheets } from '@/api/sheets';
import { queryKeys } from '@/api/queryKeys';
import { useAppProjects, useUpdateAppProject } from '@/hooks/useAppProjects';
import { useCompanies } from '@/hooks/useCompanies';
import { SHEET_NAMES } from '@/constants';
import type { AppProject, ProjectStage } from '@/types';
import { cn } from '@/utils/cn';

type ViewMode = 'board' | 'list';

export function AppDev() {
  const qc = useQueryClient();
  const projectsQuery = useAppProjects();
  const companiesQuery = useCompanies();
  const updateProject = useUpdateAppProject();

  const [view, setView] = useState<ViewMode>('board');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Drawer state (shared for add + edit).
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerProject, setDrawerProject] = useState<AppProject | undefined>(undefined);
  const [drawerStage, setDrawerStage] = useState<ProjectStage | undefined>(undefined);

  const isPending = projectsQuery.isPending || companiesQuery.isPending;
  const queries = [projectsQuery, companiesQuery];
  const firstError = queries.find((q) => q.isError)?.error;

  const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);
  const companies = useMemo(() => companiesQuery.data ?? [], [companiesQuery.data]);
  const companiesById = useMemo(() => new Map(companies.map((c) => [c.id, c])), [companies]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return projects.filter((project) => {
      if (companyFilter !== 'all' && project.companyId !== companyFilter) return false;
      if (query === '') return true;
      const company = companiesById.get(project.companyId)?.name ?? '';
      return (
        project.name.toLowerCase().includes(query) || company.toLowerCase().includes(query)
      );
    });
  }, [projects, companyFilter, search, companiesById]);

  // Optimistic stage move (drag-and-drop) — no success toast to avoid spam.
  const moveMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: ProjectStage }) =>
      sheets.update<AppProject>(SHEET_NAMES.appProjects, id, { stage }),
    onMutate: async ({ id, stage }) => {
      await qc.cancelQueries({ queryKey: queryKeys.appProjects.all });
      const previous = qc.getQueryData<AppProject[]>(queryKeys.appProjects.all);
      qc.setQueryData<AppProject[]>(queryKeys.appProjects.all, (old) =>
        old?.map((p) => (p.id === id ? { ...p, stage } : p))
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) qc.setQueryData(queryKeys.appProjects.all, context.previous);
      toast.error('Could not move project');
    },
    onSettled: () => qc.invalidateQueries({ queryKey: queryKeys.appProjects.all }),
  });

  const openAdd = (stage?: ProjectStage) => {
    setDrawerProject(undefined);
    setDrawerStage(stage);
    setDrawerOpen(true);
  };

  const openEdit = (project: AppProject) => {
    setDrawerProject(project);
    setDrawerStage(undefined);
    setDrawerOpen(true);
  };

  useRegisterNewAction('project', () => openAdd());

  const companyOptions = [
    { value: 'all', label: 'All companies' },
    ...companies.map((c) => ({ value: c.id, label: c.name })),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="App Development Pipeline"
        description="Track every client app from discovery to delivery."
        actions={
          <Button size="sm" onClick={() => openAdd()}>
            <Plus className="h-4 w-4" />
            Add project
          </Button>
        }
      />

      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="sm:w-52">
            <SelectInput
              aria-label="Filter by company"
              options={companyOptions}
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
            />
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects…"
              aria-label="Search projects"
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        {/* View toggle */}
        <div className="inline-flex shrink-0 rounded-lg border border-slate-300 p-0.5 dark:border-slate-700">
          <ToggleButton active={view === 'board'} onClick={() => setView('board')} icon={LayoutGrid} label="Board" />
          <ToggleButton active={view === 'list'} onClick={() => setView('list')} icon={List} label="List" />
        </div>
      </div>

      {/* Content */}
      {isPending ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : firstError ? (
        <ErrorState error={firstError} onRetry={() => queries.forEach((q) => q.refetch())} />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={Rocket}
          title="No projects yet"
          description="Add your first app project to start filling the pipeline."
          action={
            <Button onClick={() => openAdd()}>
              <Plus className="h-4 w-4" />
              Add project
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matches"
          description="No projects match your company or search filters."
        />
      ) : view === 'board' ? (
        <KanbanBoard
          projects={filtered}
          companiesById={companiesById}
          onMove={(id, stage) => moveMutation.mutate({ id, stage })}
          onOpenProject={openEdit}
          onAddInStage={openAdd}
        />
      ) : (
        <ProjectListView
          projects={filtered}
          companiesById={companiesById}
          onOpenProject={openEdit}
          onQuickEditNextAction={(id, value) =>
            updateProject.mutate({ id, fields: { nextAction: value.trim() || null } })
          }
        />
      )}

      <ProjectDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        project={drawerProject}
        defaultStage={drawerStage}
      />
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof LayoutGrid;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'bg-brand-600 text-white'
          : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100'
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
      {label}
    </button>
  );
}
